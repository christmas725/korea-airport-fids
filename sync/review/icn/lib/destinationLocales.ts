export type LocalLocale =
  | "ko" | "en" | "ja" | "zh-CN" | "zh-TW" | "th" | "vi" | "fil"
  | "id" | "ms" | "lo" | "km" | "my" | "hi" | "ne" | "si" | "bn"
  | "uz" | "kk" | "ky" | "mn" | "ar" | "tr" | "he" | "fr" | "de"
  | "it" | "nl" | "es" | "cs" | "hu" | "pl" | "fi" | "da" | "no"
  | "sv" | "el" | "pt" | "hr" | "ka";

export type DisplayLanguage = "KO" | "EN" | "LOCAL";

type StatusKey =
  | "ready"
  | "boarding"
  | "final"
  | "delayed"
  | "cancelled"
  | "departed"
  | "checkin"
  | "checkinClosed"
  | "onTime"
  | "gateChanged";

type StatusTable = Partial<Record<StatusKey, string>>;

const CODE_LOCALE: Record<string, LocalLocale> = {};

function assign(locale: LocalLocale, codes: string[]) {
  codes.forEach((code) => { CODE_LOCALE[code] = locale; });
}

assign("ko", ["CJU", "PUS"]);
assign("ja", ["NRT","HND","KIX","ITM","FUK","CTS","NGO","OKA","SDJ","KMQ","FSZ","HIJ","TAK","MYJ","KMJ","KOJ","NGS","OIT","KCZ","AOJ","HKD","KIJ","TOY","YGJ","TKS","UBJ"]);
assign("zh-CN", ["HET","PEK","PKX","PVG","SHA","CAN","SZX","TAO","TSN","DLC","SHE","HGH","NKG","WUH","XIY","CKG","TFU","CTU","KMG","CSX","XMN","FOC","WUX","CGO","HRB","YNT","WEH","TNA","CGQ","HAK","SYX","NGB","URC","KWE","HFE","SJW","YNJ","WNZ","JJN","LJG","DYG"]);
assign("zh-TW", ["HKG","MFM","TPE","TSA","KHH","RMQ"]);
assign("th", ["BKK","DMK","CNX","HKT"]);
assign("en", ["SIN","LHR","LGW","LAX","SFO","SEA","JFK","EWR","IAD","BOS","ORD","DFW","ATL","LAS","HNL","YVR","YYZ","SYD","MEL","BNE","AKL","GUM","SPN","ROR"]);
assign("ms", ["KUL","BKI","PEN","BWN"]);
assign("vi", ["SGN","HAN","DAD","CXR","PQC"]);
assign("fil", ["MNL","CEB","CRK","TAG"]);
assign("id", ["CGK","DPS"]);
assign("lo", ["VTE","LPQ"]);
assign("km", ["PNH","SAI"]);
assign("my", ["RGN"]);
assign("hi", ["DEL","BOM","BLR","MAA"]);
assign("ne", ["KTM"]);
assign("si", ["CMB"]);
assign("bn", ["DAC"]);
assign("uz", ["TAS"]);
assign("kk", ["ALA","NQZ"]);
assign("ky", ["FRU"]);
assign("mn", ["UBN","ULN"]);
assign("ar", ["DXB","AUH","DOH","RUH","JED"]);
assign("tr", ["IST"]);
assign("he", ["TLV"]);
assign("fr", ["CDG","YUL"]);
assign("de", ["FRA","MUC","ZRH"]);
assign("it", ["FCO","MXP"]);
assign("nl", ["AMS","BRU"]);
assign("es", ["MAD","BCN"]);
assign("cs", ["PRG"]);
assign("hu", ["BUD"]);
assign("pl", ["WAW"]);
assign("fi", ["HEL"]);
assign("da", ["CPH"]);
assign("no", ["OSL"]);
assign("sv", ["ARN"]);
assign("el", ["ATH"]);
assign("pt", ["LIS"]);
assign("hr", ["ZAG"]);
assign("ka", ["TBS"]);
assign("de", ["VIE"]); // 오스트리아 독일어

