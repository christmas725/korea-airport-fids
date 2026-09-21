import AirportDirectory from "@/components/AirportDirectory";
import { getInitialAirportStatuses } from "@/lib/fids/serverAirportStatuses";

export default async function Home() {
  const initialStatuses = await getInitialAirportStatuses(650);
  return <AirportDirectory initialStatuses={initialStatuses} />;
}
