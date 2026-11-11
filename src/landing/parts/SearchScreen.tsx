import type { ReactNode } from "react";
import { daysFromToday, isoDate } from "./exampleDates";
import { ChevronDown } from "./icons";

interface SearchScreenProps {
  from: string;
  to: string;
  /** Days from today, shown in the app's date field format. */
  days: number;
  /** Ride cards under the Search button. */
  children: ReactNode;
}

// The app's Search Rides screen (from the real app's screenshots), with results under the form.
export function SearchScreen({ from, to, days, children }: SearchScreenProps) {
  return (
    <div className="lp-srch">
      <div className="lp-srch-card">
        <p className="lp-srch-h">Search Rides</p>
        <div className="lp-fld">
          <span>{from}</span>
          <ChevronDown />
        </div>
        <div className="lp-fld">
          <span>{to}</span>
          <ChevronDown />
        </div>
        <div className="lp-fld">
          <span>{isoDate(daysFromToday(days))}</span>
        </div>
        <div className="lp-srch-btn">Search</div>
        {children}
      </div>
    </div>
  );
}
