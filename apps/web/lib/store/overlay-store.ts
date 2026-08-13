import { create } from "zustand";
import type { ReactNode } from "react";

type OverlayItem = { id: string; content: ReactNode };

type OverlayState = {
  queue: OverlayItem[];
  showOverlay: (id: string, content: ReactNode) => void;
  dismissCurrent: () => void;
};

export const useOverlayStore = create<OverlayState>((set) => ({
  queue: [],
  showOverlay: (id, content) =>
    set((state) => ({ queue: [...state.queue, { id, content }] })),
  dismissCurrent: () =>
    set((state) => ({ queue: state.queue.slice(1) })),
}));