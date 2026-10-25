export type FlightMode = "departures" | "arrivals";

export type RawKacFlight = Record<string, unknown>;

export type FidsFlight = {
  id: string;
  mode: FlightMode;
  flightId: string;
  masterFlightId: string;
  airline: string;
  airlineEnglish?: string;
  airport: string;
  airportEnglish?: string;
  airportCode: string;
  scheduleDateTime: string;
  estimatedDateTime: string;
  actualDateTime?: string;
  facility: string;
  facilityLabel: "탑승구" | "수하물";
  flightType: "국내선" | "국제선";
  remark: string;
  remarkEnglish?: string;
  codeshare: string;
};

export type FlightsPayload = {
  flights: FidsFlight[];
  mode: FlightMode;
  updatedAt: string;
  source: "kac_odcloud" | "kac_gw" | "kac_homepage" | "demo";
  dataSources: string[];
  query:
    | {
        airportCode: "TAE";
        airportName: "대구";
        searchDate: string;
        searchFrom: string;
        searchTo: string;
      }
    | {
        airport: "TAE";
        date: string;
      };
  warning?: string;
};
