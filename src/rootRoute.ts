// Decides what the top-level URL shows. Kept apart from Root.tsx so the rules can be tested.
//
//   /               the landing page; skipped (straight to /app) for returning users and installed apps
//   /about          the landing page, always
//   /intro-preview  old preview link, now /about
//   anything else   the app (/app, /post, /search, /alerts, /profile, /auth and its own fallback)

export type RootRoute =
  | { show: "landing" }
  | { show: "app" }
  | { redirect: "/about" | "/app"; keepHash: boolean };

export interface RootRouteInput {
  pathname: string;
  hash: string;
  /** True until the visit moves on from the page it opened on (Back to it later is not first). */
  firstPage: boolean;
  /** Returning user or installed app. Only asked when it matters. */
  skipLanding: () => boolean;
}

export function rootRoute({ pathname, hash, firstPage, skipLanding }: RootRouteInput): RootRoute {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/intro-preview") return { redirect: "/about", keepHash: true };

  if (path === "/") {
    // Skip the page only when "/" opens the visit: pressing Back from the app to "/" shows it
    // instead of bouncing straight back. A link to a section (/#how, /#faq) asks for the page.
    if (firstPage && !hash && skipLanding()) return { redirect: "/app", keepHash: false };
    return { show: "landing" };
  }

  if (path === "/about") return { show: "landing" };
  return { show: "app" };
}
