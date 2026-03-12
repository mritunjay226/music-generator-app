"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import {
    Key, Plus, Trash2, Copy, Check, AlertTriangle,
    Shield, Clock, Loader2, Eye, EyeOff, X, ChevronRight
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateApiKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const base64 = btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
    return `ace_sk_${base64}`;
}

function formatDate(ts: number | undefined): string {
    if (!ts) return "Never";
    return new Intl.DateTimeFormat("en-US", {
        month: "short", day: "numeric", year: "numeric",
    }).format(new Date(ts));
}

function timeAgo(ts: number): string {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Create Key Modal
// ─────────────────────────────────────────────────────────────────────────────

function CreateKeyModal({ onClose }: { onClose: () => void }) {
    const createApiKey = useMutation(api.apiKeys.createApiKey);
    const [step, setStep] = useState<"name" | "reveal">("name");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [createdKey, setCreatedKey] = useState("");
    const [copied, setCopied] = useState(false);
    const [confirmed, setConfirmed] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            const rawKey = generateApiKey();
            await createApiKey({ name: name.trim(), rawKey });
            setCreatedKey(rawKey);
            setStep("reveal");
        } catch (e: any) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(createdKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-up">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                    <div className="flex items-center gap-2.5">
                        <div className="bg-neutral-900 p-1.5 rounded-lg">
                            <Key size={15} className="text-white" />
                        </div>
                        <span className="font-semibold text-neutral-900">
                            {step === "name" ? "Create API Key" : "Save Your Key"}
                        </span>
                    </div>
                    {step === "name" && (
                        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 p-1 rounded-lg hover:bg-neutral-100 transition-colors">
                            <X size={18} />
                        </button>
                    )}
                </div>

                {step === "name" ? (
                    <div className="p-6 space-y-5">
                        <p className="text-sm text-neutral-500">Give your API key a memorable name so you can identify it later.</p>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Key Name</label>
                            <input
                                autoFocus
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                                placeholder="e.g. My Production App"
                                className="input-field"
                            />
                        </div>
                        <div className="flex gap-3 pt-1">
                            <button onClick={onClose} className="flex-1 py-2.5 px-4 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-600 hover:bg-neutral-50 transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!name.trim() || isLoading}
                                className="flex-1 py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                                {isLoading ? "Creating…" : "Create Key"}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 space-y-5">
                        {/* Warning banner */}
                        <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-amber-800">Save this key now</p>
                                <p className="text-xs text-amber-700 mt-0.5">This is the only time you'll be able to see it. We don't store the full key.</p>
                            </div>
                        </div>

                        {/* Key display */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Your API Key</label>
                            <div className="flex items-center gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
                                <code className="flex-1 text-xs text-green-400 font-mono break-all leading-relaxed">
                                    {createdKey}
                                </code>
                                <button
                                    onClick={handleCopy}
                                    className="shrink-0 p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-all"
                                >
                                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                            {copied && <p className="text-xs text-green-600 flex items-center gap-1.5"><Check size={12} />Copied to clipboard!</p>}
                        </div>

                        {/* Confirm checkbox */}
                        <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-0.5 w-4 h-4 rounded accent-neutral-900 cursor-pointer"
                            />
                            <span className="text-sm text-neutral-600 group-hover:text-neutral-800 transition-colors">
                                I've saved my API key in a secure location
                            </span>
                        </label>

                        <button
                            onClick={onClose}
                            disabled={!confirmed}
                            className="w-full py-2.5 px-4 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Key Card
// ─────────────────────────────────────────────────────────────────────────────

function ApiKeyCard({ keyData }: {
    keyData: {
        _id: Id<"apiKeys">;
        name: string;
        prefix: string;
        status: string;
        createdAt: number;
        lastUsedAt?: number;
    }
}) {
    const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);
    const [isRevoking, setIsRevoking] = useState(false);
    const [confirmRevoke, setConfirmRevoke] = useState(false);

    const isActive = keyData.status === "active";

    const handleRevoke = async () => {
        if (!confirmRevoke) { setConfirmRevoke(true); return; }
        setIsRevoking(true);
        try {
            await revokeApiKey({ apiKeyId: keyData._id });
        } finally {
            setIsRevoking(false);
            setConfirmRevoke(false);
        }
    };

    return (
        <div className={`glass-panel p-5 transition-all ${isActive ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isActive ? "bg-neutral-100" : "bg-neutral-50"}`}>
                        <Key size={16} className={isActive ? "text-neutral-700" : "text-neutral-400"} />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-neutral-900 text-sm">{keyData.name}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-neutral-100 text-neutral-500"
                                }`}>
                                {isActive ? "Active" : "Revoked"}
                            </span>
                        </div>
                        <code className="text-xs text-neutral-400 font-mono mt-1 block">{keyData.prefix}</code>
                        <div className="flex items-center gap-4 mt-2.5">
                            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                                <Shield size={11} className="text-neutral-300" />
                                Created {formatDate(keyData.createdAt)}
                            </span>
                            <span className="text-xs text-neutral-400 flex items-center gap-1.5">
                                <Clock size={11} className="text-neutral-300" />
                                {keyData.lastUsedAt ? `Used ${timeAgo(keyData.lastUsedAt)}` : "Never used"}
                            </span>
                        </div>
                    </div>
                </div>

                {isActive && (
                    <div className="flex items-center gap-2 shrink-0">
                        {confirmRevoke && (
                            <span className="text-xs text-red-600 font-medium">Are you sure?</span>
                        )}
                        <button
                            onClick={handleRevoke}
                            disabled={isRevoking}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${confirmRevoke
                                ? "bg-red-600 text-white hover:bg-red-700"
                                : "text-neutral-500 hover:text-red-600 hover:bg-red-50 border border-neutral-200 hover:border-red-200"
                                }`}
                        >
                            {isRevoking ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                            {confirmRevoke ? "Revoke" : "Revoke"}
                        </button>
                        {confirmRevoke && (
                            <button
                                onClick={() => setConfirmRevoke(false)}
                                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-500 hover:bg-neutral-100 border border-neutral-200 transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
    const apiKeys = useQuery(api.apiKeys.listApiKeys);
    const [showModal, setShowModal] = useState(false);

    const activeKeys = apiKeys?.filter((k) => k.status === "active") ?? [];
    const revokedKeys = apiKeys?.filter((k) => k.status === "revoked") ?? [];

    return (
        <>
            {showModal && <CreateKeyModal onClose={() => setShowModal(false)} />}

            <div className="w-full flex flex-col gap-8 pb-10 animate-fade-up">
                {/* Page header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 tracking-tight mb-2">API Keys</h1>
                        <p className="text-neutral-500 text-sm max-w-lg">
                            Use API keys to authenticate requests from your own applications and integrations. Keys grant access to your ACE Studio account.
                        </p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors shrink-0 shadow-sm"
                    >
                        <Plus size={16} />
                        Create key
                    </button>
                </div>

                {/* Security notice */}
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                    <Shield size={16} className="text-blue-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <span className="font-semibold text-blue-800">Keep your keys secret.</span>
                        <span className="text-blue-700"> Never share them in public repositories, client-side code, or with others. Treat them like passwords.</span>
                    </div>
                </div>

                {/* How to use */}
                <div className="glass-panel p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                        <ChevronRight size={14} className="text-neutral-400" />
                        How to use your API key
                    </h2>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                        Pass your key in the <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700 font-mono">Authorization</code> header of your API requests:
                    </p>
                    <div className="bg-neutral-950 rounded-xl p-4 overflow-x-auto">
                        <code className="text-xs font-mono text-neutral-300 whitespace-pre">{`curl -X POST https://your-convex-url.convex.site/validate_api_key \\
  -H "Authorization: Bearer ace_sk_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json"`}</code>
                    </div>
                </div>

                {/* Active keys */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
                        Active Keys
                        {activeKeys.length > 0 && (
                            <span className="bg-neutral-100 text-neutral-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {activeKeys.length}
                            </span>
                        )}
                    </h2>

                    {apiKeys === undefined ? (
                        <div className="flex items-center gap-3 p-6 glass-panel text-neutral-400">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm">Loading keys…</span>
                        </div>
                    ) : activeKeys.length === 0 ? (
                        <div className="glass-panel p-10 text-center">
                            <div className="w-12 h-12 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <Key size={22} className="text-neutral-400" />
                            </div>
                            <p className="font-semibold text-neutral-700 mb-1">No active API keys</p>
                            <p className="text-sm text-neutral-400 mb-4">Create your first key to start integrating with ACE Studio.</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-xl text-sm font-medium hover:bg-neutral-800 transition-colors"
                            >
                                <Plus size={15} />
                                Create API Key
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeKeys.map((key) => (
                                <ApiKeyCard key={key._id} keyData={key} />
                            ))}
                        </div>
                    )}
                </div>

                {/* Revoked keys */}
                {revokedKeys.length > 0 && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-semibold text-neutral-500 flex items-center gap-2">
                            Revoked Keys
                            <span className="bg-neutral-100 text-neutral-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {revokedKeys.length}
                            </span>
                        </h2>
                        <div className="space-y-3">
                            {revokedKeys.map((key) => (
                                <ApiKeyCard key={key._id} keyData={key} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
