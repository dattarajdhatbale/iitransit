import type { ReactNode } from "react";
import { daysFromToday, isoDate, shortDate } from "./exampleDates";
import { ChevronDown } from "./icons";

interface SearchScreenProps {
  from: string;
  to: string;
  /** Days from today, shown in the app's date field format. */
  days: number;
  /** Show the app's back button above the card. */
  back?: boolean;
  /** Ride cards, or the empty state, under the Search button. */
  children: ReactNode;
}

// The app's Search Rides screen (from the real app's screenshots), with results under the form.
export function SearchScreen({ from, to, days, back, children }: SearchScreenProps) {
  return (
    <div className="lp-srch">
      {back && (
        <span className="lp-srch-back" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </span>
      )}
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

// The app's "No rides found" state, with the date of the search in its Post button.
export function NoRidesFound({ days }: { days: number }) {
  return (
    <div className="lp-empty">
      <p className="lp-empty-t">No rides found</p>
      <p className="lp-empty-s">Try adjusting your filters or post a ride.</p>
      <span className="lp-empty-btn lp-empty-main">Post a ride for {shortDate(daysFromToday(days))}</span>
      <span className="lp-empty-btn lp-empty-watch">Watch this search</span>
    </div>
  );
}
