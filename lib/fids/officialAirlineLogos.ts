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
    url: "https://upload.wikimedia.org/wikipedia/commons/4/47/Asiana_Airlines_%282024%29.svg",
    source: "Asiana Airlines horizontal CI (stable mirror sourced from airline CI)",
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
    url: "https://i.namu.wiki/i/xqvPXkUzTz2zKg_JHpeBVNboalOiGmUJRN4T0m9aIFtHrrSORWn9aqc2TCDefq2XFTZCae36onQGzysOUlcoygxZALrLyxrkpkZ2RGq5bIrFgxTFM1jgCDYO0tHAiAQmskfMmwn44tVpyF4U-v88GQ.svg",
    source: "Eastar Jet current CI (user-provided mirror)",
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
    url: "https://companieslogo.com/img/orig/272450.KS_BIG-53b0d919.png",
    source: "Jin Air current CI (stable mirror; official site blocks hotlinking)",
  },
  RS: {
    url: "https://upload.wikimedia.org/wikipedia/commons/6/65/Logo_of_Air_Seoul.svg",
    source: "Air Seoul horizontal CI (stable mirror sourced from official CI)",
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
  SQ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Singapore_Airlines_Logo.svg",
    source: "Singapore Airlines current horizontal CI (stable mirror sourced from singaporeair.com)",
  },
  EK: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Emirates_Logo.svg",
    source: "Emirates current CI (stable mirror sourced from emirates.com)",
  },
  CX: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cathay_Pacific_Ltd._logo.svg",
    source: "Cathay Pacific current horizontal CI (stable mirror sourced from cathaypacific.com)",
  },
  VN: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vietnam_Airlines_2015_wordmark.svg",
    source: "Vietnam Airlines 2015 current horizontal CI (stable mirror sourced from vietnamairlines.com)",
  },
  AF: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_France_Logo.svg",
    source: "Air France current horizontal CI (stable mirror sourced from Air France corporate materials)",
  },
  CA: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_China_wordmark.svg",
    source: "Air China current horizontal wordmark (stable mirror sourced from airchina.com.cn)",
  },
  MU: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/China_Eastern_Airlines_logo.svg",
    source: "China Eastern Airlines current horizontal CI (stable mirror sourced from ceair.com)",
  },
  CZ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/China_Southern_Airlines_logo.svg",
    source: "China Southern Airlines current horizontal CI (stable mirror sourced from csair.com)",
  },
  TG: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Thai_Airways_logo.svg",
    source: "Thai Airways current horizontal CI (stable mirror sourced from thaiairways.com)",
  },
  TK: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Turkish_Airlines_logo_2019.svg",
    source: "Turkish Airlines 2019 current horizontal CI (stable mirror sourced from official logo archive)",
  },
  JL: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Japan_Airlines_Wordmark_(2011).svg",
    source: "Japan Airlines current horizontal wordmark (stable mirror sourced from jal.co.jp)",
  },
  NH: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/All_Nippon_Airways_Logo.svg",
    source: "ANA current horizontal CI (stable mirror sourced from ana.co.jp)",
  },
  CI: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/China_Airlines_wordmark.svg",
    source: "China Airlines current horizontal wordmark (stable mirror sourced from official CI)",
  },
  BR: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_EVA_Air.svg",
    source: "EVA Air current horizontal CI (stable mirror sourced from evaair.com)",
  },
  DL: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Delta_logo.svg",
    source: "Delta Air Lines current horizontal CI (stable mirror sourced from delta.com)",
  },
  UA: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/United_Airlines_wordmark.svg",
    source: "United Airlines current horizontal wordmark (stable mirror sourced from official corporate materials)",
  },
  MF: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Xiamen_Air_Logo.svg",
    source: "XiamenAir horizontal logo (stable mirror; extracted from airline homepage)",
  },
  VJ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/VietJet_Air_logo.svg",
    source: "VietJet Air horizontal logo (stable mirror sourced from vietjetair.com)",
  },
  LO: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/LOT_Polish_Airlines_wordmark.svg",
    source: "LOT Polish Airlines wordmark (stable mirror sourced from lot.com)",
  },
  AI: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_India_2023.svg",
    source: "Air India 2023 current horizontal logo (stable mirror sourced from airindia.com)",
  },
  NZ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_New_Zealand_logo.svg",
    source: "Air New Zealand current horizontal wordmark (stable mirror sourced from airline materials)",
  },
  IT: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tigerair_Taiwan_logo.svg",
    source: "Tigerair Taiwan horizontal logo (stable mirror sourced from tigerairtw.com)",
  },
  JX: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Starlux_wordmark.svg",
    source: "STARLUX Airlines wordmark (stable mirror sourced from starlux-airlines.com)",
  },
  PR: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Philippine_Airlines_logo.svg",
    source: "Philippine Airlines horizontal logo (stable mirror sourced from philippineairlines.com)",
  },
  VS: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Virgin_Atlantic_logo_2018.svg",
    source: "Virgin Atlantic current logo (stable mirror sourced from virginatlantic.com)",
  },
  ZG: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/ZIPAIR_Tokyo_full_logo.svg",
    source: "ZIPAIR Tokyo full horizontal logo (stable mirror sourced from zipair.net)",
  },
  LH: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lufthansa_Logo_2018.svg",
    source: "Lufthansa 2018 current horizontal logo (stable mirror sourced from Lufthansa Styleguide)",
  },
  MH: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Malaysia-airlines-logo-alt.png",
    source: "Malaysia Airlines horizontal logo (stable mirror sourced from malaysiaairlines.com)",
  },
  KC: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Astana_Logo.jpg",
    source: "Air Astana horizontal logo (stable mirror)",
  },
  "9C": {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_Spring_Airlines.jpg",
    source: "Spring Airlines horizontal logo (stable mirror sourced from Spring Airlines)",
  },
  OM: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/MIAT_Eng_Logo_JPG_(1).jpg",
    source: "MIAT Mongolian Airlines English horizontal logo (stable mirror)",
  },
  WY: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Oman_Air_logo.png",
    source: "Oman Air horizontal logo (stable mirror)",
  },
  GA: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Siluet_Garuda_Indonesia.svg",
    source: "Garuda Indonesia horizontal wordmark (stable mirror)",
  },
  AM: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Aerom%C3%A9xico_wordmark.svg",
    source: "Aeromexico 2024 wordmark (stable mirror sourced from aeromexico.com)",
  },
  BI: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Royal_Brunei_Airlines_logo.svg",
    source: "Royal Brunei Airlines current horizontal logo (stable mirror sourced from flyrb.com)",
  },
  SK: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Scandinavian_Airlines_logo.svg",
    source: "SAS current horizontal logo (stable mirror sourced from flysas.com)",
  },
  VZ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vietjet_Air_Thailand_logo.svg",
    source: "Thai VietJet Air horizontal logo (stable mirror sourced from VietJet annual report)",
  },
  ET: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ethiopian_Airlines_Logo.svg",
    source: "Ethiopian Airlines horizontal logo (stable mirror sourced from airline CI)",
  },
  EY: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Etihad-airways-logo.svg",
    source: "Etihad Airways official horizontal logo (stable mirror sourced from etihad.com)",
  },
  WS: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/WestJetLogo2018.svg",
    source: "WestJet 2018 current horizontal logo (stable mirror sourced from westjet.com)",
  },
  AC: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Canada_2017.svg",
    source: "Air Canada current horizontal logo (stable mirror sourced from aircanada.com)",
  },
  CM: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Copa_airlines_logo.png",
    source: "Copa Airlines horizontal logo (stable mirror)",
  },
  QF: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Qantas_wordmark_2016.svg",
    source: "Qantas 2016 current wordmark (stable mirror sourced from qantas.com)",
  },
  LA: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Latam-logo_-v_(Indigo).svg",
    source: "LATAM horizontal logo, indigo-on-white variant (stable mirror)",
  },
  UO: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/HK_express_logo_2013.svg",
    source: "HK Express horizontal logo (stable mirror sourced from hkexpress.com)",
  },
  UX: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Europa_Logo_(2015).svg",
    source: "Air Europa horizontal logo (stable mirror)",
  },
  QV: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/LaoAirlineslogo.png",
    source: "Lao Airlines horizontal logo (stable mirror)",
  },
  GS: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tianjin_Airlines_logo.png",
    source: "Tianjin Airlines horizontal logo (stable mirror)",
  },
  QW: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_Qingdao_Airlines.png",
    source: "Qingdao Airlines horizontal logo (stable mirror)",
  },
  SC: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Shandong_Airlines-Logo.png",
    source: "Shandong Airlines horizontal logo (stable mirror)",
  },
  ZH: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Shenzhen_Airlines_Logo.png",
    source: "Shenzhen Airlines horizontal logo (stable mirror)",
  },
  SV: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_of_Saudia.svg",
    source: "Saudia current logo (Wikimedia Commons; file used by current Wikipedia infobox)",
  },
  HO: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Juneyao_Air_logo.svg",
    source: "Juneyao Air current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  VA: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Virgin_Australia_Logo_2022.svg",
    source: "Virgin Australia 2022 current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  FM: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Shanghai_Airlines.svg",
    source: "Shanghai Airlines current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  "9G": {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Sun_PhuQuoc_Airways_logo.svg",
    source: "Sun PhuQuoc Airways 2025 horizontal logo (Wikimedia Commons; sourced from official airline materials)",
  },
  B7: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/UNI_Air_logo.png",
    source: "UNI Air current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  C6: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Centrum_Air_Logo.svg",
    source: "Centrum Air current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  TN: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Tahiti_Nui_logo.svg",
    source: "Air Tahiti Nui current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  "3U": {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Sichuan_Airlines_logo.svg",
    source: "Sichuan Airlines current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  DR: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ruili_Airlines_logo.png",
    source: "Ruili Airlines current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  PN: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/West_Air_(China)_Logo.png",
    source: "West Air China current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
  GJ: {
    url: "https://commons.wikimedia.org/wiki/Special:Redirect/file/LoongAir_logo.png",
    source: "Loong Air current logo (Wikimedia Commons; current Wikipedia infobox)",
  },
};

export function officialAirlineLogo(code: string) {
  return OFFICIAL_AIRLINE_LOGOS[code.toUpperCase()] ?? null;
}