/** 공항 FIDS에서 쓰기 좋은 현지어 목적지 표기. 없는 곳은 영문 표기로 안전하게 fallback. */
const LOCAL_DESTINATION: Record<string, string> = {
  CJU:"제주", PUS:"부산/김해",
  NRT:"東京/成田", HND:"東京/羽田", KIX:"大阪/関西", ITM:"大阪/伊丹", FUK:"福岡", CTS:"札幌/新千歳", NGO:"名古屋/中部", OKA:"沖縄/那覇", SDJ:"仙台", KMQ:"小松", FSZ:"静岡", HIJ:"広島", TAK:"高松", MYJ:"松山", KMJ:"熊本", KOJ:"鹿児島", NGS:"長崎", OIT:"大分", KCZ:"高知", AOJ:"青森", HKD:"函館", KIJ:"新潟", TOY:"富山", YGJ:"米子", TKS:"徳島", UBJ:"山口宇部",
  HET:"呼和浩特", PEK:"北京/首都", PKX:"北京/大兴", PVG:"上海/浦东", SHA:"上海/虹桥", CAN:"广州", SZX:"深圳", TAO:"青岛", TSN:"天津", DLC:"大连", SHE:"沈阳", HGH:"杭州", NKG:"南京", WUH:"武汉", XIY:"西安", CKG:"重庆", TFU:"成都/天府", CTU:"成都/双流", KMG:"昆明", CSX:"长沙", XMN:"厦门", FOC:"福州", WUX:"无锡", CGO:"郑州", HRB:"哈尔滨", YNT:"烟台", WEH:"威海", TNA:"济南", CGQ:"长春", HAK:"海口", SYX:"三亚", NGB:"宁波", URC:"乌鲁木齐", KWE:"贵阳", HFE:"合肥", SJW:"石家庄", YNJ:"延吉", WNZ:"温州", JJN:"泉州/晋江", LJG:"丽江", DYG:"张家界",
  HKG:"香港", MFM:"澳門", TPE:"臺北/桃園", TSA:"臺北/松山", KHH:"高雄", RMQ:"臺中",
  BKK:"กรุงเทพฯ/สุวรรณภูมิ", DMK:"กรุงเทพฯ/ดอนเมือง", CNX:"เชียงใหม่", HKT:"ภูเก็ต",
  SIN:"SINGAPORE", KUL:"KUALA LUMPUR", BKI:"KOTA KINABALU", PEN:"PULAU PINANG",
  SGN:"THÀNH PHỐ HỒ CHÍ MINH", HAN:"HÀ NỘI", DAD:"ĐÀ NẴNG", CXR:"NHA TRANG/CAM RANH", PQC:"PHÚ QUỐC",
  MNL:"MAYNILA", CEB:"CEBU", CRK:"CLARK", TAG:"BOHOL/PANGLAO", CGK:"JAKARTA", DPS:"BALI/DENPASAR", BWN:"BANDAR SERI BEGAWAN",
  VTE:"ວຽງຈັນ", LPQ:"ຫຼວງພະບາງ", PNH:"ភ្នំពេញ", SAI:"សៀមរាប/អង្គរ", RGN:"ရန်ကုန်",
  DEL:"दिल्ली", BOM:"मुंबई", BLR:"बेंगलुरु", MAA:"चेन्नई", KTM:"काठमाडौं", CMB:"කොළඹ", DAC:"ঢাকা",
  TAS:"TOSHKENT", ALA:"АЛМАТЫ", NQZ:"АСТАНА", FRU:"БИШКЕК", UBN:"УЛААНБААТАР", ULN:"УЛААНБААТАР",
  DXB:"دبي", AUH:"أبوظبي", DOH:"الدوحة", IST:"İSTANBUL", RUH:"الرياض", JED:"جدة", TLV:"תל אביב",
  LHR:"LONDON/HEATHROW", LGW:"LONDON/GATWICK", CDG:"PARIS/CHARLES-DE-GAULLE", FRA:"FRANKFURT", MUC:"MÜNCHEN", FCO:"ROMA/FIUMICINO", MXP:"MILANO/MALPENSA", AMS:"AMSTERDAM", MAD:"MADRID", BCN:"BARCELONA", ZRH:"ZÜRICH", VIE:"WIEN", PRG:"PRAHA", BUD:"BUDAPEST", WAW:"WARSZAWA", HEL:"HELSINKI", CPH:"KØBENHAVN", OSL:"OSLO", ARN:"STOCKHOLM/ARLANDA", ATH:"ΑΘΗΝΑ", LIS:"LISBOA", BRU:"BRUSSEL", ZAG:"ZAGREB", TBS:"თბილისი",
  LAX:"LOS ANGELES", SFO:"SAN FRANCISCO", SEA:"SEATTLE", JFK:"NEW YORK/JFK", EWR:"NEW YORK/NEWARK", IAD:"WASHINGTON/DULLES", BOS:"BOSTON", ORD:"CHICAGO/O'HARE", DFW:"DALLAS/FORT WORTH", ATL:"ATLANTA", LAS:"LAS VEGAS", HNL:"HONOLULU", YVR:"VANCOUVER", YYZ:"TORONTO", YUL:"MONTRÉAL",
  SYD:"SYDNEY", MEL:"MELBOURNE", BNE:"BRISBANE", AKL:"AUCKLAND", GUM:"GUAM", SPN:"SAIPAN", ROR:"KOROR/PALAU",
};

