export function LandingHowItWorks() {
    const steps = [
        {
            num: "01",
            title: "Describe your sound",
            body: "Type a natural language prompt — genre, mood, instruments, tempo. As specific or as abstract as you like.",
        },
        {
            num: "02",
            title: "Add lyrics or keep it instrumental",
            body: "Paste your own lyrics with section tags like [verse] / [chorus], or use [inst] for a pure instrumental piece.",
        },
        {
            num: "03",
            title: "Set the duration",
            body: "Drag the slider from 15 seconds to 4 minutes. The model fills it with coherent musical structure.",
        },
        {
            num: "04",
            title: "Stream it instantly",
            body: "Your track is generated in the background and appears in your library within seconds, ready to play or download.",
        },
    ];

    return (
        <section className="w-full max-w-6xl mx-auto px-6 lg:px-16 pb-28">
            <div className="text-center mb-14">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-4)] mb-4">
                    How it works
                </p>
                <h2
                    className="text-[clamp(2rem,4.5vw,3.2rem)] font-light leading-[1.1] tracking-[-0.025em] text-foreground"
                    style={{ fontFamily: "var(--font-serif)" }}
                >
                    From idea to audio in four steps.
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--border)] rounded-2xl overflow-hidden border border-[var(--border)] max-w-5xl mx-auto shadow-sm">
                {steps.map((step, i) => (
                    <div
                        key={step.num}
                        className={`bg-[var(--surface)] p-10 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(17,17,16,0.06)] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] relative z-10 hover:z-20 ${i === 0 ? "rounded-tl-2xl" : ""} ${i === 1 ? "rounded-tr-2xl" : ""} ${i === 2 ? "rounded-bl-2xl" : ""} ${i === 3 ? "rounded-br-2xl" : ""}`}
                    >
                        <span
                            className="text-[11px] font-bold tracking-widest text-[var(--accent-blue)] block mb-5"
                        >
                            {step.num}
                        </span>
                        <h3 className="text-[18px] font-semibold text-foreground mb-3 tracking-tight">
                            {step.title}
                        </h3>
                        <p className="text-[14.5px] text-[var(--fg-3)] leading-[1.65]">
                            {step.body}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
