import type { DepartureFlight } from "./types";

function at(minutesFromNow: number) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCMinutes(kst.getUTCMinutes() + minutesFromNow);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}`;
}

type DemoRow = {
  flightId: string;
  airline: string;
  airport: string;
  airportCode: string;
  scheduled: number;
  estimated: number;
  checkin: string;
  gate: string;
  terminalId: string;
  remark: string;
  masterFlightId?: string;
  codeshare?: string;
};

export function getDemoFlights(): DepartureFlight[] {
  // 코드쉐어 순환을 확인할 수 있도록 일부 가상 코드쉐어 편명을 포함한다.
  const rows: DemoRow[] = [
    { flightId: "KE705", airline: "대한항공", airport: "도쿄/나리타", airportCode: "NRT", scheduled: 8, estimated: 8, checkin: "A19-A32", gate: "25", terminalId: "P02", remark: "탑승중", masterFlightId: "KE705", codeshare: "MA" },
    { flightId: "DL7905", airline: "델타항공", airport: "도쿄/나리타", airportCode: "NRT", scheduled: 8, estimated: 8, checkin: "A19-A32", gate: "25", terminalId: "P02", remark: "탑승중", masterFlightId: "KE705", codeshare: "SL" },
    { flightId: "AF7705", airline: "에어프랑스", airport: "도쿄/나리타", airportCode: "NRT", scheduled: 8, estimated: 8, checkin: "A19-A32", gate: "25", terminalId: "P02", remark: "탑승중", masterFlightId: "KE705", codeshare: "SL" },
    { flightId: "OZ741", airline: "아시아나항공", airport: "방콕", airportCode: "BKK", scheduled: 14, estimated: 24, checkin: "C01-C12", gate: "31", terminalId: "P01", remark: "지연" },
    { flightId: "TW295", airline: "티웨이항공", airport: "후쿠오카", airportCode: "FUK", scheduled: 20, estimated: 20, checkin: "G15-G24", gate: "108", terminalId: "P02", remark: "탑승준비" },
    { flightId: "SQ605", airline: "싱가포르항공", airport: "싱가포르", airportCode: "SIN", scheduled: 26, estimated: 26, checkin: "D10-D20", gate: "27", terminalId: "P01", remark: "" },
    { flightId: "KE901", airline: "대한항공", airport: "파리/샤를드골", airportCode: "CDG", scheduled: 32, estimated: 32, checkin: "B01-B14", gate: "253", terminalId: "P03", remark: "", masterFlightId: "KE901", codeshare: "MA" },
    { flightId: "AF5093", airline: "에어프랑스", airport: "파리/샤를드골", airportCode: "CDG", scheduled: 32, estimated: 32, checkin: "B01-B14", gate: "253", terminalId: "P03", remark: "", masterFlightId: "KE901", codeshare: "SL" },
    { flightId: "JL5250", airline: "일본항공", airport: "오사카/간사이", airportCode: "KIX", scheduled: 38, estimated: 38, checkin: "A01-A12", gate: "116", terminalId: "P02", remark: "" },
    { flightId: "DL170", airline: "델타항공", airport: "시애틀", airportCode: "SEA", scheduled: 44, estimated: 44, checkin: "E01-E14", gate: "268", terminalId: "P03", remark: "" },
    { flightId: "VN409", airline: "베트남항공", airport: "호찌민", airportCode: "SGN", scheduled: 50, estimated: 50, checkin: "H01-H12", gate: "42", terminalId: "P01", remark: "" },
    { flightId: "KE017", airline: "대한항공", airport: "로스앤젤레스", airportCode: "LAX", scheduled: 56, estimated: 56, checkin: "B15-B28", gate: "260", terminalId: "P03", remark: "" },
    { flightId: "CX419", airline: "캐세이퍼시픽", airport: "홍콩", airportCode: "HKG", scheduled: 62, estimated: 62, checkin: "J01-J12", gate: "45", terminalId: "P01", remark: "" },
    { flightId: "7C2101", airline: "제주항공", airport: "도쿄/나리타", airportCode: "NRT", scheduled: 68, estimated: 68, checkin: "L01-L12", gate: "112", terminalId: "P02", remark: "" },
    { flightId: "NH6896", airline: "전일본공수", airport: "도쿄/하네다", airportCode: "HND", scheduled: 74, estimated: 74, checkin: "K01-K10", gate: "36", terminalId: "P01", remark: "" },
    { flightId: "KE081", airline: "대한항공", airport: "뉴욕/JFK", airportCode: "JFK", scheduled: 80, estimated: 80, checkin: "D01-D14", gate: "249", terminalId: "P03", remark: "" },
    { flightId: "BR159", airline: "에바항공", airport: "타이베이/타오위안", airportCode: "TPE", scheduled: 86, estimated: 86, checkin: "F01-F12", gate: "123", terminalId: "P02", remark: "" },
    { flightId: "MU5042", airline: "중국동방항공", airport: "상하이/푸동", airportCode: "PVG", scheduled: 92, estimated: 92, checkin: "H15-H26", gate: "43", terminalId: "P01", remark: "" },
    { flightId: "KE651", airline: "대한항공", airport: "방콕", airportCode: "BKK", scheduled: 98, estimated: 98, checkin: "A15-A28", gate: "255", terminalId: "P03", remark: "" },
    { flightId: "TR897", airline: "스쿠트", airport: "싱가포르", airportCode: "SIN", scheduled: 104, estimated: 104, checkin: "J15-J25", gate: "125", terminalId: "P02", remark: "" },
    { flightId: "AC064", airline: "에어캐나다", airport: "밴쿠버", airportCode: "YVR", scheduled: 110, estimated: 110, checkin: "E15-E26", gate: "270", terminalId: "P03", remark: "" },
    { flightId: "QR859", airline: "카타르항공", airport: "도하", airportCode: "DOH", scheduled: 116, estimated: 126, checkin: "C15-C26", gate: "39", terminalId: "P01", remark: "지연" },
    { flightId: "EK325", airline: "에미레이트항공", airport: "두바이", airportCode: "DXB", scheduled: 122, estimated: 122, checkin: "G01-G12", gate: "117", terminalId: "P02", remark: "" },
  ];

  return rows.map((row, i) => ({
    id: `demo-${i}`,
    flightId: row.flightId,
    masterFlightId: row.masterFlightId ?? "",
    airline: row.airline,
    airport: row.airport,
    airportCode: row.airportCode,
    scheduleDateTime: at(row.scheduled),
    estimatedDateTime: at(row.estimated),
    checkin: row.checkin,
    gate: row.gate,
    terminalId: row.terminalId,
    terminalLabel: row.terminalId === "P03" ? "T2" : "T1",
    remark: row.remark,
    codeshare: row.codeshare ?? "",
  }));
}
