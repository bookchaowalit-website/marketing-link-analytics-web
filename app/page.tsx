import { LinkReport } from "@/components/link-report";
import { REPORTS, ROWS } from "@/lib/report";

export default function Home() {
  return <LinkReport reports={REPORTS} rows={ROWS} />;
}
