import InitialApiHydrator from "@/components/fids/InitialApiHydrator";
import FidsBoard from "@/components/tae/FidsBoard";
import { airportByCode } from "@/lib/airports";
import { fetchInitialJson } from "@/lib/fids/serverInitial";
import {
  previewTestQuery,
  type PreviewTestPageSearchParams,
} from "@/lib/fids/previewTest";
import type { FlightsPayload } from "@/lib/tae/types";

export default async function TaeFidsPage({
  searchParams,
}: {
  searchParams: Promise<PreviewTestPageSearchParams>;
}) {
  const airport = airportByCode("TAE")!;
  const pageQuery = await searchParams;
  const initialFlightType = airport.international && pageQuery.type === "international" ? "국제선" : "국내선";
  const testQuery = previewTestQuery(pageQuery);
  const requestPath = `/api/airports/tae/flights?mode=departures${testQuery}`;
  const initialPayload = await fetchInitialJson<FlightsPayload>(requestPath);

  return (
    <>
      <a className="directory-link" href="/" aria-label="공항 선택으로 돌아가기">⌂</a>
      <InitialApiHydrator requestPath={requestPath} payload={initialPayload}>
        <FidsBoard airport={airport} initialFlightType={initialFlightType} />
      </InitialApiHydrator>
    </>
  );
}
