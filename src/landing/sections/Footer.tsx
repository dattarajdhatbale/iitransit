import { Link } from "react-router-dom";
import { ArtPin } from "../parts/icons";
import { FEEDBACK_FORM_URL, LINKEDIN_URL } from "../parts/links";

export default function Footer() {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap">
        <div className="lp-foot-route" aria-hidden="true">
          <span />
          <ArtPin />
        </div>
        <div className="lp-foot">
          <div className="lp-foot-brand">
            <span className="lp-wordmark">IITransit</span>
            <p>Ride-sharing for IIT Bhubaneswar students.</p>
          </div>
          <nav className="lp-foot-col" aria-label="Product">
            <span className="lp-foot-label">Product</span>
            <Link className="lp-btn lp-btn-accent lp-foot-open" to="/app">
              Open App
            </Link>
            <a href="#how">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <nav className="lp-foot-col" aria-label="Connect">
            <span className="lp-foot-label">Connect</span>
            <a href={FEEDBACK_FORM_URL} target="_blank" rel="noopener noreferrer">
              Send feedback <span aria-hidden="true">↗</span>
            </a>
            <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
              LinkedIn <span aria-hidden="true">↗</span>
            </a>
          </nav>
          <p className="lp-foot-base">© {new Date().getFullYear()} IITransit</p>
        </div>
      </div>
    </footer>
  );
}
