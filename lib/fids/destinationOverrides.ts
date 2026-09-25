/**
 * Cross-airport fallback names. An airport adapter's official English feed
 * always takes priority; these values only fill gaps in that source.
 */
export const SHARED_DESTINATION_KO: Record<string, string> = {
  HPH: "\uD558\uC774\uD401",
  CIT: "\uC27C\uCF04\uD2B8",
  ADD: "\uC544\uB514\uC2A4\uC544\uBC14\uBC14",
};

export const SHARED_DESTINATION_EN: Record<string, string> = {
  UBN: "NEW ULAANBAATAR",
  ISG: "ISHIGAKIJIMA",
  KMI: "MIYAZAKI",
  OKJ: "OKAYAMA",
  SGN: "HO CHI MINH",
  DAD: "DANANG",
  CXR: "NHA TRANG",
  SEA: "SEATTLE/TACOMA",
  MSP: "MINNEAPOLIS/ST. PAUL",
  SLC: "SALT LAKE CITY",
  DEN: "DENVER",
  IAH: "HOUSTON/INTERCONTINENTAL",
  PHX: "PHOENIX",
  MIA: "MIAMI",
  MCO: "ORLANDO",
  PDX: "PORTLAND",
  SAN: "SAN DIEGO",
  YYC: "CALGARY",
  TAG: "BOHOL/PANGLAO",
  DTW: "DETROIT",
  KTI: "PHNOM PENH/TECHO",
  MDC: "MANADO",
  HPH: "HAI PHONG",
  CIT: "SHYMKENT",
  ADD: "ADDIS ABABA",
};

export const SHARED_DESTINATION_LOCAL: Record<string, string> = {
  ISG: "石垣島",
  KMI: "宮崎",
  OKJ: "岡山",
  SGN: "HỒ CHÍ MINH",
  DAD: "ĐÀ NẴNG",
  CXR: "NHA TRANG",
  UBN: "ШИНЭ УЛААНБААТАР",
  KTI: "ភ្នំពេញ/តេជោ",
  MDC: "MANADO",
  TAG: "BOHOL/PANGLAO",
  HPH: "H\u1EA2I PH\u00D2NG",
  CIT: "\u0428\u042B\u041C\u041A\u0415\u041D\u0422",
  ADD: "\u12A0\u12F2\u1235 \u12A0\u1260\u1263",
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
  YYC: "en",
  TAG: "fil",
  HPH: "vi",
  CIT: "kk",
  ADD: "am",
};

export function sharedDestinationKorean(code: string) {
  return SHARED_DESTINATION_KO[code.trim().toUpperCase()];
}

export function sharedDestinationEnglish(code: string) {
  return SHARED_DESTINATION_EN[code.trim().toUpperCase()];
}

export function sharedDestinationLocal(code: string) {
  return SHARED_DESTINATION_LOCAL[code.trim().toUpperCase()];
}
