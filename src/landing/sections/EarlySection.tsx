import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ShareIcon } from "../../components/icons";
import { Highlight } from "../parts/Highlight";
import { BellIcon } from "../parts/icons";
import { Phone, StatusBar } from "../parts/Phone";
import { NoRidesFound, SearchScreen } from "../parts/SearchScreen";
import { usePlayEvents } from "../parts/usePlayEvents";

const SHARE_EXAMPLE = "iitransit.vercel.app/search?id=7Hq2xK";

// 4. Nobody going yet: the app's "No rides found" screen (built from its styles, so the date stays
// current) with the bell's match, then three tiles for the smaller features. Each tile's picture
// plays once when it scrolls in (Motion ON).
export default function EarlySection() {
  return (
    <section className="lp-sec" aria-labelledby="lp-early-title">
      <div className="lp-wrap lp-early">
        <div className="lp-copy" data-reveal>
          <h2 className="lp-h2" id="lp-early-title">
            Nobody going yet? You're{"\u00a0"}<Highlight stroke={2}>early.</Highlight>
          </h2>
          <p className="lp-lede">
            Post the ride yourself in one tap, with the route and date already filled in. Or watch the search, and the bell
            lights up when someone posts a match.
          </p>
        </div>
        <div className="lp-early-vis" data-reveal data-play="bell" style={{ "--i": 1 } as CSSProperties}>
          <Phone tone="invert">
            <div className="lp-screen">
              <StatusBar time="20:15" />
              <SearchScreen from="MHR" to="Khurda Road Junction Railway Station" days={3} back>
                <NoRidesFound days={3} />
              </SearchScreen>
            </div>
          </Phone>
          <span className="lp-chip-float lp-notif" aria-hidden="true">
            <span className="lp-notif-bell">
              <BellIcon size={18} />
              <em />
            </span>
            A matching ride was just posted.
          </span>
        </div>
      </div>

      <div className="lp-wrap">
        <div className="lp-bento">
          <LinkTile />
          <SeatsTile />
          <div className="lp-tile" data-reveal style={{ "--i": 2 } as CSSProperties}>
            <div className="lp-tile-vis" aria-hidden="true">
              <div className="lp-home">
                <i />
                <i />
                <i />
                <i />
                <i />
                <span className="lp-home-me">
                  <img src="/icon-192.png" width={40} height={40} alt="" loading="lazy" decoding="async" />
                </span>
                <i />
                <i />
              </div>
            </div>
            <h3 className="lp-h3">Install it</h3>
            <p>Add it to your home screen on Android or desktop. It updates itself.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Tapping the link really copies the site's address; the toast plays again each time.
function LinkTile() {
  const [toastKey, setToastKey] = useState(0);
  const copy = () => {
    try {
      void navigator.clipboard?.writeText("https://iitransit.vercel.app").catch(() => {});
    } catch {
      // Clipboard not available (old browser, insecure context): the toast still plays.
    }
    setToastKey((k) => k + 1);
  };

  return (
    <div className="lp-tile" data-reveal data-play="toast" style={{ "--i": 0 } as CSSProperties}>
      <div className="lp-tile-vis">
        <button type="button" className="lp-linkchip" onClick={copy} aria-label="Copy the IITransit link">
          <ShareIcon className="" />
          <span>{SHARE_EXAMPLE}</span>
        </button>
        <span className="lp-toast" key={toastKey} data-replay={toastKey > 0 || undefined} aria-live="polite">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12l5 5L20 7" />
          </svg>
          Link copied
        </span>
      </div>
      <h3 className="lp-h3">Send a ride as a link</h3>
      <p>The share button gives you a link that opens the app straight on that ride.</p>
    </div>
  );
}

// Seats go 3 → 2 → 1 as people join, then the app's reminder shows (the real nudge text).
function SeatsTile() {
  const ref = useRef<HTMLDivElement>(null);
  const [seats, setSeats] = useState(1);
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  usePlayEvents(ref, {
    onArm: () => {
      clear();
      setSeats(3);
    },
    onPlay: () => {
      clear();
      timers.current.push(window.setTimeout(() => setSeats(2), 700), window.setTimeout(() => setSeats(1), 1300));
    },
    onFinish: () => {
      clear();
      setSeats(1);
    },
  });
  useEffect(() => clear, []);

  return (
    <div className="lp-tile" ref={ref} data-reveal data-play="seats" style={{ "--i": 1 } as CSSProperties}>
      <div className="lp-tile-vis" aria-hidden="true">
        <div className="lp-seats">
          <div className="lp-seat-row">
            <span>
              Seats: <strong>{seats} / 3</strong> available
            </span>
            <span className="lp-dots">
              {[0, 1, 2].map((i) => (
                <i key={i} className={i < 3 - seats ? "lp-taken" : undefined} />
              ))}
            </span>
          </div>
          <div className="lp-nudge">Contact info viewed 2 times. Mark as full to stop messages.</div>
        </div>
      </div>
      <h3 className="lp-h3">Keep your seats right</h3>
      <p>Change the seats left as people join. If someone just took your number, the app reminds you.</p>
    </div>
  );
}
