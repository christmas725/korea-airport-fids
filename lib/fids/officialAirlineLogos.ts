export type OfficialAirlineLogo = {
  url: string;
  source: string;
};

// Official/current airline wordmarks / horizontal logos.
// Prefer airline-owned assets. When an airline blocks direct asset hotlinking,
// use a stable mirror of the same current CI and keep the provenance here.
export const OFFICIAL_AIRLINE_LOGOS: Record<string, OfficialAirlineLogo> = {
  KE: {
    url: "https://kr.img.news.koreanair.com/wp-content/uploads/2025/03/%EC%82%AC%EC%A7%841-%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-%EC%8B%A0%EA%B7%9CCI-1024x204.png",
    source: "Korean Air Newsroom",
  },
  OZ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Asiana_Airlines_(2024).svg",
    source: "Asiana Airlines 2024 CI (stable mirror of airline CI)",
  },
  TW: {
    url: "https://otp.twayair.com/images/trinity.svg",
    source: "Trinity Airways",
  },
  YP: {
    url: "https://com.airpremiacdn.net/resources/onepoint/images/logo/airpremia_brand_logo_transparent.png",
    source: "Air Premia",
  },
  ZE: {
    url: "https://zeimg.eastarjet.com/daon/logo2.svg",
    source: "Eastar Jet",
  },
  "7C": {
    url: "https://static.jejuair.net/cms/images/banner_image/20250123100048468.png",
    source: "Jeju Air",
  },
  BX: {
    url: "https://image.airbusan.com/content/assets/images/common/img_logo.png",
    source: "Air Busan",
  },
  LJ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Jin_Air_logo.svg",
    source: "Jin Air CI (stable mirror)",
  },
  RS: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_of_Air_Seoul.svg",
    source: "Air Seoul CI (stable mirror sourced from official CI)",
  },
  XU: {
    url: "https://static.wixstatic.com/media/77ab67_c016290eff304b4cbce81a66062be125~mv2.png/v1/fill/w_744,h_248,al_c,q_90,enc_auto/20230511_sumair_RGB.png",
    source: "SUM Air official brand page",
  },
  RF: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Aero_K_logo.svg",
    source: "Aero K current CI (stable mirror)",
  },
  WE: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Parata_Airlines_(gray).svg",
    source: "Parata Air current CI (stable mirror)",
  },
  QR: {
    url: "https://d21buns5ku92am.cloudfront.net/69667/logo/retina-1677790355.png",
    source: "Qatar Airways Newsroom",
  },
  KL: {
    url: "https://content.presspage.com/uploads/162/1920_logoklm-427773.png",
    source: "KLM Newsroom",
  },
  MM: {
    url: "https://www.flypeach.com/information/brand/en/assets/img/common/logo.svg",
    source: "Peach Aviation Brand",
  },
};

export function officialAirlineLogo(code: string) {
  return OFFICIAL_AIRLINE_LOGOS[code.toUpperCase()] ?? null;
}
