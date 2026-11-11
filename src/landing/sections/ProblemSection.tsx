import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { Highlight } from "../parts/Highlight";
import { Phone, StatusBar } from "../parts/Phone";
import { RideCard } from "../parts/RideCard";
import { SearchScreen } from "../parts/SearchScreen";

// 1. The problem: a ride request buried in the batch group, next to the same morning on IITransit.
// Names are made up; the phones are decorative (the copy carries the meaning).
export default function ProblemSection() {
  return (
    <section className="lp-sec" aria-labelledby="lp-problem-title">
      <div className="lp-wrap lp-problem">
        <div className="lp-copy" data-reveal>
          <h2 className="lp-display" id="lp-problem-title">
            Stop scrolling the batch group for a <Highlight>ride.</Highlight>
          </h2>
          <p className="lp-lede">
            Someone asks who's going to the station at 6. Forty memes later, nobody remembers. On IITransit the ride stays put,
            with the time, the fare and the seats left.
          </p>
          <div className="lp-actions">
            <Link className="lp-btn lp-btn-accent" to="/app">
              Open App
            </Link>
            <a className="lp-textlink" href="#how">
              See how it works <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <div className="lp-duo">
          <div className="lp-duo-1" data-reveal style={{ "--i": 1 } as CSSProperties}>
            <Phone tone="invert">
              <div className="lp-screen lp-wa">
                <StatusBar time="23:42" />
                <div className="lp-wa-head">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                  <span className="lp-wa-av">B'27</span>
                  <span className="lp-wa-title">
                    <b>B.Tech '27</b>
                    <span>Aarav, Ishita, Rohan, Sneha, +210</span>
                  </span>
                  <span className="lp-wa-icons">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="6" width="14" height="12" rx="2" />
                      <path d="M16 10l6-3v10l-6-3" />
                    </svg>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </span>
                </div>
                <div className="lp-wa-feed" data-play="chat">
                  <Msg i={0} from="Sneha" color="--wa-n4" time="20:41" text="anyone has a spare charger in BHR" />
                  <Msg i={0} out time="20:44" text="ask at the canteen" />
                  <Msg i={0} from="Aarav" color="--wa-n2" time="21:08" text="anyone going to BBS tmrw morning? 6ish, 2 bags" />
                  <div className="lp-wa-unread" style={{ "--i": 1 } as CSSProperties}>
                    38 unread messages
                  </div>
                  <Msg i={2} from="Ishita" color="--wa-n1" time="23:31" text="mess menu for tomorrow 👇 not again" />
                  <Msg i={3} from="Rohan" color="--wa-n3" time="23:36" text="who has the DSA assignment pdf" />
                  <Msg i={4} cont time="23:36" text="pls 🙏" />
                  <Msg i={5} from="Sneha" color="--wa-n4" time="23:39" text="😂😂😂" />
                  <Msg i={6} out time="23:42" text="is anyone still going to the station at 6?" />
                </div>
                <div className="lp-wa-input">
                  <span>Message</span>
                  <i>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-2.1a7 7 0 0 0 6-6.9z" />
                    </svg>
                  </i>
                </div>
              </div>
            </Phone>
          </div>

          <div className="lp-duo-2" data-reveal>
            <Phone tone="invert">
              <div className="lp-screen">
                <StatusBar time="23:42" />
                <SearchScreen from="RHR" to="Bhubaneswar Railway Station" days={1}>
                  <RideCard
                    from="RHR"
                    to="Bhubaneswar Railway Station"
                    days={1}
                    time="06:10"
                    vehicle="Cab (OLA / Uber / etc.)"
                    fare={420}
                    seats={{ left: 2, total: 3 }}
                    note="2 bags, can fit one more"
                    postedBy="AARAV MEHTA"
                    share
                  />
                  <RideCard from="MHR" to="Bhubaneswar Railway Station" days={1} time="06:30" vehicle="Auto-rickshaw" fare={300} />
                </SearchScreen>
              </div>
            </Phone>
          </div>
        </div>
      </div>
    </section>
  );
}

interface MsgProps {
  i: number;
  text: string;
  time: string;
  from?: string;
  color?: string;
  out?: boolean;
  cont?: boolean;
}

function Msg({ i, text, time, from, color, out, cont }: MsgProps) {
  const cls = `lp-msg${out ? " lp-msg-out" : ""}${cont ? " lp-msg-cont" : ""}`;
  return (
    <div className={cls} style={{ "--i": i } as CSSProperties}>
      {from && <b style={{ color: `var(${color})` }}>{from}</b>}
      {text}
      <time>
        {time} {out && <span className="lp-tick">✓✓</span>}
      </time>
    </div>
  );
}
