import { HqShell } from "@/components/layout/HqShell";

export default function HqLayout({ children }: { children: React.ReactNode }) {
  return <HqShell>{children}</HqShell>;
}