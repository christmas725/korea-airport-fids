import InitialApiHydrator from "@/components/fids/InitialApiHydrator";
import FidsBoard from "@/components/tae/FidsBoard";
import { airportByCode } from "@/lib/airports";
import { fetchInitialJson } from "@/lib/fids/serverInitial";
import {
  previewTestQuery,
  type PreviewTestPageSearchParams,
} from "@/lib/fids/previewTest";
import type { FlightsPayload } from "@/lib/tae/types";

export const dynamic = "force-dynamic";

export default async function TaeFidsPage({
  searchParams,
}: {
  searchParams: Promise<PreviewTestPageSearchParams>;
}) {
  const airport = airportByCode("TAE")!;
  const testQuery = previewTestQuery(await searchParams);
  const previewTime = new URLSearchParams(testQuery.slice(1)).get("time") ?? "";
  const requestPath = `/api/airports/tae/flights?mode=departures${testQuery}`;
  const initialPayload = await fetchInitialJson<FlightsPayload>(requestPath);

  return (
    <>
      <a className="directory-link" href="/" aria-label="공항 선택으로 돌아가기">⌂</a>
      <InitialApiHydrator requestPath={requestPath} payload={initialPayload}>
        <FidsBoard airport={airport} previewTime={previewTime} />
      </InitialApiHydrator>
    </>
  );
}