const EN_STATUS: StatusTable = {
  ready:"Gate Open", boarding:"Boarding", final:"Gate Closing", delayed:"Delayed",
  cancelled:"Cancelled", departed:"Departed", checkin:"Check-in", checkinClosed:"Check-in Closed",
  onTime:"On Time", gateChanged:"Gate Changed",
};
const KO_STATUS: StatusTable = {
  ready:"탑승준비", boarding:"탑승중", final:"탑승마감", delayed:"지연",
  cancelled:"결항", departed:"출발", checkin:"수속중", checkinClosed:"수속마감",
  onTime:"정시", gateChanged:"탑승구 변경",
};

const STATUS_BY_LOCALE: Partial<Record<LocalLocale, StatusTable>> = {
  ko: KO_STATUS,
  en: EN_STATUS,
  ja:{ready:"搭乗準備",boarding:"搭乗中",final:"搭乗締切",delayed:"遅延",cancelled:"欠航",departed:"出発",checkin:"チェックイン",checkinClosed:"チェックイン締切",onTime:"定刻",gateChanged:"搭乗口変更"},
  "zh-CN":{ready:"准备登机",boarding:"登机中",final:"登机截止",delayed:"延误",cancelled:"取消",departed:"已起飞",checkin:"办理值机",checkinClosed:"值机截止",onTime:"准点",gateChanged:"登机口变更"},
  "zh-TW":{ready:"準備登機",boarding:"登機中",final:"登機截止",delayed:"延誤",cancelled:"取消",departed:"已起飛",checkin:"報到中",checkinClosed:"報到截止",onTime:"準點",gateChanged:"登機門變更"},
  th:{ready:"เตรียมขึ้นเครื่อง",boarding:"กำลังขึ้นเครื่อง",final:"ปิดประตูขึ้นเครื่อง",delayed:"ล่าช้า",cancelled:"ยกเลิก",departed:"ออกเดินทางแล้ว",checkin:"เช็กอิน",checkinClosed:"ปิดเช็กอิน",onTime:"ตรงเวลา",gateChanged:"เปลี่ยนประตูขึ้นเครื่อง"},
  vi:{ready:"Chuẩn bị lên máy bay",boarding:"Đang lên máy bay",final:"Đóng cửa lên máy bay",delayed:"Chậm chuyến",cancelled:"Hủy chuyến",departed:"Đã khởi hành",checkin:"Làm thủ tục",checkinClosed:"Đóng quầy thủ tục",onTime:"Đúng giờ",gateChanged:"Đổi cửa ra máy bay"},
  fil:{ready:"Handa nang sumakay",boarding:"Sumasakay na",final:"Isinasara ang gate",delayed:"Naantala",cancelled:"Kinansela",departed:"Umalis na",checkin:"Check-in",checkinClosed:"Sarado ang check-in",onTime:"Nasa oras",gateChanged:"Nagbago ang gate"},
  id:{ready:"Persiapan naik",boarding:"Sedang naik",final:"Gerbang ditutup",delayed:"Terlambat",cancelled:"Dibatalkan",departed:"Telah berangkat",checkin:"Check-in",checkinClosed:"Check-in ditutup",onTime:"Tepat waktu",gateChanged:"Gerbang berubah"},
  ms:{ready:"Bersedia menaiki",boarding:"Sedang menaiki",final:"Pintu ditutup",delayed:"Lewat",cancelled:"Dibatalkan",departed:"Telah berlepas",checkin:"Daftar masuk",checkinClosed:"Daftar masuk ditutup",onTime:"Tepat pada masa",gateChanged:"Pintu berubah"},
  lo:{ready:"ກຽມຂຶ້ນເຄື່ອງ",boarding:"ກຳລັງຂຶ້ນເຄື່ອງ",final:"ປິດປະຕູຂຶ້ນເຄື່ອງ",delayed:"ຊັກຊ້າ",cancelled:"ຍົກເລີກ",departed:"ອອກເດີນທາງແລ້ວ"},
  km:{ready:"ត្រៀមឡើងយន្តហោះ",boarding:"កំពុងឡើងយន្តហោះ",final:"បិទទ្វារឡើងយន្តហោះ",delayed:"ពន្យារពេល",cancelled:"លុបចោល",departed:"បានចេញដំណើរ"},
  my:{ready:"လေယာဉ်တက်ရန် ပြင်ဆင်",boarding:"လေယာဉ်ပေါ်တက်နေသည်",final:"ဂိတ်ပိတ်နေသည်",delayed:"နောက်ကျ",cancelled:"ပယ်ဖျက်",departed:"ထွက်ခွာပြီး"},
  hi:{ready:"बोर्डिंग की तैयारी",boarding:"बोर्डिंग जारी",final:"गेट बंद",delayed:"विलंबित",cancelled:"रद्द",departed:"प्रस्थान कर चुका"},
  ne:{ready:"बोर्डिङको तयारी",boarding:"बोर्डिङ हुँदैछ",final:"गेट बन्द",delayed:"ढिलाइ",cancelled:"रद्द",departed:"प्रस्थान गरिसकेको"},
  si:{ready:"ගොඩවීමට සූදානම්",boarding:"ගොඩවීම සිදුවේ",final:"ගේට්ටුව වසා ඇත",delayed:"ප්‍රමාදයි",cancelled:"අවලංගුයි",departed:"පිටත් වී ඇත"},
  bn:{ready:"বোর্ডিং প্রস্তুতি",boarding:"বোর্ডিং চলছে",final:"গেট বন্ধ",delayed:"বিলম্বিত",cancelled:"বাতিল",departed:"ছেড়ে গেছে"},
  uz:{ready:"Chiqishga tayyor",boarding:"Samolyotga chiqish",final:"Darvoza yopilmoqda",delayed:"Kechikdi",cancelled:"Bekor qilindi",departed:"Jo‘nab ketdi"},
  kk:{ready:"Отырғызуға дайын",boarding:"Отырғызу жүріп жатыр",final:"Қақпа жабылуда",delayed:"Кешікті",cancelled:"Тоқтатылды",departed:"Ұшып кетті"},
  ky:{ready:"Отургузууга даяр",boarding:"Отургузуу жүрүүдө",final:"Дарбаза жабылууда",delayed:"Кечигүүдө",cancelled:"Жокко чыгарылды",departed:"Учуп кетти"},
  mn:{ready:"Суухад бэлэн",boarding:"Суулт явагдаж байна",final:"Хаалга хаагдаж байна",delayed:"Хойшилсон",cancelled:"Цуцлагдсан",departed:"Хөөрсөн"},
  ar:{ready:"الاستعداد للصعود",boarding:"الصعود إلى الطائرة",final:"إغلاق البوابة",delayed:"متأخرة",cancelled:"ملغاة",departed:"غادرت"},
  tr:{ready:"Binişe hazır",boarding:"Biniş yapılıyor",final:"Kapı kapanıyor",delayed:"Gecikmeli",cancelled:"İptal",departed:"Kalktı"},
  he:{ready:"הכנה לעלייה למטוס",boarding:"עלייה למטוס",final:"סגירת שער",delayed:"בעיכוב",cancelled:"בוטלה",departed:"המריאה"},
  fr:{ready:"Embarquement prochain",boarding:"Embarquement",final:"Porte en fermeture",delayed:"Retardé",cancelled:"Annulé",departed:"Parti"},
  de:{ready:"Boarding vorbereitet",boarding:"Boarding",final:"Gate schließt",delayed:"Verspätet",cancelled:"Annulliert",departed:"Abgeflogen"},
  it:{ready:"Imbarco in preparazione",boarding:"Imbarco",final:"Chiusura gate",delayed:"In ritardo",cancelled:"Cancellato",departed:"Partito"},
  nl:{ready:"Boarding voorbereid",boarding:"Instappen",final:"Gate sluit",delayed:"Vertraagd",cancelled:"Geannuleerd",departed:"Vertrokken"},
  es:{ready:"Embarque próximo",boarding:"Embarcando",final:"Cierre de puerta",delayed:"Retrasado",cancelled:"Cancelado",departed:"Ha salido"},
  cs:{ready:"Příprava nástupu",boarding:"Nástup",final:"Uzavírání brány",delayed:"Zpožděno",cancelled:"Zrušeno",departed:"Odletěl"},
  hu:{ready:"Beszállás előkészítése",boarding:"Beszállás",final:"Kapu zár",delayed:"Késik",cancelled:"Törölve",departed:"Elindult"},
  pl:{ready:"Przygotowanie do wejścia",boarding:"Wejście na pokład",final:"Zamykanie bramki",delayed:"Opóźniony",cancelled:"Odwołany",departed:"Odleciał"},
  fi:{ready:"Valmistautuminen koneeseen",boarding:"Koneeseennousu",final:"Portti sulkeutuu",delayed:"Myöhässä",cancelled:"Peruttu",departed:"Lähtenyt"},
  da:{ready:"Klar til boarding",boarding:"Boarding",final:"Gate lukker",delayed:"Forsinket",cancelled:"Aflyst",departed:"Afgået"},
  no:{ready:"Klar for ombordstigning",boarding:"Ombordstigning",final:"Gate stenger",delayed:"Forsinket",cancelled:"Kansellert",departed:"Avreist"},
  sv:{ready:"Klar för ombordstigning",boarding:"Ombordstigning",final:"Gate stänger",delayed:"Försenad",cancelled:"Inställd",departed:"Avgången"},
  el:{ready:"Προετοιμασία επιβίβασης",boarding:"Επιβίβαση",final:"Κλείσιμο πύλης",delayed:"Καθυστέρηση",cancelled:"Ακυρώθηκε",departed:"Αναχώρησε"},
  pt:{ready:"Preparação para embarque",boarding:"Embarque",final:"Porta a fechar",delayed:"Atrasado",cancelled:"Cancelado",departed:"Partiu"},
  hr:{ready:"Priprema za ukrcaj",boarding:"Ukrcaj",final:"Izlaz se zatvara",delayed:"Kasni",cancelled:"Otkazan",departed:"Poletio"},
  ka:{ready:"ჩასხდომისთვის მზადება",boarding:"ჩასხდომა",final:"გასასვლელი იკეტება",delayed:"დაგვიანებულია",cancelled:"გაუქმებულია",departed:"გაფრინდა"},
};

