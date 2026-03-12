"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
    CreditCard, Zap, BarChart3, TrendingUp, Music,
    Clock, ArrowUpRight, Loader2, CheckCircle2, Sparkles
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(ts: number): string {
    return new Intl.DateTimeFormat("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit",
    }).format(new Date(ts));
}

function actionLabel(action: string): string {
    const map: Record<string, string> = {
        generate_track: "Track Generated",
        api_validate: "API Validation",
        api_generate: "API Track Generate",
    };
    return map[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function actionIcon(action: string) {
    if (action === "generate_track" || action === "api_generate")
        return <Music size={13} className="text-blue-500" />;
    return <Zap size={13} className="text-amber-500" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan Card
// ─────────────────────────────────────────────────────────────────────────────

const FREE_LIMITS = { tracks: 10, credits: 50 };
const PRO_LIMITS = { tracks: 500, credits: 2500 };

function PlanCard({ subscription }: { subscription: any }) {
    const isPro = subscription?.tier === "pro" && subscription?.status === "active";

    const freeFeatures = [
        "10 tracks per month",
        "Up to 2-minute tracks",
        "Standard quality audio",
        "API access (10 req/day)",
    ];

    const proFeatures = [
        "500 tracks per month",
        "Up to 5-minute tracks",
        "High-fidelity audio",
        "API access (unlimited)",
        "Priority generation queue",
        "Commercial license",
    ];

    return (
        <div className="grid md:grid-cols-2 gap-4">
            {/* Free tier */}
            <div className={`glass-panel p-6 relative ${!isPro ? "ring-2 ring-neutral-900 ring-offset-2" : "opacity-70"}`}>
                {!isPro && (
                    <div className="absolute top-4 right-4">
                        <span className="bg-neutral-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Current Plan
                        </span>
                    </div>
                )}
                <div className="mb-4">
                    <h3 className="font-bold text-neutral-900 text-lg">Free</h3>
                    <div className="flex items-end gap-1 mt-1">
                        <span className="text-3xl font-bold text-neutral-900">$0</span>
                        <span className="text-neutral-400 text-sm mb-1">/mo</span>
                    </div>
                </div>
                <ul className="space-y-2.5 mb-5">
                    {freeFeatures.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-600">
                            <CheckCircle2 size={14} className="text-neutral-400 shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>
                {!isPro && (
                    <div className="py-2 px-4 bg-neutral-100 rounded-xl text-center text-xs font-semibold text-neutral-500">
                        Your current plan
                    </div>
                )}
            </div>

            {/* Pro tier */}
            <div className={`relative glass-panel p-6 overflow-hidden ${isPro ? "ring-2 ring-blue-600 ring-offset-2" : ""}`}>
                <div className="absolute inset-0 bg-linear-to-br from-blue-50/80 to-purple-50/40 pointer-events-none" />
                {isPro && (
                    <div className="absolute top-4 right-4">
                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                            Current Plan
                        </span>
                    </div>
                )}
                <div className="relative">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-neutral-900 text-lg">Pro</h3>
                        <Sparkles size={14} className="text-blue-500" />
                    </div>
                    <div className="flex items-end gap-1 mt-1">
                        <span className="text-3xl font-bold text-neutral-900">$19</span>
                        <span className="text-neutral-400 text-sm mb-1">/mo</span>
                    </div>
                </div>
                <ul className="relative space-y-2.5 my-5">
                    {proFeatures.map((f) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-neutral-600">
                            <CheckCircle2 size={14} className="text-blue-500 shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>
                {!isPro ? (
                    <button className="relative w-full py-2.5 px-4 bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl text-sm font-semibold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md shadow-blue-200 flex items-center justify-center gap-2">
                        <Zap size={15} />
                        Upgrade to Pro
                        <ArrowUpRight size={14} />
                    </button>
                ) : (
                    <div className="relative py-2 px-4 bg-blue-100 rounded-xl text-center text-xs font-semibold text-blue-700">
                        Your current plan
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage meter
// ─────────────────────────────────────────────────────────────────────────────

function UsageMeter({ label, used, limit, color }: {
    label: string; used: number; limit: number; color: string;
}) {
    const pct = Math.min((used / limit) * 100, 100);
    const isHigh = pct > 80;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-600">{label}</span>
                <span className="text-sm font-semibold text-neutral-900">
                    {used}
                    <span className="text-neutral-400 font-normal"> / {limit === Infinity ? "∞" : limit}</span>
                </span>
            </div>
            <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                        width: `${pct}%`,
                        background: isHigh
                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                            : `linear-gradient(90deg, ${color}cc, ${color})`,
                    }}
                />
            </div>
            {isHigh && (
                <p className="text-xs text-amber-600 font-medium">
                    You're approaching your monthly limit.
                </p>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Usage log row
// ─────────────────────────────────────────────────────────────────────────────

function UsageRow({ log }: { log: any }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-neutral-50 last:border-0 group hover:bg-neutral-50 -mx-1 px-1 rounded-lg transition-colors">
            <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-neutral-100 flex items-center justify-center">
                    {actionIcon(log.action)}
                </div>
                <div>
                    <p className="text-sm font-medium text-neutral-800">{actionLabel(log.action)}</p>
                    <p className="text-xs text-neutral-400">{formatDate(log.timestamp)}</p>
                </div>
            </div>
            <div className="text-right">
                <span className="text-sm font-semibold text-neutral-700">
                    {log.creditsUsed > 0 ? `-${log.creditsUsed}` : "Free"}
                </span>
                <p className="text-[10px] text-neutral-400">{log.creditsUsed > 0 ? "credits" : ""}</p>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function BillingPage() {
    const subscription = useQuery(api.apiKeys.getSubscription);
    const usage = useQuery(api.apiKeys.getMonthlyUsage);
    const logs = useQuery(api.apiKeys.getUsageLogs, { limit: 10 });

    const isPro = subscription?.tier === "pro" && subscription?.status === "active";
    const limits = isPro ? PRO_LIMITS : FREE_LIMITS;

    const now = new Date();
    const monthName = now.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    return (
        <div className="w-full flex flex-col gap-8 pb-10 animate-fade-up">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">Billing & Usage</h1>
                <p className="text-neutral-500 text-sm">
                    Manage your subscription and monitor your API usage for {monthName}.
                </p>
            </div>

            {/* Usage stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    {
                        label: "Tracks This Month",
                        value: usage?.tracksGenerated ?? 0,
                        icon: <Music size={16} className="text-blue-500" />,
                        bg: "bg-blue-50",
                    },
                    {
                        label: "Credits Used",
                        value: usage?.creditsUsed ?? 0,
                        icon: <Zap size={16} className="text-amber-500" />,
                        bg: "bg-amber-50",
                    },
                    {
                        label: "Current Plan",
                        value: isPro ? "Pro" : "Free",
                        icon: <CreditCard size={16} className="text-purple-500" />,
                        bg: "bg-purple-50",
                    },
                    {
                        label: "Remaining Tracks",
                        value: Math.max(0, limits.tracks - (usage?.tracksGenerated ?? 0)),
                        icon: <TrendingUp size={16} className="text-green-500" />,
                        bg: "bg-green-50",
                    },
                ].map((stat) => (
                    <div key={stat.label} className="glass-panel p-5">
                        <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                            {stat.icon}
                        </div>
                        <p className="text-2xl font-bold text-neutral-900">{stat.value}</p>
                        <p className="text-xs text-neutral-400 mt-1">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Monthly usage meters */}
            {usage !== undefined && (
                <div className="glass-panel p-6 space-y-5">
                    <div className="flex items-center gap-2 mb-1">
                        <BarChart3 size={16} className="text-neutral-500" />
                        <h2 className="font-semibold text-neutral-900">Monthly Limits</h2>
                        <span className="text-xs text-neutral-400 ml-auto">{monthName}</span>
                    </div>
                    <UsageMeter
                        label="Tracks Generated"
                        used={usage.tracksGenerated}
                        limit={limits.tracks}
                        color="#2563eb"
                    />
                    <UsageMeter
                        label="Credits Consumed"
                        used={usage.creditsUsed}
                        limit={limits.credits}
                        color="#7c3aed"
                    />
                </div>
            )}

            {/* Plan comparison */}
            <div className="space-y-4">
                <h2 className="font-semibold text-neutral-900">Your Plan</h2>
                {subscription === undefined ? (
                    <div className="flex items-center gap-3 p-6 glass-panel text-neutral-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Loading plan…</span>
                    </div>
                ) : (
                    <PlanCard subscription={subscription} />
                )}
            </div>

            {/* Usage history */}
            <div className="glass-panel p-6 space-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Clock size={16} className="text-neutral-500" />
                        <h2 className="font-semibold text-neutral-900">Recent Usage</h2>
                    </div>
                    <span className="text-xs text-neutral-400">Last 10 events</span>
                </div>

                {logs === undefined ? (
                    <div className="flex items-center gap-3 py-8 text-neutral-400 justify-center">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm">Loading…</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="py-10 text-center">
                        <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <BarChart3 size={20} className="text-neutral-400" />
                        </div>
                        <p className="font-semibold text-neutral-700 mb-1">No usage yet</p>
                        <p className="text-sm text-neutral-400">Your usage history will appear here as you generate tracks.</p>
                    </div>
                ) : (
                    <div>
                        {logs.map((log: any) => (
                            <UsageRow key={log._id} log={log} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
