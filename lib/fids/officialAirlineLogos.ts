export type OfficialAirlineLogo = {
  url: string;
  sourceUrl: string;
  source: string;
};

// Official/current airline wordmarks / horizontal logos.
// Prefer airline-owned assets. When an airline blocks direct asset hotlinking,
// use a stable mirror of the same current CI and keep the provenance here.
export const OFFICIAL_AIRLINE_LOGOS: Record<string, OfficialAirlineLogo> = {
  KE: {
    url: "/airlines/KE.svg",
    sourceUrl: "https://kr.img.news.koreanair.com/wp-content/uploads/2025/03/%EC%82%AC%EC%A7%841-%EB%8C%80%ED%95%9C%ED%95%AD%EA%B3%B5-%EC%8B%A0%EA%B7%9CCI-1024x204.png",
    source: "Korean Air Newsroom",
  },
  OZ: {
    url: "/airlines/OZ.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/4/47/Asiana_Airlines_%282024%29.svg",
    source: "Asiana Airlines horizontal CI (stable mirror sourced from airline CI)",
  },
  TW: {
    url: "/airlines/TW.svg",
    sourceUrl: "https://otp.twayair.com/images/trinity.svg",
    source: "Trinity Airways",
  },
  YP: {
    url: "/airlines/YP.svg",
    sourceUrl: "https://com.airpremiacdn.net/resources/onepoint/images/logo/airpremia_brand_logo_transparent.png",
    source: "Air Premia",
  },
  ZE: {
    url: "/airlines/ZE.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Eastar_Jet_Logo.svg",
    source: "Eastar Jet current horizontal logo (Wikimedia Commons)",
  },
  "7C": {
    url: "/airlines/7C.svg",
    sourceUrl: "https://static.jejuair.net/cms/images/banner_image/20250123100048468.png",
    source: "Jeju Air",
  },
  BX: {
    url: "/airlines/BX.svg",
    sourceUrl: "https://image.airbusan.com/content/assets/images/common/img_logo.png",
    source: "Air Busan",
  },
  LJ: {
    url: "/airlines/LJ.svg",
    sourceUrl: "https://companieslogo.com/img/orig/272450.KS_BIG-53b0d919.png",
    source: "Jin Air current CI (stable mirror; official site blocks hotlinking)",
  },
  RS: {
    url: "/airlines/RS.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/6/65/Logo_of_Air_Seoul.svg",
    source: "Air Seoul horizontal CI (stable mirror sourced from official CI)",
  },
  XU: {
    url: "/airlines/XU.svg",
    sourceUrl: "https://static.wixstatic.com/media/77ab67_c016290eff304b4cbce81a66062be125~mv2.png/v1/fill/w_744,h_248,al_c,q_90,enc_auto/20230511_sumair_RGB.png",
    source: "SUM Air official brand page",
  },
  RF: {
    url: "/airlines/RF.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Aero_K_logo.svg",
    source: "Aero K current CI (stable mirror)",
  },
  WE: {
    url: "/airlines/WE.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Parata_Airlines_(gray).svg",
    source: "Parata Air current CI (stable mirror)",
  },
  QR: {
    url: "/airlines/QR.svg",
    sourceUrl: "https://d21buns5ku92am.cloudfront.net/69667/logo/retina-1677790355.png",
    source: "Qatar Airways Newsroom",
  },
  KL: {
    url: "/airlines/KL.svg",
    sourceUrl: "https://content.presspage.com/uploads/162/1920_logoklm-427773.png",
    source: "KLM Newsroom",
  },
  MM: {
    url: "/airlines/MM.svg",
    sourceUrl: "https://www.flypeach.com/information/brand/en/assets/img/common/logo.svg",
    source: "Peach Aviation Brand",
  },
  SQ: {
    url: "/airlines/SQ.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Singapore_Airlines_Logo.svg",
    source: "Singapore Airlines current horizontal CI (stable mirror sourced from singaporeair.com)",
  },
  EK: {
    url: "/airlines/EK.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Emirates_Logo.svg",
    source: "Emirates current CI (stable mirror sourced from emirates.com)",
  },
  CX: {
    url: "/airlines/CX.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cathay_Pacific_Ltd._logo.svg",
    source: "Cathay Pacific current horizontal CI (stable mirror sourced from cathaypacific.com)",
  },
  VN: {
    url: "/airlines/VN.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vietnam_Airlines_2015_wordmark.svg",
    source: "Vietnam Airlines 2015 current horizontal CI (stable mirror sourced from vietnamairlines.com)",
  },
  AF: {
    url: "/airlines/AF.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_France_Logo.svg",
    source: "Air France current horizontal CI (stable mirror sourced from Air France corporate materials)",
  },
  CA: {
    url: "/airlines/CA.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_China_wordmark.svg",
    source: "Air China current horizontal wordmark (stable mirror sourced from airchina.com.cn)",
  },
  MU: {
    url: "/airlines/MU.svg",
    sourceUrl: "https://companieslogo.com/img/orig/600115.SS_BIG-581e66c6.svg",
    source: "China Eastern Airlines horizontal full wordmark (CompaniesLogo stable mirror)",
  },
  CZ: {
    url: "/airlines/CZ.svg",
    sourceUrl: "https://companieslogo.com/img/orig/600029.SS_BIG-2fef4522.svg",
    source: "China Southern Airlines horizontal full wordmark (CompaniesLogo stable mirror)",
  },
  TG: {
    url: "/airlines/TG.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Thai_Airways_logo.svg",
    source: "Thai Airways current horizontal CI (stable mirror sourced from thaiairways.com)",
  },
  TK: {
    url: "/airlines/TK.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Turkish_Airlines_logo_2019.svg",
    source: "Turkish Airlines 2019 current horizontal CI (stable mirror sourced from official logo archive)",
  },
  JL: {
    url: "/airlines/JL.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Japan_Airlines_Wordmark_(2011).svg",
    source: "Japan Airlines current horizontal wordmark (stable mirror sourced from jal.co.jp)",
  },
  NH: {
    url: "/airlines/NH.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/All_Nippon_Airways_Logo.svg",
    source: "ANA current horizontal CI (stable mirror sourced from ana.co.jp)",
  },
  CI: {
    url: "/airlines/CI.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/China_Airlines_wordmark.svg",
    source: "China Airlines current horizontal wordmark (stable mirror sourced from official CI)",
  },
  BR: {
    url: "/airlines/BR.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_EVA_Air.svg",
    source: "EVA Air current horizontal CI (stable mirror sourced from evaair.com)",
  },
  DL: {
    url: "/airlines/DL.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Delta_logo.svg",
    source: "Delta Air Lines current horizontal CI (stable mirror sourced from delta.com)",
  },
  UA: {
    url: "/airlines/UA.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/United_Airlines_wordmark.svg",
    source: "United Airlines current horizontal wordmark (stable mirror sourced from official corporate materials)",
  },
  MF: {
    url: "/airlines/MF.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Xiamen_Air_Logo.svg",
    source: "XiamenAir horizontal logo (stable mirror; extracted from airline homepage)",
  },
  VJ: {
    url: "/airlines/VJ.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/VietJet_Air_logo.svg",
    source: "VietJet Air horizontal logo (stable mirror sourced from vietjetair.com)",
  },
  LO: {
    url: "/airlines/LO.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/LOT_Polish_Airlines_wordmark.svg",
    source: "LOT Polish Airlines wordmark (stable mirror sourced from lot.com)",
  },
  AI: {
    url: "/airlines/AI.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_India_2023.svg",
    source: "Air India 2023 current horizontal logo (stable mirror sourced from airindia.com)",
  },
  NZ: {
    url: "/airlines/NZ.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_New_Zealand_logo.svg",
    source: "Air New Zealand current horizontal wordmark (stable mirror sourced from airline materials)",
  },
  IT: {
    url: "/airlines/IT.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Tigerair_Taiwan_logo.svg",
    source: "Tigerair Taiwan horizontal logo (stable mirror sourced from tigerairtw.com)",
  },
  JX: {
    url: "/airlines/JX.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Starlux_wordmark.svg",
    source: "STARLUX Airlines wordmark (stable mirror sourced from starlux-airlines.com)",
  },
  PR: {
    url: "/airlines/PR.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Philippine_Airlines_logo.svg",
    source: "Philippine Airlines horizontal logo (stable mirror sourced from philippineairlines.com)",
  },
  VS: {
    url: "/airlines/VS.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Virgin_Atlantic_logo_2018.svg",
    source: "Virgin Atlantic current logo (stable mirror sourced from virginatlantic.com)",
  },
  ZG: {
    url: "/airlines/ZG.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/ZIPAIR_Tokyo_full_logo.svg",
    source: "ZIPAIR Tokyo full horizontal logo (stable mirror sourced from zipair.net)",
  },
  LH: {
    url: "/airlines/LH.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Lufthansa_Logo_2018.svg",
    source: "Lufthansa 2018 current horizontal logo (stable mirror sourced from Lufthansa Styleguide)",
  },
  MH: {
    url: "/airlines/MH.svg",
    sourceUrl: "https://logotyp.us/file/malaysia-airlines.svg",
    source: "Malaysia Airlines current horizontal vector (Logotyp.us; checked against current airline branding)",
  },
  KC: {
    url: "/airlines/KC.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Astana_Logo.jpg",
    source: "Air Astana horizontal logo (stable mirror)",
  },
  "9C": {
    url: "/airlines/9C.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logo_Spring_Airlines.jpg",
    source: "Spring Airlines horizontal logo (stable mirror sourced from Spring Airlines)",
  },
  OM: {
    url: "/airlines/OM.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/MIAT_Eng_Logo_JPG_(1).jpg",
    source: "MIAT Mongolian Airlines English horizontal logo (stable mirror)",
  },
  WY: {
    url: "/airlines/WY.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Oman_Air_logo.png",
    source: "Oman Air horizontal logo (stable mirror)",
  },
  GA: {
    url: "/airlines/GA.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Siluet_Garuda_Indonesia.svg",
    source: "Garuda Indonesia horizontal wordmark (stable mirror)",
  },
  AM: {
    url: "/airlines/AM.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Aerom%C3%A9xico_wordmark.svg",
    source: "Aeromexico 2024 wordmark (stable mirror sourced from aeromexico.com)",
  },
  BI: {
    url: "/airlines/BI.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Royal_Brunei_Airlines_logo.svg",
    source: "Royal Brunei Airlines current horizontal logo (stable mirror sourced from flyrb.com)",
  },
  SK: {
    url: "/airlines/SK.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/3/33/Scandinavian_Airlines_logo.svg",
    source: "SAS current horizontal logo (stable mirror sourced from flysas.com)",
  },
  AA: {
    url: "/airlines/AA.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/8/81/American_Airlines_wordmark_%282013%29.svg",
    source: "American Airlines current horizontal wordmark (Wikimedia Commons; artwork by American Airlines)",
  },
  TP: {
    url: "/airlines/TP.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4b/TAP_Air_Portugal_logo.svg",
    source: "TAP Air Portugal horizontal logo (Wikimedia Commons; sourced from flytap.com)",
  },
  WB: {
    url: "/airlines/WB.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/en/6/6e/RwandAir_logo.svg",
    source: "RwandAir current colored horizontal logo (stable mirror; checked against rwandair.com branding)",
  },
  HX: {
    url: "/airlines/HX.svg",
    sourceUrl: "https://b2b.hongkongairlines.com/images/logo_inner_new.png",
    source: "Hong Kong Airlines official B2B website horizontal header logo",
  },
  OD: {
    url: "/airlines/OD.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/en/9/9e/Batik_Air_logo.svg",
    source: "Batik Air Malaysia current horizontal logo (English Wikipedia brand asset)",
  },
  DV: {
    url: "/airlines/DV.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/SCAT_Air_Company_Logo.svg",
    source: "SCAT Airlines horizontal logo (Wikimedia Commons; sourced from SCAT airline materials)",
  },
  UL: {
    url: "/airlines/UL.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/en/7/78/SriLankan_Airlines_Logo.svg",
    source: "SriLankan Airlines horizontal logo (English Wikipedia brand asset; checked against current airline branding)",
  },
  VZ: {
    url: "/airlines/VZ.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Vietjet_Air_Thailand_logo.svg",
    source: "Thai VietJet Air horizontal logo (stable mirror sourced from VietJet annual report)",
  },
  ET: {
    url: "/airlines/ET.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Ethiopian_Airlines_Logo.svg",
    source: "Ethiopian Airlines horizontal logo (stable mirror sourced from airline CI)",
  },
  EY: {
    url: "/airlines/EY.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Etihad-airways-logo.svg",
    source: "Etihad Airways official horizontal logo (stable mirror sourced from etihad.com)",
  },
  WS: {
    url: "/airlines/WS.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/WestJetLogo2018.svg",
    source: "WestJet 2018 current horizontal logo (stable mirror sourced from westjet.com)",
  },
  AC: {
    url: "/airlines/AC.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Canada_2017.svg",
    source: "Air Canada current horizontal logo (stable mirror sourced from aircanada.com)",
  },
  CM: {
    url: "/airlines/CM.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Copa_airlines_logo.png",
    source: "Copa Airlines horizontal logo (stable mirror)",
  },
  QF: {
    url: "/airlines/QF.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Qantas_wordmark_2016.svg",
    source: "Qantas 2016 current wordmark (stable mirror sourced from qantas.com)",
  },
  LA: {
    url: "/airlines/LA.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Latam-logo_-v_(Indigo).svg",
    source: "LATAM horizontal logo, indigo-on-white variant (stable mirror)",
  },
  UO: {
    url: "/airlines/UO.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/HK_express_logo_2013.svg",
    source: "HK Express horizontal logo (stable mirror sourced from hkexpress.com)",
  },
  UX: {
    url: "/airlines/UX.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Europa_Logo_(2015).svg",
    source: "Air Europa horizontal logo (stable mirror)",
  },
  QV: {
    url: "/airlines/QV.svg",
    sourceUrl: "https://laoairlines.com/wp-content/uploads/2020/10/logo-laoairlines.png",
    source: "Lao Airlines official website horizontal header logo",
  },
  GS: {
    url: "/airlines/GS.svg",
    sourceUrl: "https://logotyp.us/file/tianjin-airlines.svg",
    source: "Tianjin Airlines current horizontal logo (Logotyp.us vector; checked against current airline branding)",
  },
  QW: {
    url: "/airlines/QW.svg",
    sourceUrl: "https://b2t.qdairlines.com/qw-header-logo-title.png",
    source: "Qingdao Airlines official website horizontal header logo",
  },
  SC: {
    url: "/airlines/SC.svg",
    sourceUrl: "https://www.sda.cn/en/imgs/logo.36d0f3b.png",
    source: "Shandong Airlines official website current horizontal header logo",
  },
  ZH: {
    url: "/airlines/ZH.svg",
    sourceUrl: "https://static.airchina.com.cn/cms/1833388735043993600.jpg",
    source: "Shenzhen Airlines horizontal logo from Air China PhoenixMiles partner page",
  },
  SV: {
    url: "/airlines/SV.svg",
    sourceUrl: "https://files.brandlogos.net/svg/JsRIbNiiis/saudia-airlines-logo-brandlogos.net_7l2fwwwm1.svg",
    source: "Saudia 2023 horizontal wordmark (Brandlogos mirror; checked against current Saudia identity)",
  },
  HO: {
    url: "/airlines/HO.svg",
    sourceUrl: "https://staticglobal.juneyaoair.com/global1784793249251/logo.C_4nhiLp.png",
    source: "Juneyao Air official current horizontal website logo",
  },
  VA: {
    url: "/airlines/VA.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/en/0/06/Virgin_Australia_Logo_2022.svg",
    source: "Virgin Australia 2022 current logo (English Wikipedia brand asset)",
  },
  FM: {
    url: "/airlines/FM.svg",
    sourceUrl: "https://logotyp.us/file/shanghai-airlines.svg",
    source: "Shanghai Airlines current horizontal wordmark (Logotyp.us mirror; checked against current Shanghai Airlines branding)",
  },
  "9G": {
    url: "/airlines/9G.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Sun_PhuQuoc_Airways_logo.svg",
    source: "Sun PhuQuoc Airways 2025 horizontal logo (Wikimedia Commons; sourced from official airline materials)",
  },
  B7: {
    url: "/airlines/B7.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/fr/9/94/UNI_Air_Logo.svg",
    source: "UNI Air current horizontal SVG (French Wikipedia brand asset)",
  },
  C6: {
    url: "/airlines/C6.svg",
    sourceUrl: "https://centrum-air.com/logo.svg",
    source: "Centrum Air official website horizontal logo",
  },
  TN: {
    url: "/airlines/TN.svg",
    sourceUrl: "https://www.airtahitinui.com/themes/custom/atn/logo.svg",
    source: "Air Tahiti Nui official website horizontal logo",
  },
  "3U": {
    url: "/airlines/3U.svg",
    sourceUrl: "https://i.logos-download.com/5817/1292-38b9797b520ae04f69f00fa42330e319.svg/Sichuan_Airlines_Logo.svg?dl",
    source: "Sichuan Airlines horizontal vector mirror (artwork sourced from Sichuan Airlines official branding)",
  },
  DR: {
    url: "/airlines/DR.svg",
    sourceUrl: "https://en.wikipedia.org/wiki/Special:Redirect/file/Ruili_Airlines_logo.png",
    source: "Ruili Airlines logo-with-name image used by the current English Wikipedia infobox",
  },
  PN: {
    url: "/airlines/PN.svg",
    sourceUrl: "https://en.wikipedia.org/wiki/Special:Redirect/file/West_Air_(China)_Logo.png",
    source: "West Air China logo used by the current English Wikipedia infobox",
  },
  GJ: {
    url: "/airlines/GJ.svg",
    sourceUrl: "https://wsrv.nl/?url=res.loongair.cn/dfc5f11f038d4c0f92bbc5e5f574494e.png&output=png",
    source: "Loong Air official website light-background horizontal header logo (build-time image cache)",
  },
  AS: {
    url: "/airlines/AS.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Alaska_Airlines_logo.svg",
    source: "Alaska Airlines current horizontal wordmark (Wikimedia Commons; sourced from Alaska Airlines media kit)",
  },
  KQ: {
    url: "/airlines/KQ.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Kenya_Airways_logo.svg",
    source: "Kenya Airways horizontal logo (Wikimedia Commons; sourced from kenya-airways.com)",
  },
  "5J": {
    url: "/airlines/5J.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Cebu_Pacific_wordmark.svg",
    source: "Cebu Pacific horizontal wordmark (Wikimedia Commons; sourced from Cebu Pacific)",
  },
  AY: {
    url: "/airlines/AY.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Finnair_Logo.svg",
    source: "Finnair horizontal wordmark (Wikimedia Commons; sourced from finnair.com)",
  },
  JQ: {
    url: "/airlines/JQ.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Jetstar_logo.svg",
    source: "Jetstar horizontal logo (Wikimedia Commons)",
  },
  TR: {
    url: "/airlines/TR.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Scoot_logo.svg",
    source: "Scoot current official logo (Wikimedia Commons; sourced from flyscoot.com)",
  },
  AT: {
    url: "/airlines/AT.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/fr/c/c7/Logo_Royal_Air_Maroc_2013_%28Horizontal%29.svg",
    source: "Royal Air Maroc 2013 horizontal logo (Wikipedia mirror)",
  },
  BA: {
    url: "/airlines/BA.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/BRITISH_AIRWAYS_logo.svg",
    source: "British Airways horizontal wordmark (Wikimedia Commons; sourced from britishairways.com)",
  },
  IB: {
    url: "/airlines/IB.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Logotipo_de_Iberia.svg",
    source: "Iberia current horizontal logo (Wikimedia Commons)",
  },
  JU: {
    url: "/airlines/JU.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Air_Serbia_logo.svg",
    source: "Air Serbia horizontal wordmark (Wikimedia Commons; sourced from Air Serbia)",
  },
  "8M": {
    url: "/airlines/8M.svg",
    sourceUrl: "https://www.maiair.com/templates/hititcs/images/logo_mai.png",
    source: "Myanmar Airways International official website horizontal header logo",
  },
  HY: {
    url: "/airlines/HY.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/en/e/ef/Uzbekistan_Airways_logo.svg",
    source: "Uzbekistan Airways current horizontal logo (English Wikipedia brand asset)",
  },
  JD: {
    url: "/airlines/JD.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/en/8/88/Beijing_Capital_Airlines.png",
    source: "Beijing Capital Airlines horizontal logo (English Wikipedia brand asset)",
  },
  JT: {
    url: "/airlines/JT.svg",
    sourceUrl: "https://i.logos-download.com/5734/1274-b34d53f88940ad15f1e351d41e4c22e2.svg/Lion_Air_Logo_2008.svg?dl",
    source: "Lion Air current horizontal logo (Logos Download vector asset)",
  },
  KU: {
    url: "/airlines/KU.svg",
    sourceUrl: "https://files.brandlogos.net/svg/4yu3BbTeAj/Kuwait_Airways-Oi4HM9Uy7_brandlogos.net.svg",
    source: "Kuwait Airways current horizontal logo (Brandlogos vector asset)",
  },
  LY: {
    url: "/airlines/LY.svg",
    sourceUrl: "https://upload.wikimedia.org/wikipedia/commons/0/0f/ELAL2023Logo.svg",
    source: "EL AL 2023 horizontal wordmark (Wikimedia Commons; sourced from current branding)",
  },
  MS: {
    url: "/airlines/MS.svg",
    sourceUrl: "https://i.logos-download.com/2136/31295-e4ce59a8765fed1db3c6279058ea1025.svg/Egyptair_Logo_2008_horizontal.svg?dl",
    source: "EgyptAir horizontal wordmark (Logos Download vector asset)",
  },
  XY: {
    url: "/airlines/XY.svg",
    sourceUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Flynas_Logo.svg",
    source: "flynas horizontal bilingual logo (Wikimedia Commons; sourced from flynas)",
  },
};

export function officialAirlineLogo(code: string) {
  return OFFICIAL_AIRLINE_LOGOS[code.toUpperCase()] ?? null;
}
