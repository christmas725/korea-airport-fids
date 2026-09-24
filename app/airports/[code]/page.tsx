import Link from "next/link";
import { notFound } from "next/navigation";
import InitialApiHydrator from "@/components/fids/InitialApiHydrator";
import FidsBoard from "@/components/tae/FidsBoard";
import { airportByCode } from "@/lib/airports";
import { fetchInitialJson } from "@/lib/fids/serverInitial";
import {
  previewTestQuery,
  type PreviewTestPageSearchParams,
} from "@/lib/fids/previewTest";
import type { FlightsPayload } from "@/lib/tae/types";

export default async function PreparingAirportPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<PreviewTestPageSearchParams>;
}) {
  const { code } = await params;
  const airport = airportByCode(code);

  if (!airport || airport.source !== "kac") {
    notFound();
  }

  if (airport.status === "live") {
    const testQuery = previewTestQuery(await searchParams);
    const requestPath = `/api/airports/${airport.code.toLowerCase()}/flights?mode=departures${testQuery}`;
    const initialPayload = await fetchInitialJson<FlightsPayload>(requestPath);

    return (
      <>
        <a className="directory-link" href="/" aria-label="공항 선택으로 돌아가기">⌂</a>
        <InitialApiHydrator requestPath={requestPath} payload={initialPayload}>
          <FidsBoard airport={airport} />
        </InitialApiHydrator>
      </>
    );
  }

  return (
    <main className="preparing-shell">
      <div className="preparing-board">
        <div className="preparing-topline">
          <span>FLIGHT INFORMATION DISPLAY SYSTEM</span>
          <span>{airport.region}</span>
        </div>
        <div className="preparing-code">{airport.code}</div>
        <p className="preparing-name">{airport.name}공항 · {airport.englishName} Airport</p>
        <h1>{airport.name}공항 FIDS는<br />구현 준비중입니다.</h1>
        <p className="preparing-description">
          해당 공항의 실시간 운항정보 연결과 전광판 화면을 준비하고 있습니다.
        </p>
        <Link className="back-button" href="/">공항 선택으로 돌아가기</Link>
      </div>
    </main>
  );
}
