export type OfficialAirlineLogo = {
  url: string;
  source: string;
};

// Official airline wordmarks / horizontal logos.
// Keep this registry intentionally curated: only add assets verified from an
// airline-owned website, newsroom, CI page, or media library.
export const OFFICIAL_AIRLINE_LOGOS: Record<string, OfficialAirlineLogo> = {
  KE: {
    url: "https://kr.img.news.koreanair.com/wp-content/uploads/2025/03/%EC%82%AC%EC%A7%841-%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-%EC%8B%A0%EA%B7%9CCI-1024x204.png",
    source: "Korean Air Newsroom",
  },
  OZ: {
    url: "https://flyasiana.com/C/pc/image/sub/newimg_ci_english.png",
    source: "Asiana Airlines CI",
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
