export type AirportStatus = "live" | "preparing";

export type Airport = {
  code: string;
  name: string;
  englishName: string;
  region: string;
  status: AirportStatus;
  modes: string;
  source: "icn" | "kac";
  international?: boolean;
};

export const airports: Airport[] = [
  { code: "ICN", name: "인천", englishName: "Incheon", region: "수도권", status: "live", modes: "출발", source: "icn", international: true },
  { code: "GMP", name: "김포", englishName: "Gimpo", region: "수도권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
  { code: "CJJ", name: "청주", englishName: "Cheongju", region: "충청권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
  { code: "YNY", name: "양양", englishName: "Yangyang", region: "강원권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
  { code: "WJU", name: "원주", englishName: "Wonju", region: "강원권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "PUS", name: "김해", englishName: "Gimhae", region: "영남권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
  { code: "TAE", name: "대구", englishName: "Daegu", region: "영남권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
  { code: "USN", name: "울산", englishName: "Ulsan", region: "영남권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "HIN", name: "사천", englishName: "Sacheon", region: "영남권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "KPO", name: "포항경주", englishName: "Pohang Gyeongju", region: "영남권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "KWJ", name: "광주", englishName: "Gwangju", region: "호남권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "RSU", name: "여수", englishName: "Yeosu", region: "호남권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "MWX", name: "무안", englishName: "Muan", region: "호남권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
  { code: "KUV", name: "군산", englishName: "Gunsan", region: "호남권", status: "live", modes: "출발 · 도착", source: "kac" },
  { code: "CJU", name: "제주", englishName: "Jeju", region: "제주권", status: "live", modes: "출발 · 도착", source: "kac", international: true },
];

export const regions = ["수도권", "충청권", "강원권", "영남권", "호남권", "제주권"];

export function airportByCode(code: string) {
  return airports.find((airport) => airport.code.toLowerCase() === code.toLowerCase());
}
