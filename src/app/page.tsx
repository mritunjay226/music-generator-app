"use client";

import { useState, useRef, useEffect } from "react";
import WaveSurfer from "wavesurfer.js";
import { Loader2, Play, Pause, DownloadCloud, Music } from "lucide-react";

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("[inst]");
  const [duration, setDuration] = useState("30");
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  // Initialize WaveSurfer when URL is available
  useEffect(() => {
    if (!audioUrl || !containerRef.current) return;

    wavesurfer.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#94a3b8", // subtle grayish
      progressColor: "#2563eb", // vibrant accent blue
      cursorColor: "#1d4ed8",
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 60,
      normalize: true,
      cursorWidth: 2,
    });

    wavesurfer.current.load(audioUrl);

    wavesurfer.current.on("ready", () => {
      // Automatically attempt to play on ready
    });

    wavesurfer.current.on("play", () => setIsPlaying(true));
    wavesurfer.current.on("pause", () => setIsPlaying(false));
    wavesurfer.current.on("finish", () => setIsPlaying(false));

    return () => {
      wavesurfer.current?.destroy();
    };
  }, [audioUrl]);

  const togglePlay = () => {
    wavesurfer.current?.playPause();
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null); // Reset

    try {
      const response = await fetch(
        "https://mishramritunjay45--ace-music-generator-api-api-endpoint.modal.run/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt,
            lyrics,
            duration: parseFloat(duration),
            format: "wav",
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate music.");
      }

      const data = await response.json();
      if (data.url) {
        setAudioUrl(data.url);
      } else {
        throw new Error("Invalid response format.");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 md:p-24 bg-gradient-subtle">
      <div className="w-full max-w-2xl">
        <header className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-2xl mb-4">
            <Music size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-neutral-900 mb-2">
            ACE Music Generator
          </h1>
          <p className="text-neutral-500 text-lg">
            Describe the sound, and let AI compose your masterpiece.
          </p>
        </header>

        <div className="glass-panel p-6 sm:p-10 mb-8">
          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label htmlFor="prompt" className="label-text">
                Musical Style & Description
              </label>
              <textarea
                id="prompt"
                required
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Cinematic epic orchestral battle music, high tension, brass and strings"
                className="input-field resize-y"
              />
            </div>

            <div>
              <label htmlFor="lyrics" className="label-text">
                Lyrics
              </label>
              <textarea
                id="lyrics"
                required
                rows={3}
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="[verse] Hello world&#10;[chorus] We are flying high"
                className="input-field resize-y"
              />
              <p className="text-xs text-neutral-400 mt-2">
                Use <code className="bg-gray-100 px-1 rounded text-gray-600">[inst]</code> for purely instrumental tracks.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label flex-1 htmlFor="duration" className="label-text">
                  Duration (secs)
                </label>
                <input
                  type="number"
                  id="duration"
                  min="5"
                  max="300"
                  required
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isGenerating || !prompt}
              className="btn-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Generating Masterpiece...
                </>
              ) : (
                "Generate Music"
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}
        </div>

        {/* Audio Visualizer Section */}
        {audioUrl && (
          <div className="glass-panel p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-lg font-semibold text-neutral-800 mb-6 flex items-center gap-2">
              Your Track is Ready
            </h3>

            <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 mb-6">
              <div ref={containerRef} className="w-full" />
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={togglePlay}
                className="flex items-center justify-center w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors shadow-sm"
              >
                {isPlaying ? <Pause size={20} className="fill-current" /> : <Play size={20} className="fill-current ml-1" />}
              </button>

              <a
                href={audioUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 rounded-lg text-sm font-medium transition-colors ml-auto shadow-sm"
              >
                <DownloadCloud size={16} />
                Download Original
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
