import FidsBoard from "@/components/tae/FidsBoard";
import { airportByCode } from "@/lib/airports";

export default function TaeFidsPage() {
  const airport = airportByCode("TAE")!;
  return (
    <>
      <a className="directory-link" href="/" aria-label="공항 선택으로 돌아가기">⌂</a>
      <FidsBoard airport={airport} />
    </>
  );
}
