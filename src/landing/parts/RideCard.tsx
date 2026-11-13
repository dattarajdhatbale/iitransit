import { useState } from "react";
import { daysFromToday, shortDate } from "./exampleDates";
import { ShareIcon, WhatsAppIcon } from "../../components/icons";

interface RideCardProps {
  from: string;
  to: string;
  /** Days from today; the card shows that date in the app's format. */
  days: number;
  time: string;
  vehicle: string;
  fare?: number;
  seats?: { left: number; total: number };
  note?: string;
  postedBy?: string;
  share?: boolean;
  /** Show Contact works: tapping it turns it into the WhatsApp button, as in the app (no real link). */
  demo?: boolean;
  onReveal?: () => void;
}

// A copy of the app's ride card (src/App.tsx), with made-up example data. Icons are the app's own.
export function RideCard({ from, to, days, time, vehicle, fare, seats, note, postedBy, share, demo, onReveal }: RideCardProps) {
  const [open, setOpen] = useState(false);
  const reveal = () => {
    setOpen(true);
    onReveal?.();
  };

  return (
    <div className="lp-rc">
      <div className="lp-rc-top">
        <span className="lp-rc-route">
          {from} → {to}
        </span>
        <span className="lp-rc-badge">Available</span>
      </div>
      <p className="lp-rc-line">
        {shortDate(daysFromToday(days))} · {time} &nbsp;·&nbsp; {vehicle}
      </p>
      {fare !== undefined && <p className="lp-rc-line">Fare: ₹{fare} total</p>}
      {seats && (
        <p className="lp-rc-line">
          Seats:{" "}
          <strong>
            {seats.left} / {seats.total}
          </strong>{" "}
          available
        </p>
      )}
      {note && <p className="lp-rc-note">"{note}"</p>}
      {postedBy && (
        <div className="lp-rc-foot">
          <div className="lp-rc-left">
            {demo && open ? (
              <span className="lp-rc-wa">
                <WhatsAppIcon className="" />
                WhatsApp
              </span>
            ) : demo ? (
              <button type="button" className="lp-rc-sc" onClick={reveal} aria-label="Show Contact (demo)">
                Show Contact
              </button>
            ) : (
              <span className="lp-rc-sc">Show Contact</span>
            )}
            <span className="lp-rc-posted">Posted by {postedBy}</span>
          </div>
          {share && (
            <span className="lp-rc-share">
              <ShareIcon className="" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
