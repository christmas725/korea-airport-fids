import InitialApiHydrator from "@/components/fids/InitialApiHydrator";
import FidsBoard from "@/components/icn/FidsBoard";
import { fetchInitialJson } from "@/lib/fids/serverInitial";
import type { DeparturesPayload } from "@/lib/icn/types";

export default async function IcnFidsPage() {
  const requestPath = "/api/airports/icn/flights";
  const initialPayload = await fetchInitialJson<DeparturesPayload>(requestPath);

  return (
    <>
      <a className="directory-link" href="/" aria-label="공항 선택으로 돌아가기">⌂</a>
      <InitialApiHydrator requestPath={requestPath} payload={initialPayload}>
        <FidsBoard />
      </InitialApiHydrator>
    </>
  );
}
