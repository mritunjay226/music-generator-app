import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

export function LandingPricing() {
    const pricingPlans = [
        {
            name: "Free",
            price: "$0",
            period: "/mo",
            description: "Perfect for exploring the platform.",
            cta: "Get started",
            features: [
                "10 tracks per month",
                "Up to 2 min tracks",
                "Standard quality audio",
                "API access (10 req/day)",
                "Cloud library",
            ],
            highlight: false,
        },
        {
            name: "Pro",
            price: "$19",
            period: "/mo",
            description: "For serious creators and developers.",
            cta: "Start Pro",
            features: [
                "500 tracks per month",
                "Up to 5 min tracks",
                "High-fidelity audio",
                "Unlimited API access",
                "Priority generation queue",
                "Commercial license",
            ],
            highlight: true,
        },
    ];

    return (
        <section id="pricing" className="w-full max-w-6xl mx-auto px-6 lg:px-16 pb-28">
            <div className="text-center mb-14">
                <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[var(--fg-4)] mb-4">
                    Pricing
                </p>
                <h2
                    className="text-[clamp(2rem,4.5vw,3.2rem)] font-light leading-[1.1] tracking-[-0.025em] text-foreground"
                    style={{ fontFamily: "var(--font-serif)" }}
                >
                    Simple, transparent pricing.
                </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
                {pricingPlans.map((plan) => (
                    <div
                        key={plan.name}
                        className={`rounded-2xl p-8  transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:shadow-[0_12px_40px_rgba(17,17,16,0.08)] bg-[var(--surface)]  shadow-[var(--shadow-sm)] ${plan.highlight ? "border-aura" : "border-[var(--border)] border"}`}
                    >
                        <div className="mb-6">
                            <p className={`text-[11.5px] font-semibold uppercase tracking-widest mb-2 text-[var(--fg-4)]`}>
                                {plan.name}
                            </p>
                            <div className="flex items-end gap-1 mb-1">
                                <span
                                    className={`text-5xl font-light leading-none tracking-tight text-foreground`}
                                    style={{ fontFamily: "var(--font-serif)" }}
                                >
                                    {plan.price}
                                </span>
                                <span className={`text-sm mb-2 text-[var(--fg-4)]`}>
                                    {plan.period}
                                </span>
                            </div>
                            <p className={`text-[13px] text-[var(--fg-3)]`}>
                                {plan.description}
                            </p>
                        </div>

                        <ul className="space-y-3 mb-8">
                            {plan.features.map((f) => (
                                <li key={f} className="flex items-center gap-2.5 text-[13.5px]">
                                    <CheckCircle2 size={14} className={plan.highlight ? "text-blue-400" : "text-[var(--accent-blue)]"} />
                                    <span className={plan.highlight ? "text-neutral-200 dark:text-neutral-700" : "text-[var(--fg-2)]"}>{f}</span>
                                </li>
                            ))}
                        </ul>

                        <Link href="/dashboard">
                            <button
                                className={`w-full h-11 text-[13.5px] font-semibold rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${plan.highlight
                                    ? "bg-white dark:bg-[#18181b] text-foreground dark:text-white hover:bg-neutral-100 dark:hover:bg-[#27272a]"
                                    : "bg-foreground dark:bg-white text-white dark:text-black hover:bg-neutral-800 dark:hover:bg-[#e4e4e7]"
                                    }`}
                            >
                                {plan.cta}
                                <ArrowRight size={14} />
                            </button>
                        </Link>
                    </div>
                ))}
            </div>
        </section>
    );
}
