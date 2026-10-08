"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type RegisterResponse } from "@/lib/api/registration";
import { FigmaLogin } from "@/components/domain/FigmaLogin";
import { FigmaAssignment } from "@/components/domain/FigmaAssignment";

export default function Home() {
  const router = useRouter();
  const [result, setResult] = useState<RegisterResponse | null>(null);

  if (result) {
    return (
      <FigmaAssignment
        data={result}
        onAccept={() => router.push("/hq/executive")}
      />
    );
  }

  return <FigmaLogin onSuccess={(response) => setResult(response)} />;
}
