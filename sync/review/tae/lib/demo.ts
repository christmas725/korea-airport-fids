import type { FidsFlight, FlightMode } from "@/lib/types";

const pad = (value: number) => String(value).padStart(2, "0");

function kstDateTime(hoursFromNow: number) {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  now.setUTCMinutes(Math.floor(now.getUTCMinutes() / 5) * 5);
  now.setUTCHours(now.getUTCHours() + hoursFromNow);
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
}

const base = (mode: FlightMode): FidsFlight[] => {
  const departure = mode === "departures";
  const flights = departure
    ? [
        ["LJ429", "진에어", "제주", "CJU", -1, -1, "1", "탑승중", "국내선"],
        ["TW201", "티웨이항공", "도쿄/나리타", "NRT", 0, 0, "3", "탑승준비", "국제선"],
        ["KE1575", "대한항공", "제주", "CJU", 1, 1, "2", "정시", "국내선"],
        ["OZ8125", "아시아나항공", "제주", "CJU", 2, 2, "1", "수속중", "국내선"],
        ["TW105", "티웨이항공", "방콕", "BKK", 3, 4, "4", "지연", "국제선"],
        ["7C705", "제주항공", "타이베이/타오위안", "TPE", 5, 5, "3", "정시", "국제선"],
      ]
    : [
        ["LJ430", "진에어", "제주", "CJU", -1, -1, "2", "도착", "국내선"],
        ["TW684", "티웨이항공", "타이베이/타오위안", "TPE", 0, 1, "1", "시간변경", "국제선"],
        ["KE1576", "대한항공", "제주", "CJU", 1, 1, "2", "정시", "국내선"],
        ["OZ8126", "아시아나항공", "제주", "CJU", 2, 2, "1", "정시", "국내선"],
        ["TW202", "티웨이항공", "도쿄/나리타", "NRT", 3, 4, "1", "지연", "국제선"],
        ["7C706", "제주항공", "다낭", "DAD", 5, 5, "2", "정시", "국제선"],
      ];

  return flights.map((row) => {
    const [flightId, airline, airport, airportCode, scheduledOffset, estimatedOffset, facility, remark, flightType] = row as [string, string, string, string, number, number, string, string, "국내선" | "국제선"];
    return {
      id: `demo-${mode}-${flightId}`,
      mode,
      flightId,
      masterFlightId: flightId,
      airline,
      airport,
      airportCode,
      scheduleDateTime: kstDateTime(scheduledOffset),
      estimatedDateTime: kstDateTime(estimatedOffset),
      actualDateTime: remark === "도착" ? kstDateTime(estimatedOffset) : "",
      facility,
      facilityLabel: departure ? "탑승구" : "수하물",
      flightType,
      remark,
      codeshare: "",
    } satisfies FidsFlight;
  });
};

export function demoFlights(mode: FlightMode) {
  return base(mode);
}
