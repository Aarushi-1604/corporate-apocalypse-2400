"use client";

import { useEffect, useRef } from "react";
import { useSession } from "@/lib/hooks/use-session";
import { useActiveEvent } from "@/lib/hooks/use-active-event";
import { useOverlayStore } from "@/lib/store/overlay-store";
import { LeftRail } from "./LeftRail";
import { TopStatusBar } from "./TopStatusBar";
import { OverlayPortal } from "./OverlayPortal";
import { EventOverlay } from "@/components/domain/EventOverlay";
import { useRouter } from "next/navigation";
import { useActiveBoard } from "@/lib/hooks/use-active-board";  
import { BoardSessionOverlay } from "@/components/domain/BoardSessionOverlay";

export function HqShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useSession();
  const router = useRouter();
  const { data: activeEvent } = useActiveEvent(data?.company_id);
  const showOverlay = useOverlayStore((s) => s.showOverlay);
  const shownEventId = useRef<string | null>(null);
  const { data: activeBoard } = useActiveBoard(data?.company_id);
  const shownBoardId = useRef<string | null>(null);

  useEffect(() => {
  if (activeBoard && shownBoardId.current !== activeBoard.exchange_id) {
    shownBoardId.current = activeBoard.exchange_id;
    showOverlay(
      `board-${activeBoard.exchange_id}`,
      <BoardSessionOverlay exchange={activeBoard} />,
    );
  }
}, [activeBoard, showOverlay]);

useEffect(() => {
  if (
    activeEvent &&
    shownEventId.current !== activeEvent.event_instance_id
  ) {
    shownEventId.current = activeEvent.event_instance_id;
    showOverlay(
      activeEvent.event_instance_id,
      <EventOverlay event={activeEvent} />,
    );
  }
}, [activeEvent, showOverlay]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading Headquarters...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-screen bg-black text-white">
      <LeftRail />
      <div className="flex flex-1 flex-col">
        <TopStatusBar />
        <main className="flex-1 p-8">{children}</main>
      </div>
      <OverlayPortal />
    </div>
  );
}