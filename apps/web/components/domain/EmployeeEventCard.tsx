"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { respondToEvent, type EmployeeFeedItem } from "@/lib/hooks/use-employee-feed";

export function EmployeeEventCard({ item, companyId }: { item: EmployeeFeedItem; companyId: string }) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  async function handleRespond(index: number) {
    setSubmitting(true);
    try {
      await respondToEvent(item.event_instance_id, index);
      await queryClient.invalidateQueries({ queryKey: ["employee-feed", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["company-state"] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={`rounded border p-4 ${item.resolved ? "border-neutral-800 opacity-60" : "border-neutral-700"}`}>
      <h3 className="font-semibold">{item.title}</h3>
      <p className="mt-1 text-sm text-neutral-400">{item.body}</p>

      {item.resolved ? (
        <p className="mt-2 text-sm italic text-neutral-500">{item.follow_up_text}</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.response_options.map((opt, i) => (
            <button
              key={i}
              disabled={submitting}
              onClick={() => handleRespond(i)}
              className="rounded bg-white px-3 py-1 text-sm font-semibold text-black disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}