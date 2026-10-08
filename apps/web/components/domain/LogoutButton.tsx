"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLogout } from "@/lib/hooks/use-session";
import { soundManager } from "@/lib/audio";

export function LogoutButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const logoutMutation = useLogout();

  const handleOpenConfirm = () => {
    soundManager.playClick();
    setShowConfirm(true);
  };

  const handleCancel = () => {
    soundManager.playClick();
    setShowConfirm(false);
  };

  const handleConfirmLogout = async () => {
    soundManager.playAlert();
    try {
      await logoutMutation.mutateAsync();
      setShowConfirm(false);
      router.replace("/login");
    } catch {
      // In case of error, still clear and redirect
      setShowConfirm(false);
      router.replace("/login");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpenConfirm}
        className="px-2.5 py-1 rounded border border-red-500/40 bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-black font-mono text-[10px] font-bold tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
        title="Disconnect current executive session"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
        <span>TERMINATE SESSION</span>
      </button>

      {/* Confirmation Dialog Overlay */}
      {showConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-red-500/60 bg-neutral-950 p-6 shadow-[0_20px_70px_rgba(239,68,68,0.25)] flex flex-col gap-4 text-left">
            <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
              <div className="w-8 h-8 rounded border border-red-500/60 bg-red-500/10 flex items-center justify-center text-red-400 font-mono font-bold text-sm">
                !
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-red-500 tracking-widest uppercase">
                  EXECUTIVE PROTOCOL WARNING
                </span>
                <h3 className="text-base font-black text-white tracking-wide">
                  TERMINATE EXECUTIVE SESSION?
                </h3>
              </div>
            </div>

            <p className="text-neutral-300 text-xs font-mono leading-relaxed">
              Your current executive session will be disconnected. The company state remains safely preserved in corporate archives.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={logoutMutation.isPending}
                className="px-4 py-2 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-mono text-xs font-bold tracking-wider cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                disabled={logoutMutation.isPending}
                className="px-5 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-black tracking-widest cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                {logoutMutation.isPending ? "DISCONNECTING..." : "LOG OUT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
