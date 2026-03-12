"use client";

import { Sparkles, Waves, Fingerprint, Repeat, Zap, Layers, ArrowUpRight, ArrowRight } from "lucide-react";

const features = [
    {
        icon: Sparkles,
        title: "Text to Harmony",
        description: "Translate abstract emotions, scenes, or precise technical descriptions directly into lush, structured audio arrangements in seconds.",
        colSpan: "lg:col-span-2",
        iconColor: "text-indigo-600 dark:text-indigo-400",
        iconBg: "bg-indigo-100 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20",
    },
    {
        icon: Fingerprint,
        title: "Unique Signatures",
        description: "Every generation is a completely unique synthesis. No pre-recorded loops. No recycled sample packs.",
        colSpan: "lg:col-span-1",
        iconColor: "text-emerald-600 dark:text-emerald-400",
        iconBg: "bg-emerald-100 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    },
];

export function LandingFeatures() {
    return (
        <section id="features" className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-32 pt-10">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

                .features-root {
                    font-family: 'DM Sans', sans-serif;
                }
                .serif {
                    font-family: 'DM Serif Display', serif;
                }

                /* Token overrides — keeps existing CSS vars */
                :root {
                    --feat-card-radius: 28px;
                    --feat-transition: 600ms cubic-bezier(0.22, 1, 0.36, 1);
                }

                /* ── Card base ── */
                .f-card {
                    position: relative;
                    overflow: hidden;
                    border-radius: var(--feat-card-radius);
                    transition: transform var(--feat-transition), box-shadow var(--feat-transition), border-color var(--feat-transition);
                    will-change: transform;
                }
                .f-card:hover {
                    transform: translateY(-3px);
                }

                /* ── Glow blobs ── */
                .blob {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(90px);
                    pointer-events: none;
                    transition: transform 1.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.8s ease;
                }
                .f-card:hover .blob { transform: scale(1.2); opacity: 1; }

                /* ── Number badges ── */
                .feat-num {
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.12em;
                    opacity: 0.3;
                    text-transform: uppercase;
                    font-family: 'DM Sans', monospace;
                }

                /* ── Rule line ── */
                .thin-rule {
                    height: 1px;
                    background: linear-gradient(90deg, transparent, var(--border, rgba(255,255,255,0.1)) 40%, transparent);
                }

                /* ── Waveform bars (decorative) ── */
                .waveform {
                    display: flex;
                    align-items: flex-end;
                    gap: 3px;
                    height: 36px;
                }
                .waveform span {
                    display: block;
                    width: 3px;
                    border-radius: 2px;
                    background: currentColor;
                    opacity: 0.4;
                    animation: wave var(--d, 1.2s) ease-in-out infinite alternate;
                    animation-delay: var(--delay, 0s);
                }
                @keyframes wave {
                    0%   { height: 4px; }
                    100% { height: var(--h, 20px); }
                }

                /* ── Progress bar (Studio Speed) ── */
                .speed-bar {
                    height: 2px;
                    border-radius: 2px;
                    background: linear-gradient(90deg, #f59e0b, #f97316);
                    transform-origin: left;
                    animation: grow 2s ease-in-out infinite alternate;
                }
                @keyframes grow {
                    0%   { transform: scaleX(0.08); }
                    100% { transform: scaleX(1); }
                }

                /* ── Arrow hover ── */
                .arrow-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    letter-spacing: 0.02em;
                    opacity: 0.45;
                    transition: opacity 0.3s, gap 0.3s;
                    cursor: pointer;
                }
                .f-card:hover .arrow-btn { opacity: 1; gap: 10px; }

                /* ── Iteration spinner ── */
                .spin-on-hover {
                    transition: transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                .f-card:hover .spin-on-hover { transform: rotate(180deg); }

                /* ── Library grid ── */
                .lib-dots {
                    display: grid;
                    grid-template-columns: repeat(6, 1fr);
                    gap: 6px;
                }
                .lib-dot {
                    aspect-ratio: 1;
                    border-radius: 6px;
                    background: var(--border, rgba(255,255,255,0.08));
                    transition: background 0.4s, transform 0.4s;
                    transition-delay: var(--dot-delay, 0s);
                }
                .f-card:hover .lib-dot { background: rgba(6,182,212,0.25); transform: scale(0.85); }

                /* ── Tag pill ── */
                .tag-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px 4px 8px;
                    border-radius: 999px;
                    border: 1px solid var(--border, rgba(255,255,255,0.1));
                    background: var(--surface-2, rgba(255,255,255,0.04));
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                }
                .pulse-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: #6366f1;
                    animation: pulse 2s ease-in-out infinite;
                }
                @keyframes pulse {
                    0%,100% { opacity: 1; transform: scale(1); }
                    50%     { opacity: 0.4; transform: scale(0.6); }
                }
            `}</style>

            <div className="features-root">

                {/* ── Header ── */}
                <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-20 gap-10">
                    <div className="max-w-xl">
                        <div className="tag-pill mb-8" style={{color: 'var(--fg-3, #888)'}}>
                            <span className="pulse-dot" />
                            Next-Gen Audio Engine
                        </div>
                        <h2 className="serif text-foreground" style={{fontSize: 'clamp(3rem,5.5vw,5rem)', lineHeight: '0.93', letterSpacing: '-0.02em', fontWeight: 400}}>
                            Shape sound.<br/>
                            <em style={{color: 'var(--fg-3, #888)', fontStyle: 'italic'}}>Break limits.</em>
                        </h2>
                    </div>

                    <div className="md:max-w-[340px]" style={{paddingBottom: '6px'}}>
                        <div className="thin-rule mb-6" />
                        <p style={{fontSize: '15px', lineHeight: '1.7', color: 'var(--fg-3, #888)', fontWeight: 400}}>
                            From raw thought to polished master track in seconds. Generative power with the precision of a professional studio — no synthesis knowledge required.
                        </p>
                    </div>
                </div>

                {/* ── Bento Grid ── */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px', gridAutoRows: 'minmax(160px, auto)'}}>

                    {/* ── Card 1: Text to Harmony (large) ── */}
                    <div
                        className="f-card"
                        style={{
                            gridColumn: 'span 12',
                            gridRow: 'span 1',
                            background: 'var(--surface, #0f0f0f)',
                            border: '1px solid var(--border, rgba(255,255,255,0.08))',
                            padding: 'clamp(32px, 5vw, 56px)',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '40px',
                            alignItems: 'end',
                            minHeight: '320px',
                        }}
                    >
                        <div className="blob" style={{width: 500, height: 500, background: 'rgba(99,102,241,0.12)', top: '-100px', right: '-100px', opacity: 0.7}} />

                        <div style={{position: 'relative', zIndex: 1}}>
                            <span className="feat-num" style={{color: 'var(--fg-3)'}}>01 — Text to Harmony</span>
                            <div style={{marginTop: '20px', marginBottom: '20px'}}>
                                <div style={{
                                    width: 48, height: 48, borderRadius: 14,
                                    background: 'rgba(99,102,241,0.12)',
                                    border: '1px solid rgba(99,102,241,0.25)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Sparkles size={22} color="#818cf8" />
                                </div>
                            </div>
                            <h3 className="serif" style={{fontSize: 'clamp(2rem,3.5vw,3.5rem)', lineHeight: '1.0', letterSpacing: '-0.02em', color: 'var(--foreground)', fontWeight: 400, marginBottom: 0}}>
                                Describe anything.<br/>Hear it instantly.
                            </h3>
                        </div>

                        <div style={{position: 'relative', zIndex: 1}}>
                            <p style={{fontSize: '16px', lineHeight: '1.75', color: 'var(--fg-3, #888)', maxWidth: '400px', marginBottom: '32px'}}>
                                Translate abstract emotions, vivid scenes, or precise technical descriptors directly into lush, structured arrangements. No synthesis knowledge required.
                            </p>

                            {/* Waveform decoration */}
                            <div className="waveform" style={{color: '#818cf8', marginBottom: '32px'}}>
                                {[14,28,20,36,12,32,18,26,10,34,22,16,30,8,24].map((h, i) => (
                                    <span key={i} style={{'--h': `${h}px`, '--delay': `${i * 0.07}s`, '--d': `${0.9 + (i % 3) * 0.2}s`} as React.CSSProperties} />
                                ))}
                            </div>

                            <div className="arrow-btn" style={{color: 'var(--foreground)'}}>
                                Explore the engine <ArrowRight size={14} />
                            </div>
                        </div>
                    </div>


                    {/* ── Card 2: Unique Signatures ── */}
                    <div
                        className="f-card"
                        style={{
                            gridColumn: 'span 12',
                            background: 'var(--surface-2, rgba(255,255,255,0.03))',
                            border: '1px solid var(--border, rgba(255,255,255,0.08))',
                            padding: '40px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '40px',
                            alignItems: 'center',
                        }}
                    >
                        <div className="blob" style={{width: 300, height: 300, background: 'rgba(16,185,129,0.08)', bottom: '-80px', left: '20%', opacity: 0.8}} />

                        <div style={{zIndex: 1, position: 'relative'}}>
                            <span className="feat-num" style={{color: 'var(--fg-3)'}}>02</span>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12, marginTop: 16, marginBottom: 20,
                                background: 'rgba(16,185,129,0.1)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Fingerprint size={20} color="#34d399" />
                            </div>
                            <h3 className="serif" style={{fontSize: 'clamp(1.6rem,2.5vw,2.4rem)', lineHeight: '1.05', letterSpacing: '-0.02em', color: 'var(--foreground)', fontWeight: 400}}>
                                Unique Signatures
                            </h3>
                        </div>

                        <div style={{zIndex: 1, position: 'relative'}}>
                            <p style={{fontSize: '15px', lineHeight: '1.75', color: 'var(--fg-3, #888)'}}>
                                Every generation is a completely unique synthesis — no pre-recorded loops, no recycled sample packs. Pure, unrepeatable originality baked into every render.
                            </p>
                            <div className="thin-rule" style={{marginTop: 24, marginBottom: 20}} />
                            <div className="arrow-btn" style={{color: 'var(--foreground)'}}>
                                Learn more <ArrowRight size={13} />
                            </div>
                        </div>

                        {/* Fingerprint circles decoration */}
                        <div style={{zIndex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {[1,2,3,4,5].map(i => (
                                <div key={i} style={{
                                    position: 'absolute',
                                    width: i * 44 + 'px', height: i * 44 + 'px',
                                    borderRadius: '50%',
                                    border: `1px solid rgba(52,211,153,${0.18 - i * 0.03})`,
                                    animation: `pulse ${1.5 + i * 0.4}s ease-in-out ${i * 0.2}s infinite alternate`
                                }} />
                            ))}
                            <Fingerprint size={28} color="#34d399" style={{opacity: 0.7, position: 'relative', zIndex: 1}} />
                        </div>
                    </div>


                    {/* ── Row 3: Studio Speed + Iteration (side by side) ── */}
                    <div
                        className="f-card"
                        style={{
                            gridColumn: 'span 12',
                            background: '#0a0a0a',
                            border: '1px solid rgba(255,255,255,0.06)',
                            padding: '40px 48px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '48px',
                            alignItems: 'center',
                        }}
                    >
                        <div className="blob" style={{width: 400, height: 400, background: 'rgba(251,146,60,0.08)', top: '-100px', right: '10%', opacity: 0.8}} />

                        {/* Speed */}
                        <div style={{zIndex: 1, position: 'relative', borderRight: '1px solid rgba(255,255,255,0.07)', paddingRight: 48}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20}}>
                                <Zap size={16} color="#fbbf24" />
                                <span style={{fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fbbf24'}}>Studio Speed</span>
                            </div>
                            <h3 className="serif" style={{fontSize: 'clamp(1.8rem,2.8vw,2.6rem)', lineHeight: '1.0', letterSpacing: '-0.02em', color: '#fff', fontWeight: 400, marginBottom: 16}}>
                                Zero render time.
                            </h3>
                            <p style={{fontSize: '14.5px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7', marginBottom: 28}}>
                                High-fidelity tracks composed, mixed, and delivered nearly instantaneously via parallel GPU compute clusters.
                            </p>
                            <div style={{background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden', height: 2}}>
                                <div className="speed-bar" />
                            </div>
                            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: 8}}>
                                <span style={{fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500}}>Generating…</span>
                                <span style={{fontSize: 11, color: '#fbbf24', fontWeight: 600}}>~1.2s</span>
                            </div>
                        </div>

                        {/* Iteration */}
                        <div style={{zIndex: 1, position: 'relative'}}>
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
                                <span className="feat-num" style={{color: 'rgba(255,255,255,0.3)'}}>04 — Iteration</span>
                                <Repeat size={18} color="rgba(167,139,250,0.7)" className="spin-on-hover" />
                            </div>
                            <h3 className="serif" style={{fontSize: 'clamp(1.8rem,2.8vw,2.6rem)', lineHeight: '1.0', letterSpacing: '-0.02em', color: '#fff', fontWeight: 400, marginBottom: 16}}>
                                Infinite<br/>
                                <em style={{color: 'rgba(255,255,255,0.35)', fontStyle: 'italic'}}>Iteration.</em>
                            </h3>
                            <p style={{fontSize: '14.5px', color: 'rgba(255,255,255,0.5)', lineHeight: '1.7', marginBottom: 28}}>
                                Tweak your prompt, regenerate instantly. Frictionless sonic exploration from first idea to final version.
                            </p>
                            <div style={{display: 'flex', gap: 8}}>
                                {['Ambient', 'Jazz Fusion', 'Neo-Soul', 'Orchestral'].map((tag, i) => (
                                    <div key={tag} style={{
                                        padding: '5px 10px',
                                        borderRadius: 999,
                                        border: '1px solid rgba(167,139,250,0.2)',
                                        background: 'rgba(167,139,250,0.06)',
                                        fontSize: 11,
                                        color: 'rgba(167,139,250,0.8)',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap',
                                        transition: `background 0.3s ${i * 0.05}s, border-color 0.3s`,
                                        cursor: 'default',
                                    }}>
                                        {tag}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                    {/* ── Row 4: Vocal & Library (60/40) ── */}

                    {/* Vocal & Instrumental */}
                    <div
                        className="f-card"
                        style={{
                            gridColumn: 'span 12',
                            background: 'var(--surface, #0f0f0f)',
                            border: '1px solid var(--border, rgba(255,255,255,0.08))',
                            padding: '40px',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '40px',
                            alignItems: 'center',
                        }}
                    >
                        <div className="blob" style={{width: 300, height: 300, background: 'rgba(139,92,246,0.1)', top: '-50px', left: '-50px', opacity: 0.8}} />

                        <div style={{zIndex: 1, position: 'relative'}}>
                            <span className="feat-num" style={{color: 'var(--fg-3)'}}>05 — Audio</span>
                            <div style={{
                                width: 44, height: 44, borderRadius: 12, marginTop: 16, marginBottom: 20,
                                background: 'rgba(139,92,246,0.1)',
                                border: '1px solid rgba(139,92,246,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Waves size={20} color="#a78bfa" />
                            </div>
                            <h3 className="serif" style={{fontSize: 'clamp(1.6rem,2.2vw,2.2rem)', lineHeight: '1.05', letterSpacing: '-0.02em', color: 'var(--foreground)', fontWeight: 400}}>
                                Vocal &<br/>Instrumental
                            </h3>
                        </div>

                        <div style={{zIndex: 1, position: 'relative'}}>
                            <p style={{fontSize: '15px', lineHeight: '1.75', color: 'var(--fg-3, #888)', marginBottom: 24}}>
                                Command specific vocal performances with structured lyrics, or request pure instrumental scores with a single tag.
                            </p>
                            <div style={{display: 'flex', gap: 12}}>
                                <div style={{
                                    flex: 1, padding: '12px 16px',
                                    borderRadius: 14,
                                    border: '1px solid rgba(139,92,246,0.2)',
                                    background: 'rgba(139,92,246,0.06)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.7)', marginBottom: 4}}>Vocal</div>
                                    <div style={{fontSize: 13, color: 'var(--fg-3)', fontWeight: 400}}>Lyrics + performance</div>
                                </div>
                                <div style={{
                                    flex: 1, padding: '12px 16px',
                                    borderRadius: 14,
                                    border: '1px solid var(--border, rgba(255,255,255,0.08))',
                                    background: 'var(--surface-2)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--fg-4, #555)', marginBottom: 4}}>Instrumental</div>
                                    <div style={{fontSize: 13, color: 'var(--fg-3)', fontWeight: 400}}>Pure composition</div>
                                </div>
                            </div>
                        </div>

                        {/* Library Sync */}
                        <div style={{zIndex: 1, position: 'relative'}}>
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
                                <span className="feat-num" style={{color: 'var(--fg-3)'}}>06 — Library</span>
                                <Layers size={16} color="rgba(6,182,212,0.6)" />
                            </div>
                            <h3 className="serif" style={{fontSize: '1.5rem', lineHeight: '1.1', letterSpacing: '-0.015em', color: 'var(--foreground)', fontWeight: 400, marginBottom: 12}}>
                                Library Sync
                            </h3>
                            <p style={{fontSize: '14px', lineHeight: '1.7', color: 'var(--fg-3, #888)', marginBottom: 24}}>
                                Your entire creative history perpetually synced to the cloud. Access generated stems from anywhere.
                            </p>
                            <div className="lib-dots">
                                {Array.from({length: 24}).map((_, i) => (
                                    <div
                                        key={i}
                                        className="lib-dot"
                                        style={{'--dot-delay': `${i * 0.025}s`} as React.CSSProperties}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>

                {/* ── Footer note ── */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, paddingTop: 32, borderTop: '1px solid var(--border, rgba(255,255,255,0.07))'}}>
                    <p style={{fontSize: 13, color: 'var(--fg-4, #444)', fontWeight: 400}}>
                        All capabilities included in every plan. No feature paywalls.
                    </p>
                    <div className="arrow-btn" style={{color: 'var(--fg-3)', fontSize: 13}}>
                        View full capability list <ArrowUpRight size={12} />
                    </div>
                </div>

            </div>
        </section>
    );
}