"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useOverlayStore } from "@/lib/store/overlay-store";

export function OverlayPortal() {
  const [mounted, setMounted] = useState(false);
  const current = useOverlayStore((state) => state.queue[0]);

  useEffect(() => setMounted(true), []);

  if (!mounted || !current) return null;

  const target = document.getElementById("overlay-root");
  if (!target) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      {current.content}
    </div>,
    target
  );
}