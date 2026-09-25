import type { DepartureFlight } from "./types";
import type { FidsTestScenario } from "@/lib/fids/previewTest";

type DemoOptions = {
  scenario?: FidsTestScenario;
  now?: Date;
};

function at(minutesFromNow: number, baseNow: Date) {
  const kst = new Date(baseNow.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCMinutes(kst.getUTCMinutes() + minutesFromNow);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}`;
}

const DESTINATIONS = [
  ["도쿄/나리타", "NRT"], ["방콕/수완나품", "BKK"], ["후쿠오카", "FUK"],
  ["싱가포르", "SIN"], ["파리/샤를드골", "CDG"], ["오사카/간사이", "KIX"],
  ["시애틀/타코마", "SEA"], ["호찌민", "SGN"], ["로스앤젤레스", "LAX"],
  ["홍콩", "HKG"], ["도쿄/하네다", "HND"], ["뉴욕/JFK", "JFK"],
  ["타이베이/타오위안", "TPE"], ["상하이/푸동", "PVG"], ["밴쿠버", "YVR"],
  ["도하/하마드", "DOH"], ["두바이", "DXB"], ["프랑크푸르트", "FRA"],
  ["런던/히드로", "LHR"], ["헬싱키", "HEL"],
] as const;

const AIRLINES = [
  ["KE", "대한항공"], ["OZ", "아시아나항공"], ["TW", "티웨이항공"],
  ["7C", "제주항공"], ["LJ", "진에어"], ["BX", "에어부산"],
  ["SQ", "싱가포르항공"], ["DL", "델타항공"], ["VN", "베트남항공"],
  ["MU", "중국동방항공"], ["CZ", "중국남방항공"], ["CX", "캐세이퍼시픽"],
] as const;

const LOGO_TEST_AIRLINES = [
  ["SK", "스칸디나비아항공"], ["AA", "아메리칸항공"],
  ["TP", "TAP 포르투갈항공"], ["MH", "말레이시아항공"],
  ["WB", "르완드에어"], ["HX", "홍콩항공"],
  ["OD", "바틱에어 말레이시아"], ["DV", "SCAT항공"],
  ["UL", "스리랑카항공"], ["VA", "버진 오스트레일리아"],
  ["8M", "미얀마국제항공"], ["HY", "우즈베키스탄항공"],
  ["JD", "베이징캐피탈항공"], ["JT", "라이온에어"],
  ["B7", "유니항공"], ["QV", "라오항공"], ["SV", "사우디아항공"],
  ["KU", "쿠웨이트항공"], ["LY", "엘알항공"],
  ["MS", "이집트항공"], ["XY", "플라이나스"],
] as const;

const DESTINATION_TESTS = ["HPH", "CIT", "ADD"] as const;

function generatedRows(count: number, baseNow: Date): DepartureFlight[] {
  return Array.from({ length: count }, (_, i) => {
    const [prefix, airline] = AIRLINES[i % AIRLINES.length]!;
    const [airport, airportCode] = DESTINATIONS[i % DESTINATIONS.length]!;
    const terminalId = i % 3 === 0 ? "P03" : i % 2 === 0 ? "P02" : "P01";
    const schedule = 5 + i * 6;
    const gateNumber = terminalId === "P03" ? 230 + (i % 40) : 20 + (i % 110);
    return {
      id: `demo-generated-${i}`,
      flightId: `${prefix}${String(100 + i).padStart(3, "0")}`,
      masterFlightId: "",
      airline,
      airport,
      airportCode,
      scheduleDateTime: at(schedule, baseNow),
      estimatedDateTime: at(schedule, baseNow),
      checkin: `${String.fromCharCode(65 + (i % 12))}${String(1 + (i % 20)).padStart(2, "0")}-${String.fromCharCode(65 + (i % 12))}${String(8 + (i % 20)).padStart(2, "0")}`,
      gate: String(gateNumber),
      terminalId,
      terminalLabel: terminalId === "P03" ? "T2" : "T1",
      remark: i % 11 === 0 ? "탑승준비" : "",
      codeshare: "",
    };
  });
}

export function getDemoFlights(options: DemoOptions = {}): DepartureFlight[] {
  const scenario = options.scenario ?? "normal";
  const baseNow = options.now ?? new Date();

  if (scenario === "busy" || scenario === "paging") {
    return generatedRows(scenario === "paging" ? 96 : 64, baseNow);
  }

  if (scenario === "overnight") {
    const statuses = ["게이트 변경", "탑승준비", "탑승중", "탑승마감", "출발"];
    return generatedRows(10, baseNow).map((flight, i) => ({
      ...flight,
      flightId: `ZE${780 + i}Y`,
      scheduleDateTime: at(-40 + i * 2, baseNow),
      estimatedDateTime: at(5 + i * 2, baseNow),
      gate: String(257 + i),
      previousGate: String(252 + i),
      remark: statuses[i % statuses.length]!,
    }));
  }

  if (scenario === "logos") {
    return generatedRows(LOGO_TEST_AIRLINES.length, baseNow).map((flight, i) => {
      const [code, airline] = LOGO_TEST_AIRLINES[i]!;
      return { ...flight, flightId: `${code}${900 + i}`, airline };
    });
  }

  if (scenario === "destinations") {
    return generatedRows(DESTINATION_TESTS.length, baseNow).map((flight, i) => {
      const airportCode = DESTINATION_TESTS[i]!;
      return { ...flight, airport: airportCode, airportCode };
    });
  }

  const rows = generatedRows(24, baseNow);

  if (scenario === "gate-change") {
    return rows.map((flight, i) => i < 10 ? {
      ...flight,
      previousGate: String(Math.max(1, Number(flight.gate) - 3)),
      remark: "탑승구 변경",
      remarkEnglish: "Gate Change",
    } : flight);
  }

  if (scenario === "status") {
    const statuses = [
      ["정시", "On Time"], ["지연", "Delayed"], ["결항", "Cancelled"],
      ["탑승준비", "Gate Open"], ["탑승중", "Boarding"], ["마감", "Final Call"],
      ["출발", "Departed"], ["탑승구 변경", "Gate Change"],
    ] as const;
    return rows.map((flight, i) => {
      const [remark, remarkEnglish] = statuses[i % statuses.length]!;
      return {
        ...flight,
        remark,
        remarkEnglish,
        previousGate: remark === "탑승구 변경" ? String(Math.max(1, Number(flight.gate) - 2)) : undefined,
        estimatedDateTime: remark === "지연" ? at(20 + i * 6, baseNow) : flight.estimatedDateTime,
      };
    });
  }

  if (scenario === "layout") {
    const longNames = [
      ["워싱턴 D.C./덜레스 국제공항", "IAD"],
      ["댈러스/포트워스 국제공항", "DFW"],
      ["이스탄불 국제공항", "IST"],
      ["암스테르담/스키폴 국제공항", "AMS"],
    ] as const;
    return rows.map((flight, i) => {
      const [airport, airportCode] = longNames[i % longNames.length]!;
      return {
        ...flight,
        airport,
        airportCode,
        airline: i % 2 ? "중국남방항공 공동운항 테스트" : "대한항공 장문 항공사명 테스트",
        checkin: i % 3 === 0 ? "A01-A32 / B01-B16" : flight.checkin,
      };
    });
  }

  return rows;
}
