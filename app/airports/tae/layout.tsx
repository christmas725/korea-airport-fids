import AirlineLogoSync from "@/components/fids/AirlineLogoSync";
import "./tae.css";
import "./mobile.css";
import "./foldable.css";
import "../fids-common.css";
import "./clock.css";
import "./airline-copy.css";
import "../airline-logo.css";

export default function TaeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AirlineLogoSync />
      {children}
    </>
  );
}
