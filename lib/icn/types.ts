export type RawDepartureFlight = {
  fid?: string;
  codeshare?: string;
  codeShare?: string;
  masterFlightId?: string;
  masterflightid?: string;
  masterFlightid?: string;
  flightId?: string;
  airline?: string;
  airport?: string;
  airportCode?: string;
  cityCode?: string;
  typeOfFlight?: string;
  scheduleDateTime?: string;
  scheduleDatetime?: string;
  estimatedDateTime?: string;
  estimatedDatetime?: string;
  chkinRange?: string;
  chkinrange?: string;
  checkin?: string;
  checkIn?: string;
  counter?: string;
  gateNumber?: string;
  gatenumber?: string;
  terminalId?: string;
  remark?: string;
  exitnumber?: string;
  elapsetime?: string;
  firstopover?: string;
  firstopovername?: string;
  secstopover?: string;
  secstopovername?: string;
  thistopover?: string;
  thistopovername?: string;
  tmp1?: string;
  tmp2?: string;
};

export type DepartureFlight = {
  id: string;
  flightId: string;
  masterFlightId: string;
  airline: string;
  /** 인천공항 영문 홈페이지가 제공하는 항공사 영문명(있을 때) */
  airlineEnglish?: string;
  airport: string;
  /** 인천공항 영문 홈페이지가 제공하는 목적지 표기(있을 때) */
  airportEnglish?: string;
  airportCode: string;
  scheduleDateTime: string;
  estimatedDateTime: string;
  checkin: string;
  gate: string;
  terminalId: string;
  terminalLabel: string;
  remark: string;
  /** 인천공항 영문 홈페이지가 제공하는 영문 운항현황(있을 때) */
  remarkEnglish?: string;
  /** 상세 OpenAPI가 제공하는 코드쉐어 구분값 */
  codeshare: string;
};

export type DeparturesPayload = {
  flights: DepartureFlight[];
  updatedAt: string;
  /** homepage가 정상일 때 airport.kr, 장애 시 passenger_api */
  source: "airport.kr" | "passenger_api" | "demo";
  /** 상세 OpenAPI 보강 성공 여부 등 실제 사용 소스 */
  dataSources?: string[];
  query: {
    searchDate: string;
    searchFrom: string;
    searchTo: string;
  };
};

