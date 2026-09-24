import InitialApiHydrator from "@/components/fids/InitialApiHydrator";
import FidsBoard from "@/components/icn/FidsBoard";
import { fetchInitialJson } from "@/lib/fids/serverInitial";
import {
  previewTestAllowed,
  previewTestQuery,
  type PreviewTestPageSearchParams,
} from "@/lib/fids/previewTest";
import type { DeparturesPayload } from "@/lib/icn/types";

export default async function IcnFidsPage({
  searchParams,
}: {
  searchParams: Promise<PreviewTestPageSearchParams>;
}) {
  const testQuery = previewTestQuery(await searchParams);
  const requestPath = `/api/airports/icn/flights?view=board${testQuery}`;
  const initialPayload = await fetchInitialJson<DeparturesPayload>(requestPath);

  return (
    <>
      <a className="directory-link" href="/" aria-label="공항 선택으로 돌아가기">⌂</a>
      <InitialApiHydrator requestPath={requestPath} payload={initialPayload}>
        <FidsBoard previewTest={previewTestAllowed()} />
      </InitialApiHydrator>
    </>
  );
}