function canonicalStatus(value: string): StatusKey | null {
  const s = value.trim().toLowerCase();
  if (!s) return null;
  if (/탑승구\s*변경|gate\s*changed?/.test(s)) return "gateChanged";
  if (/수속\s*마감|체크인\s*마감|check.?in\s*(closed|close)/.test(s)) return "checkinClosed";
  if (/수속중|체크인|check.?in/.test(s)) return "checkin";
  if (/마감\s*예정/.test(s)) return "boarding";
  if (/탑승\s*마감|final\s*call|gate\s*(closing|closed)|마감/.test(s)) return "final";
  if (/탑승중|boarding/.test(s)) return "boarding";
  if (/탑승\s*준비|gate\s*open|ready/.test(s)) return "ready";
  if (/결항|cancel/.test(s)) return "cancelled";
  if (/지연|delay/.test(s)) return "delayed";
  if (/^출발(?:\s*완료)?$|departed/.test(s)) return "departed";
  if (/정시|on\s*time/.test(s)) return "onTime";
  return null;
}

export function localeForAirport(airportCode: string): LocalLocale {
  return CODE_LOCALE[airportCode.trim().toUpperCase()] ?? "en";
}

export function localDestinationName(airportCode: string, englishFallback: string) {
  const code = airportCode.trim().toUpperCase();
  return LOCAL_DESTINATION[code] ?? (englishFallback || code || "-");
}

export function localizedStatus(status: string, language: DisplayLanguage, airportCode: string) {
  const key = canonicalStatus(status);
  if (!key) return status;
  if (language === "KO") return KO_STATUS[key] ?? status;
  if (language === "EN") return EN_STATUS[key] ?? status;

  const locale = localeForAirport(airportCode);
  return STATUS_BY_LOCALE[locale]?.[key] ?? EN_STATUS[key] ?? status;
}

export function languageTagForAirport(airportCode: string, language: DisplayLanguage) {
  if (language === "KO") return "ko";
  if (language === "EN") return "en";
  return localeForAirport(airportCode);
}

export function directionForAirport(airportCode: string, language: DisplayLanguage): "ltr" | "rtl" {
  if (language !== "LOCAL") return "ltr";
  const locale = localeForAirport(airportCode);
  return locale === "ar" || locale === "he" ? "rtl" : "ltr";
}
