// inngest/functions.ts — full replacement
import { inngest } from "./client";

// ─── Thumbnail prompt builder ─────────────────────────────────────────────────
function buildImagePrompt(musicPrompt: string): string {
    return `Album cover art for a song described as: "${musicPrompt}". Cinematic, high quality digital artwork. Vivid colors, artistic, no text, no letters, no words. Style: modern music album cover, atmospheric, detailed illustration.`.trim();
}

// ─── Upload image bytes to Cloudinary (signed, server-side) ──────────────────
async function uploadImageToCloudinary(
    imageBuffer: ArrayBuffer,
    publicId: string
): Promise<string> {
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME ?? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)!;
    const apiKey    = process.env.CLOUDINARY_API_KEY!;
    const apiSecret = process.env.CLOUDINARY_API_SECRET!;

    const timestamp = Math.floor(Date.now() / 1000).toString();

    // Cloudinary signature:
    // 1. All upload params (NOT file/api_key/resource_type/signature), sorted alphabetically
    // 2. Joined as key=value&key=value
    // 3. API secret appended DIRECTLY — no & before it
    // 4. SHA-1 of the whole string (not HMAC)
    const params: Record<string, string> = {
        folder:    "ace_step_v15_thumbnails",
        public_id: publicId,
        timestamp,
    };

    const sortedParamString = Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join("&");

    // e.g. "folder=ace_step_v15_thumbnails&public_id=thumb_xxx&timestamp=1234567890<SECRET>"
    const strToSign = `${sortedParamString}${apiSecret}`;

    const hashBuf   = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(strToSign));
    const signature = Array.from(new Uint8Array(hashBuf))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    const formData = new FormData();
    formData.append("file",      new Blob([imageBuffer], { type: "image/jpeg" }));
    formData.append("api_key",   apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder",    "ace_step_v15_thumbnails");
    formData.append("public_id", publicId);

    const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData }
    );

    if (!res.ok) throw new Error(`Cloudinary image upload failed: ${await res.text()}`);
    return (await res.json()).secure_url as string;
}

// ─── generateMusic ────────────────────────────────────────────────────────────

