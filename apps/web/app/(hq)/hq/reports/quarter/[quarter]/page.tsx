import { QuarterReportView } from "@/components/domain/QuarterReportView";

export default async function QuarterReportPage({
  params,
}: {
  params: Promise<{ quarter: string }>;
}) {
  const { quarter } = await params;
  return <QuarterReportView quarter={Number(quarter)} />;
}