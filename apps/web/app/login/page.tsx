"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FigmaLogin } from "@/components/domain/FigmaLogin";
import { useSession } from "@/lib/hooks/use-session";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isLoading } = useSession();

  // If already authenticated and assigned, route to city
  useEffect(() => {
    if (!isLoading && session?.company) {
      router.replace("/city");
    }
  }, [session, isLoading, router]);

  return (
    <FigmaLogin
      onSuccess={() => {
        router.push("/assignment");
      }}
    />
  );
}
