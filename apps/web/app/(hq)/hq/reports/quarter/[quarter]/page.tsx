import { QuarterReportView } from "@/components/domain/QuarterReportView";

export function generateStaticParams() {
  return [
    { quarter: "1" },
    { quarter: "2" },
    { quarter: "3" },
    { quarter: "4" },
  ];
}

export default async function QuarterReportPage({
  params,
}: {
  params: Promise<{ quarter: string }>;
}) {
  const { quarter } = await params;
  return <QuarterReportView quarter={Number(quarter)} />;
}