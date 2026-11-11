import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Highlight } from "../parts/Highlight";
import { FINISH_EVENT, PLAY_EVENT } from "../useLandingMotion";

const ROWS = [
  { code: "BBS", name: "Bhubaneswar Railway Station", kind: "Train" },
  { code: "KUR", name: "Khurda Road Junction", kind: "Train" },
  { code: "BBI", name: "Biju Patnaik International Airport", kind: "Flight" },
  { code: "ISBT", name: "Baramunda Bus Terminal", kind: "Bus" },
];
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const clockText = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

// 2. Where to: a departures board for the four places students leave campus for.
// When it scrolls in (Motion ON), the rows flip in and the codes shuffle like a split-flap board.
export default function DestinationsSection() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [codes, setCodes] = useState(() => ROWS.map((row) => row.code));
  const [clock, setClock] = useState(() => clockText(new Date()));

  useEffect(() => {
    const timer = window.setInterval(() => setClock(clockText(new Date())), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    let timer = 0;
    const settle = () => {
      window.clearInterval(timer);
      setCodes(ROWS.map((row) => row.code));
    };
    const shuffle = () => {
      let tick = 0;
      window.clearInterval(timer);
      timer = window.setInterval(() => {
        tick += 1;
        // Each code settles a little after the one above it, letter by letter.
        setCodes(
          ROWS.map((row, r) =>
            row.code
              .split("")
              .map((ch, c) => (tick > 6 + c * 2 + r * 2 ? ch : LETTERS[(Math.random() * LETTERS.length) | 0]))
              .join(""),
          ),
        );
        if (tick > 6 + 4 * 2 + ROWS.length * 2) settle();
      }, 45);
    };
    board.addEventListener(PLAY_EVENT, shuffle);
    board.addEventListener(FINISH_EVENT, settle);
    return () => {
      board.removeEventListener(PLAY_EVENT, shuffle);
      board.removeEventListener(FINISH_EVENT, settle);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="lp-sec" style={{ paddingTop: 0 }} aria-labelledby="lp-where-title">
      <div className="lp-wrap lp-where">
        <div className="lp-board" ref={boardRef} data-reveal data-play="board" role="table" aria-label="Destinations">
          <div className="lp-board-top" role="row">
            <span role="columnheader">Departures from campus</span>
            <span className="lp-board-clock" aria-hidden="true">
              {clock}
            </span>
          </div>
          {ROWS.map((row, i) => (
            <div className="lp-board-row" role="row" key={row.code} style={{ "--i": i } as CSSProperties}>
              <span className="lp-board-code" role="cell" aria-label={row.code}>
                {codes[i]}
              </span>
              <span className="lp-board-name" role="cell">
                {row.name}
              </span>
              <span className="lp-board-kind" role="cell">
                {row.kind}
              </span>
            </div>
          ))}
        </div>
        <div className="lp-copy" data-reveal style={{ "--i": 1 } as CSSProperties}>
          <h2 className="lp-h2" id="lp-where-title">
            Both stations, the airport and <Highlight stroke={1}>Baramunda.</Highlight>
          </h2>
          <p className="lp-lede">
            The four places everyone leaves campus for. Going home for the weekend, catching a flight, or getting to Khurda Road
            for the late train.
          </p>
        </div>
      </div>
    </section>
  );
}
