"use client";

import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";

export function SyncUserWithConvex() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [hasSynced, setHasSynced] = useState(false);
    const syncUser = useMutation(api.users.syncUser);

    useEffect(() => {
        if (isLoaded && isSignedIn && user && !hasSynced) {
            syncUser({
                userId: user.id,
                email: user.primaryEmailAddress?.emailAddress || "",
                name: user.fullName || undefined,
                imageUrl: user.imageUrl || undefined,
            })
                .then(() => setHasSynced(true))
                .catch(console.error);
        }
    }, [isLoaded, isSignedIn, user, hasSynced, syncUser]);

    return null;
}
