"use client";

import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { SyncUserWithConvex } from "./SyncUserWithConvex";
import { PlayerProvider } from "@/contexts/PlayerContext";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ClerkProvider>
            <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
                <SyncUserWithConvex />
                <PlayerProvider>
                    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                        {children}
                    </ThemeProvider>
                </PlayerProvider>
            </ConvexProviderWithClerk>
        </ClerkProvider>
    );
}
