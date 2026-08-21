"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-session";
import {
  useCurrentContract,
  negotiateContract,
  decideContract,
} from "@/lib/hooks/use-contracts";

export default function ClientsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { data: contract, isLoading } = useCurrentContract(session?.company_id);

  const [position, setPosition] = useState(50);
  const [submitting, setSubmitting] = useState(false);
  const [closedMessage, setClosedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (contract) setPosition(contract.relationship_score > 50 ? contract.relationship_score : 50);
  }, [contract?.id]);

  useEffect(() => {
    if (!contract || contract.status === "closed_won" || contract.status === "closed_lost") return;
    const timeout = setTimeout(() => {
      negotiateContract(contract.id, position).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [position, contract?.id]);

  async function handleDecision(action: "accept" | "decline") {
    if (!contract) return;
    setSubmitting(true);
    try {
      await decideContract(contract.id, action, position);
      setClosedMessage(
        action === "accept" ? "Deal closed." : "You walked away from this deal."
      );
      await queryClient.invalidateQueries({ queryKey: ["company-state"] });
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <p className="text-neutral-400">Checking for incoming deals...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Client Portal</h1>

      {!contract && (
        <p className="text-neutral-500">No incoming deals yet this quarter.</p>
      )}

      {contract && (
        <div className="max-w-md rounded border border-neutral-700 bg-neutral-950 p-6">
          <p className="text-xs uppercase tracking-wide text-neutral-500">{contract.client_type}</p>
          <h2 className="mt-1 text-xl font-bold">{contract.client_name}</h2>
          <p className="mt-2 text-neutral-300">Contract value: {contract.value.toFixed(0)}</p>

          {contract.status === "closed_won" || contract.status === "closed_lost" ? (
            <p className="mt-4 text-sm text-neutral-400">
              {closedMessage ?? (contract.status === "closed_won" ? "Deal closed." : "This deal was declined.")}
            </p>
          ) : (
            <>
              <label className="mt-6 flex justify-between text-sm">
                <span>Price-focused</span>
                <span>Relationship-focused</span>
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={position}
                onChange={(e) => setPosition(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-6 flex gap-3">
                <button
                  disabled={submitting}
                  onClick={() => handleDecision("accept")}
                  className="rounded bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
                >
                  Accept Deal
                </button>
                <button
                  disabled={submitting}
                  onClick={() => handleDecision("decline")}
                  className="rounded border border-neutral-600 px-4 py-2 font-semibold text-neutral-300 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}