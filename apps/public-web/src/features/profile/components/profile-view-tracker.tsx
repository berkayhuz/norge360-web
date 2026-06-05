"use client";

import { useEffect } from "react";

type ProfileViewTrackerProps = {
  enabled: boolean;
  username: string;
};

export function ProfileViewTracker({ enabled, username }: ProfileViewTrackerProps) {
  useEffect(() => {
    if (!enabled || !username) {
      return;
    }

    const controller = new AbortController();
    void fetch(`/api/accounts/profiles/${encodeURIComponent(username)}/views`, {
      method: "POST",
      signal: controller.signal,
    }).catch(() => {
      // Profile view tracking is best-effort.
    });

    return () => controller.abort();
  }, [enabled, username]);

  return null;
}
