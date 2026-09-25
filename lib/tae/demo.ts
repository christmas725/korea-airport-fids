import type { FidsFlight, FlightMode } from "@/lib/tae/types";
import type { FidsTestScenario } from "@/lib/fids/previewTest";

type DemoOptions = {
  scenario?: FidsTestScenario;
  now?: Date;
};

const pad = (value: number) => String(value).padStart(2, "0");

function kstDateTime(minutesFromNow: number, baseNow: Date) {
  const now = new Date(baseNow.getTime() + 9 * 60 * 60 * 1000);
  now.setUTCMinutes(now.getUTCMinutes() + minutesFromNow);
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
}

const DESTINATIONS = [
  ["제주", "CJU", "국내선"], ["김포", "GMP", "국내선"], ["도쿄/나리타", "NRT", "국제선"],
  ["타이베이/타오위안", "TPE", "국제선"], ["방콕/수완나품", "BKK", "국제선"],
  ["다낭", "DAD", "국제선"], ["상하이/푸동", "PVG", "국제선"], ["오사카/간사이", "KIX", "국제선"],
] as const;

const AIRLINES = [
  ["KE", "대한항공"], ["OZ", "아시아나항공"], ["TW", "티웨이항공"],
  ["7C", "제주항공"], ["LJ", "진에어"], ["BX", "에어부산"],
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
] as const;

const DESTINATION_TESTS = ["HPH", "CIT", "ADD"] as const;

function generated(mode: FlightMode, count: number, baseNow: Date): FidsFlight[] {
  const departure = mode === "departures";
  return Array.from({ length: count }, (_, i) => {
    const [prefix, airline] = AIRLINES[i % AIRLINES.length]!;
    const [airport, airportCode, flightType] = DESTINATIONS[i % DESTINATIONS.length]!;
    const minutes = 5 + i * 7;
    return {
      id: `demo-${mode}-${i}`,
      mode,
      flightId: `${prefix}${300 + i}`,
      masterFlightId: `${prefix}${300 + i}`,
      airline,
      airport,
      airportCode,
      scheduleDateTime: kstDateTime(minutes, baseNow),
      estimatedDateTime: kstDateTime(minutes, baseNow),
      actualDateTime: "",
      facility: String(1 + (i % 12)),
      facilityLabel: departure ? "탑승구" : "수하물",
      flightType,
      remark: departure ? (i % 9 === 0 ? "탑승준비" : "정시") : "예정",
      codeshare: "",
    };
  });
}

export function demoFlights(mode: FlightMode, options: DemoOptions = {}) {
  const scenario = options.scenario ?? "normal";
  const baseNow = options.now ?? new Date();
  let rows = generated(mode, scenario === "paging" ? 84 : scenario === "busy" ? 56 : 24, baseNow);

  if (scenario === "overnight") {
    const statuses = ["게이트 변경", "탑승준비", "탑승중", "탑승마감", "출발"];
    rows = generated(mode, 10, baseNow).map((flight, i) => ({
      ...flight,
      flightId: mode === "departures" ? `ZE${780 + i}Y` : flight.flightId,
      masterFlightId: mode === "departures" ? `ZE${780 + i}Y` : flight.masterFlightId,
      scheduleDateTime: kstDateTime(-40 + i * 2, baseNow),
      estimatedDateTime: kstDateTime(5 + i * 2, baseNow),
      facility: String(257 + i),
      previousFacility: mode === "departures" ? String(252 + i) : undefined,
      remark: mode === "departures" ? statuses[i % statuses.length]! : "예정",
    }));
  } else if (scenario === "logos") {
    rows = generated(mode, LOGO_TEST_AIRLINES.length, baseNow).map((flight, i) => {
      const [code, airline] = LOGO_TEST_AIRLINES[i]!;
      return {
        ...flight,
        flightId: `${code}${900 + i}`,
        masterFlightId: `${code}${900 + i}`,
        airline,
      };
    });
  } else if (scenario === "destinations") {
    rows = generated(mode, DESTINATION_TESTS.length, baseNow).map((flight, i) => {
      const airportCode = DESTINATION_TESTS[i]!;
      return { ...flight, airport: airportCode, airportCode };
    });
  } else if (scenario === "gate-change" && mode === "departures") {
    rows = rows.map((flight, i) => i < 10 ? {
      ...flight,
      previousFacility: String(Math.max(1, Number(flight.facility) - 1)),
      remark: "탑승구 변경",
      remarkEnglish: "Gate Change",
    } : flight);
  } else if (scenario === "status") {
    const dep = ["정시", "지연", "결항", "탑승준비", "탑승중", "마감", "출발", "탑승구 변경"];
    const arr = ["예정", "지연", "결항", "도착", "시간변경"];
    const statuses = mode === "departures" ? dep : arr;
    rows = rows.map((flight, i) => ({
      ...flight,
      remark: statuses[i % statuses.length]!,
      previousFacility:
        mode === "departures" && statuses[i % statuses.length] === "탑승구 변경"
          ? String(Math.max(1, Number(flight.facility) - 1))
          : undefined,
      estimatedDateTime:
        statuses[i % statuses.length] === "지연"
          ? kstDateTime(25 + i * 7, baseNow)
          : flight.estimatedDateTime,
    }));
  } else if (scenario === "layout") {
    rows = rows.map((flight, i) => ({
      ...flight,
      airport: i % 2 ? "타이베이/타오위안 국제공항 장문표시" : "도쿄/나리타 국제공항 장문표시",
      airline: i % 2 ? "아시아나항공 공동운항 테스트" : "대한항공 장문 항공사명 테스트",
    }));
  }

  return rows;
}
