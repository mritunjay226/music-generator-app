// app/api/generate/route.ts
import { auth } from "@clerk/nextjs/server";
import { inngest } from "../../../inngest/client";

export async function POST(req: Request) {
    try {
        // Secure the endpoint with Clerk
        const { userId } = await auth();

        if (!userId) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" }
            });
        }

        const body = await req.json();
        const { prompt, lyrics, duration, trackId } = body;

        // Dispatch background job via Inngest
        await inngest.send({
            name: "app/music.generate",
            data: {
                trackId,
                prompt,
                lyrics,
                duration,
            },
        });

        // Return immediately so the UI doesn't hang waiting for Modal
        return new Response(JSON.stringify({ success: true, message: "Generation started in background" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error: any) {
        console.error("API Route Error:", error);
        return new Response(JSON.stringify({ error: error.message || "Something went wrong" }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