export const generateMusic = inngest.createFunction(
    {
        id: "generate-music",
        retries: 3,
    },
    { event: "app/music.generate" },
    async ({ event, step }) => {
        const { prompt, lyrics, duration, trackId } = event.data;

        // Step 1: Generate music via Modal
        const cloudUrl = await step.run("request-modal-generation", async () => {
            const response = await fetch(
                "https://mritunjaymishra9809--ace-step-v15-music-api-api.modal.run/generate",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(300_000),
                    body: JSON.stringify({
                        prompt,
                        lyrics:        lyrics   ?? "[inst]",
                        duration:      duration ?? 30.0,
                        output_format: "mp3",
                        infer_step:    12,
                    }),
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Modal generation failed: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            if (!data.url) throw new Error("Modal returned no URL");
            return data.url as string;
        });

        // Step 2: Save audio URL to Convex
        await step.run("save-to-convex", async () => {
            const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(".cloud", ".site");
            const response = await fetch(`${CONVEX_SITE_URL}/inngest_save_track`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.INNGEST_WEBHOOK_SECRET}`,
                },
                body: JSON.stringify({ trackId, url: cloudUrl }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Convex save failed: ${response.status} - ${errorText}`);
            }
            return await response.json();
        });

        // Step 3: Generate thumbnail via Pollinations Flux + save to Convex
        // Non-fatal — thumbnail failure never fails the track
        await step.run("generate-thumbnail", async () => {
            try {
                const pollinationsKey = process.env.POLLINATIONS_API_KEY;

                if (!pollinationsKey) {
                    console.error("[thumbnail] POLLINATIONS_API_KEY missing from env");
                    return { skipped: true, reason: "missing POLLINATIONS_API_KEY" };
                }

                const imagePrompt    = buildImagePrompt(prompt);
                const encodedPrompt  = encodeURIComponent(imagePrompt);
                const pollinationsUrl = `https://gen.pollinations.ai/image/${encodedPrompt}?model=flux&width=512&height=512&nologo=true&private=true`;

                console.log("[thumbnail] calling pollinations...");
                const imgResponse = await fetch(pollinationsUrl, {
                    headers: { "Authorization": `Bearer ${pollinationsKey}` },
                    signal: AbortSignal.timeout(60_000),
                });

                console.log("[thumbnail] status:", imgResponse.status, "content-type:", imgResponse.headers.get("content-type"));

                if (!imgResponse.ok) {
                    const errText = await imgResponse.text();
                    console.error("[thumbnail] pollinations error:", errText.slice(0, 300));
                    return { skipped: true, reason: `pollinations ${imgResponse.status}: ${errText.slice(0, 200)}` };
                }

                const imageBuffer = await imgResponse.arrayBuffer();
                console.log("[thumbnail] bytes received:", imageBuffer.byteLength);

                if (imageBuffer.byteLength < 1000) {
                    return { skipped: true, reason: "image response too small — likely an error page" };
                }

                const publicId     = `thumb_${trackId}_${Date.now()}`;
                const thumbnailUrl = await uploadImageToCloudinary(imageBuffer, publicId);
                console.log("[thumbnail] uploaded to cloudinary:", thumbnailUrl);

                const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(".cloud", ".site");
                const saveResponse = await fetch(`${CONVEX_SITE_URL}/inngest_save_thumbnail`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.INNGEST_WEBHOOK_SECRET}`,
                    },
                    body: JSON.stringify({ trackId, thumbnailUrl }),
                });

                if (!saveResponse.ok) {
                    const errText = await saveResponse.text();
                    console.error("[thumbnail] convex save error:", errText);
                    return { skipped: true, reason: `convex save failed: ${errText.slice(0, 200)}` };
                }

                console.log("[thumbnail] saved successfully");
                return { thumbnailUrl };

            } catch (err: any) {
                console.error("[thumbnail] caught error:", err?.message ?? err);
                return { skipped: true, reason: err?.message ?? String(err) };
            }
        });

        return { success: true, url: cloudUrl };
    }
);

// ─── repaintMusic ─────────────────────────────────────────────────────────────

export const repaintMusic = inngest.createFunction(
    {
        id: "repaint-music",
        retries: 2,
    },
    { event: "app/music.repaint" },
    async ({ event, step }) => {
        const {
            trackId,
            srcAudioUrl,
            prompt,
            lyrics,
            repaintingStart,
            repaintingEnd,
            taskType,
            referenceAudioUrl,
            audioCoverStrength,
            coverNoiseStrength,
            inferStep,
            guidanceScale,
            seed,
            bpm,
            key,
            language,
            inferMethod,
            cfgIntervalStart,
            cfgIntervalEnd,
            shift,
            useAdg,
            outputFormat,
        } = event.data;

        // Step 1: Call Modal /repaint
        const result = await step.run("request-modal-repaint", async () => {
            const response = await fetch(
                // "https://mishramritunjay45--ace-step-v15-music-api-api.modal.run/repaint",
                "https://mritunjaymishra9809--ace-step-v15-music-api-api.modal.run/repaint",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    signal: AbortSignal.timeout(300_000),
                    body: JSON.stringify({
                        src_audio_url:        srcAudioUrl,
                        prompt,
                        lyrics:               lyrics            ?? "[inst]",
                        repainting_start:     repaintingStart   ?? 0.0,
                        repainting_end:       repaintingEnd     ?? null,
                        task_type:            taskType          ?? "repaint",
                        reference_audio_url:  referenceAudioUrl ?? null,
                        audio_cover_strength: audioCoverStrength ?? 1.0,
                        cover_noise_strength: coverNoiseStrength ?? 0.0,
                        infer_step:           inferStep         ?? 8,
                        guidance_scale:       guidanceScale     ?? 15.0,
                        seed:                 seed              ?? -1,
                        bpm:                  bpm               ?? "",
                        key:                  key               ?? "",
                        language:             language          ?? "en",
                        infer_method:         inferMethod       ?? "ode",
                        cfg_interval_start:   cfgIntervalStart  ?? 0.0,
                        cfg_interval_end:     cfgIntervalEnd    ?? 1.0,
                        shift:                shift             ?? 1.0,
                        use_adg:              useAdg            ?? false,
                        output_format:        outputFormat      ?? "mp3",
                    }),
                }
            );
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Modal repaint failed: ${response.status} - ${errorText}`);
            }
            const data = await response.json();
            if (!data.url) throw new Error("Modal returned no URL");
            return {
                url:             data.url              as string,
                duration:        data.duration         as number,
                seed:            data.seed             as number,
                repaintingStart: data.repainting_start as number,
                repaintingEnd:   data.repainting_end   as number,
                taskType:        data.task_type        as string,
            };
        });

        // Step 2: Save to Convex
        await step.run("save-repaint-to-convex", async () => {
            const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_URL!.replace(".cloud", ".site");
            const response = await fetch(`${CONVEX_SITE_URL}/inngest_save_repaint`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.INNGEST_WEBHOOK_SECRET}`,
                },
                body: JSON.stringify({
                    trackId,
                    url:             result.url,
                    duration:        result.duration,
                    seed:            result.seed,
                    repaintingStart: result.repaintingStart,
                    repaintingEnd:   result.repaintingEnd,
                    taskType:        result.taskType,
                }),
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Convex save failed: ${response.status} - ${errorText}`);
            }
            return await response.json();
        });

        return { success: true, url: result.url };
    }
);