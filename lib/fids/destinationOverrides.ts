/**
 * Cross-airport fallback names. An airport adapter's official English feed
 * always takes priority; these values only fill gaps in that source.
 */
export const SHARED_DESTINATION_EN: Record<string, string> = {
  UBN: "NEW ULAANBAATAR",
  ISG: "ISHIGAKIJIMA",
  KMI: "MIYAZAKI",
  OKJ: "OKAYAMA",
  SGN: "HO CHI MINH",
  DAD: "DANANG",
  CXR: "NHA TRANG",
  SEA: "SEATTLE/TACOMA",
  DTW: "DETROIT",
  KTI: "PHNOM PENH/TECHO",
  MDC: "MANADO",
};

export const SHARED_DESTINATION_LOCAL: Record<string, string> = {
  ISG: "石垣島",
  KMI: "宮崎",
  OKJ: "岡山",
  SGN: "HỒ CHÍ MINH",
  DAD: "ĐÀ NẴNG",
  CXR: "NHA TRANG",
  KTI: "ភ្នំពេញ/តេជោ",
  MDC: "MANADO",
};

export const SHARED_DESTINATION_LOCALE: Record<string, string> = {
  ISG: "ja",
  KMI: "ja",
  OKJ: "ja",
  SGN: "vi",
  DAD: "vi",
  CXR: "vi",
  KTI: "km",
  MDC: "id",
};

export function sharedDestinationEnglish(code: string) {
  return SHARED_DESTINATION_EN[code.trim().toUpperCase()];
}

export function sharedDestinationLocal(code: string) {
  return SHARED_DESTINATION_LOCAL[code.trim().toUpperCase()];
}
