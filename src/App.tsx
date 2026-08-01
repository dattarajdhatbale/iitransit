// ─────────────────────────────────────────────────────────────────────────────
// src/App.tsx
//
// PURPOSE: UI layer only. No Firestore calls live here — those are in db.ts.
//          No Firebase init lives here — that's in firebase.ts.
//          This file: routes, forms, and what the user sees.
//
// ROUTE MAP
//   /index.html   → Landing page (anyone can see; login prompt for actions)
//   /auth.html    → Sign-in page
//   /post.html    → Post a ride (requires login)
//   /search.html  → Search rides (requires login)
//   /my-rides.html→ Manage your own posts (requires login)
// ─────────────────────────────────────────────────────────────────────────────

import { FormEvent, useEffect, useMemo,useRef, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { auth }                          from "./firebase";
import {
  postRide,
  getActiveFutureRides,
  getMyRides,
  cancelRide,
  setRideAvailability,
  buildDepartureTimestamp,
}                                        from "./db";
import type { Ride, VehicleType }        from "./types";
import { cn }                            from "./utils/cn";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_EMAIL_DOMAIN = "iitbbs.ac.in";

// All five routes the app knows about.
type AppRoute =
  | "/index.html"
  | "/auth.html"
  | "/post.html"
  | "/search.html"
  | "/my-rides.html";

const APP_ROUTES: AppRoute[] = [
  "/index.html",
  "/auth.html",
  "/post.html",
  "/search.html",
  "/my-rides.html",
];

// Redirect key: when we send an unauthenticated user to /auth.html we store
// where they wanted to go so we can send them there after sign-in.
const AUTH_REDIRECT_KEY = "postAuthRedirect";

// ─── LOCATION LISTS ───────────────────────────────────────────────────────────
//  Kept as two separate arrays so the from/to dropdowns can still show both,
//  but it's easier to reason about which side is "campus" vs "transit hub".
const COLLEGE_LOCATIONS = [
  "RHR",
  "BHR",
  "MHR",
  "L-Gate",
  "Main Gate",
] as const;

const TRANSIT_LOCATIONS = [
  "Khurda Road Junction Railway Station",
  "Bhubaneswar Railway Station",
  "Biju Patnaik International Airport",
  "Baramunda ISBT (BSABT)",
] as const;

// Both dropdowns offer all locations so rides can go in either direction.
const ALL_LOCATIONS = [...COLLEGE_LOCATIONS, ...TRANSIT_LOCATIONS];
// Vehicle label map — keeps display names in one place.
const VEHICLE_LABELS: Record<VehicleType, string> = {
  cab:   "Cab (OLA / Uber / etc.)",
  auto:  "Auto-rickshaw",
  car:   "Personal Car",
  other: "Other",
};


// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getLocalDateISO() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function getLocalTimeHHMM() {
  return new Date().toTimeString().slice(0, 5);
}

function normalizePath(pathname: string): AppRoute {
  if (pathname === "/" || pathname === "") return "/index.html";
  if (APP_ROUTES.includes(pathname as AppRoute)) return pathname as AppRoute;
  return "/index.html";
}

// Resolve where to send the user after sign-in.
function resolvePostAuthRoute(): AppRoute {
  const stored = localStorage.getItem(AUTH_REDIRECT_KEY);
  const next   = normalizePath(stored || "/index.html");
  localStorage.removeItem(AUTH_REDIRECT_KEY);
  return next;
}

// Format a Firestore Timestamp into a readable string like "15 Jun · 08:30".
function formatDeparture(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}
// If both locations are campus locations, treat them as interchangeable
// since RHR/BHR/MHR/L-Gate/Main Gate are all walkable from each other.
function locationsMatch(searchLoc: string, rideLoc: string): boolean {
  if (searchLoc === rideLoc) return true;
  const campusSet = new Set(COLLEGE_LOCATIONS as readonly string[]);
  if (campusSet.has(searchLoc) && campusSet.has(rideLoc)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────────────────────────────────────

function BackArrow() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M19 12H5m7 7-7-7 7-7" />
    </svg>
  );
}
function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7 12.9 19c1.8-4.2 6-7 11.1-7 3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4c-7.7 0-14.3 4.4-17.7 10.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3c-2.1 1.6-4.8 2.6-7.3 2.6-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.7 39.5 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 4.7-4 5.4l6.3 5.3C37.2 39 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Back button used on every sub-page.
function BackButton({ onClick, dark }: { onClick: () => void; dark: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mb-8 inline-flex w-fit items-center gap-2 rounded-xl px-6 py-3 text-xl font-medium shadow-md transition-all duration-300",
        dark
          ? "bg-[#1A2540] text-[#F8FAFC] border border-[rgba(255,255,255,0.08)] hover:bg-[#1E2D4A] hover:border-[rgba(139,92,246,0.3)]"
          : "bg-[#a8deef] text-[#1f3145] hover:bg-[#96d5ea]",
      )}
    >
      <BackArrow /> Back
    </button>
  );
}

// A single ride result card — used on both Search and My Rides pages.
function RideCard({
  ride,
  dark,
  showActions = false,
  onCancel,
  onToggleAvailability,
}: {
  ride:                  Ride;
  dark:                  boolean;
  showActions?:          boolean;
  onCancel?:             (id: string) => void;
  onToggleAvailability?: (id: string, current: boolean) => void;
}) {
  const [showContact, setShowContact] = useState(false);
  const isPast      = ride.departureAt.seconds < Timestamp.now().seconds;
  const isCancelled = ride.status === "cancelled";

  // Availability badge
  const availBadge = isCancelled
  ? { label: "Cancelled", cls: dark ? "bg-red-900/40 text-red-400"      : "bg-red-100 text-red-700" }
  : isPast
  ? { label: "Departed",  cls: dark ? "bg-slate-700/40 text-slate-400"  : "bg-slate-100 text-slate-500" }
  : ride.isAvailable
  ? { label: "Available", cls: dark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700" }
  : { label: "Full",      cls: dark ? "bg-amber-900/40 text-amber-400"  : "bg-amber-100 text-amber-700" };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 space-y-2 transition-opacity",
        dark ?  "border-[rgba(255,255,255,0.06)] bg-[#121A2E]" : "border-[#ddd2ea] bg-white/90",
        (isCancelled || isPast) && "opacity-60",
      )}
    >
      {/* Route + badge */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <p className={cn("text-lg font-semibold", dark ? "text-slate-100" : "text-[#383a4e]")}>
          {ride.from} → {ride.to}
        </p>
        <span className={cn("rounded-full px-3 py-0.5 text-sm font-medium", availBadge.cls)}>
          {availBadge.label}
        </span>
      </div>

      {/* Time + vehicle */}
      <p className={cn("text-sm", dark ? "text-slate-300" : "text-[#686978]")}>
        {formatDeparture(ride.departureAt)} &nbsp;·&nbsp; {VEHICLE_LABELS[ride.vehicleType] ?? ride.vehicleType}
      </p>

      {/* Fare */}
      <p className={cn("text-sm", dark ? "text-slate-300" : "text-[#686978]")}>
        Fare: {ride.farePerPerson !== null ? `₹${ride.farePerPerson} per person` : "Contact to discuss"}
      </p>

      {/* Notes (only if non-empty) */}
      {ride.notes && (
        <p className={cn("text-sm italic", dark ? "text-slate-400" : "text-[#888]")}>
          "{ride.notes}"
        </p>
      )}
      {/* Contact — visible to all logged-in users */}
      {showActions ? (
  <p className={cn("text-sm font-medium", dark ? "text-[#CBD5E1]" : "text-[#5a4f72]")}>
    Contact: {ride.contact}
  </p>
) : !showContact ? (
  <button
    type="button"
    onClick={() => setShowContact(true)}
    className={cn(
      "rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
      dark
        ? "bg-[#1A2540] text-[#CBD5E1] border border-[rgba(255,255,255,0.06)] hover:bg-[#1E2D4A] hover:text-[#F8FAFC]"
        : "bg-[#eee6f5] text-[#5a4f72] hover:bg-[#e0d4f0]",
    )}
  >
    Show Contact
  </button>
) : (
  <a
        href={`https://wa.me/91${ride.contact}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-500 transition-all"
  >
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.096.543 4.067 1.496 5.779L0 24l6.389-1.673A11.954 11.954 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.372l-.36-.214-3.724.976.999-3.648-.235-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.58 6.58 2.182 12 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/>
    </svg>
    WhatsApp
  </a>
)}

      {/* Posted by — useful in search results */}
      {!showActions && (
        <p className={cn("text-xs", dark ? "text-slate-500" : "text-slate-400")}>
          Posted by {ride.postedBy.name || ride.postedBy.email}
        </p>
      )}

      {/* Action buttons — only shown on My Rides page */}
      {showActions && !isCancelled && !isPast && (
        <div className="flex gap-3 pt-2 flex-wrap">
          <button
            type="button"
            onClick={() => onToggleAvailability?.(ride.id, ride.isAvailable)}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-semibold transition-all",
              ride.isAvailable
                ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
            )}
          >
            {ride.isAvailable ? "Mark as Full" : "Mark as Available"}
          </button>
          <button
            type="button"
            onClick={() => onCancel?.(ride.id)}
            className="rounded-full px-5 py-2 text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
          >
            Cancel Ride
          </button>
        </div>
      )}
    </div>
  );
}
function SunIconSmall({ active }: { active: boolean }) {
  const color = active ? '#f97316' : '#64748b';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
      style={{ width: 15, height: 15, transition: 'stroke 200ms ease', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" /><path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" /><path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIconSmall({ active }: { active: boolean }) {
  const color = active ? '#3b82f6' : '#64748b';
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2"
      style={{ width: 15, height: 15, transition: 'stroke 200ms ease', flexShrink: 0 }}>
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // ── Routing ────────────────────────────────────────────────────────────────
  const [route, setRoute] = useState<AppRoute>(() =>
    normalizePath(window.location.pathname),
  );

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(
    () => localStorage.getItem("theme") !== "light",
  );

  // ── Auth state ─────────────────────────────────────────────────────────────
  // currentUser is null when logged out, a Firebase User object when logged in.
  // We don't read from localStorage for auth — Firebase handles persistence
  // internally. onAuthStateChanged (below) is the single source of truth.
  const [currentUser,     setCurrentUser]     = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authLoading,      setAuthLoading]      = useState(true);  

  // ── Post Ride form state ───────────────────────────────────────────────────
  const [postMessage, setPostMessage] = useState("");
  const [isPosting,   setIsPosting]   = useState(false);
  const [postDate,    setPostDate]    = useState("");
  const [postFrom,    setPostFrom]    = useState(""); 

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchResults,  setSearchResults]  = useState<Ride[]>([]);
  const [searchMessage,  setSearchMessage]  = useState("");
  const [isSearching,    setIsSearching]    = useState(false);

  // ── My Rides state ─────────────────────────────────────────────────────────
  const [myRides,        setMyRides]        = useState<Ride[]>([]);
  const [myRidesLoading, setMyRidesLoading] = useState(false);
  const [myRidesError,   setMyRidesError]   = useState("");

// Posting : 
const isPostingRef = useRef(false);

const [installPrompt, setInstallPrompt] = useState<any>(null);
useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault();
    setInstallPrompt(e);
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}, []);

const handleInstall = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  const { outcome } = await installPrompt.userChoice;
  if (outcome === "accepted") setInstallPrompt(null);
};

  const todayISO    = getLocalDateISO();
  const minPostTime = postDate === todayISO ? getLocalTimeHHMM() : undefined;
  const isProtected = useMemo(
    () => ["/post.html", "/search.html", "/my-rides.html"].includes(route),
    [route],
  );

  // ── Navigation helper ──────────────────────────────────────────────────────

  const navigate = (target: AppRoute, replace = false) => {
    const path   = normalizePath(target);
    const method = replace ? "replaceState" : "pushState";
    window.history[method](null, "", path);
    setRoute(path);
  };

  const guardedNavigate = (target: AppRoute) => {
    if (!currentUser) {
      localStorage.setItem(AUTH_REDIRECT_KEY, target);
      alert("Please sign in first.");
      navigate("/auth.html");
      return;
    }
    navigate(target);
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // 1. Sync route from browser history (back/forward buttons).
  useEffect(() => {
    const sync = () => setRoute(normalizePath(window.location.pathname));
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  // 2. If an unauthenticated user somehow lands on a protected route, redirect.
  useEffect(() => {
  if (authLoading) return;  // wait for Firebase to resolve session first
  if (isProtected && !currentUser) {
    localStorage.setItem(AUTH_REDIRECT_KEY, route);
    navigate("/auth.html", true);
  }
}, [isProtected, currentUser, route, authLoading]);

  // 3. Dark-mode class on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // 4. Firebase Auth listener — fires on every auth state change.
  //    This replaces ALL the manual localStorage auth tracking from before.
  //    When a user signs in: `user` is a Firebase User object.
  //    When they sign out (or the session expires): `user` is null.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const email = (user.email || "").toLowerCase();
        // Double-check domain even here in case someone manually
        // fiddles with the provider config.
        if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
          signOut(auth);
          alert(`Only @${ALLOWED_EMAIL_DOMAIN} accounts are allowed.`);
          return;
        }
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
      // Stop the "Waiting…" spinner once we know the auth state.
      setIsAuthenticating(false);
      setAuthLoading(false);  
    });

    // Clean up the listener when the component unmounts.
    return unsubscribe;
  }, []);

  // 5. Load My Rides whenever the user navigates to /my-rides.html.
useEffect(() => {
  if (route !== "/my-rides.html" || !currentUser) return;
  loadMyRides();
}, [route, currentUser]);

  useEffect(() => {
  if (route === "/search.html") {
    setSearchResults([]);
    setSearchMessage("");
  }
}, [route]);

  // ── Auth handlers ──────────────────────────────────────────────────────────

  // Google sign-in using Firebase Auth.
  // Firebase pops up the Google account picker, handles the OAuth flow,
  // and calls our onAuthStateChanged listener above with the resulting user.
  // We do NOT need a manual GOOGLE_CLIENT_ID here — Firebase manages that.
  const handleAuth = async () => {
    setIsAuthenticating(true);
    const provider = new GoogleAuthProvider();
    // hd="iitbbs.ac.in" is a *hint* to Google to show iitbbs accounts first.
    // The hard enforcement happens in onAuthStateChanged above.
    provider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN });

    try {
await signInWithPopup(auth, provider);
      // onAuthStateChanged fires next and setCurrentUser is called there.
      // We navigate after auth state settles.
      navigate(resolvePostAuthRoute());
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      // "auth/popup-closed-by-user" just means they closed the window — not an error.
      if (code !== "auth/popup-closed-by-user") {
        alert("Sign-in failed. Please try again.");
      }
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    // onAuthStateChanged fires and sets currentUser to null.
    navigate("/index.html");
  };

  // ── Post Ride handler ──────────────────────────────────────────────────────

  const handlePostRide = async (event: FormEvent<HTMLFormElement>) => {

    if (isPostingRef.current) return;
isPostingRef.current = true;

    event.preventDefault();
    if (!currentUser) return;

    const fd = new FormData(event.currentTarget);

    const fromVal        = String(fd.get("from")          || "").trim();
    const toVal          = String(fd.get("to")            || "").trim();
    const dateVal        = String(fd.get("date")          || "").trim();
    const timeVal        = String(fd.get("time")          || "").trim();
    const vehicleVal     = String(fd.get("vehicleType")   || "cab") as VehicleType;
    const fareStr        = String(fd.get("farePerPerson") || "").trim();
    const contactVal     = String(fd.get("contact")       || "").trim();
    const notesVal       = String(fd.get("notes")         || "").trim();
    // isAvailable checkbox: "on" if checked, null if not
    const isAvailableVal = fd.get("isAvailable") === "on";

    // Validate departure is in the future
    const now       = getLocalDateISO();
    const nowTime   = getLocalTimeHHMM();
    if (
      dateVal < now ||
      (dateVal === now && timeVal < nowTime)
    ) {
      alert("You cannot post a ride in the past.");
      return;
    }

    if (fromVal === toVal) {
      alert("From and To locations cannot be the same.");
      return;
    }

    setIsPosting(true);
    setPostMessage("");

   try {
  const departureAt = buildDepartureTimestamp(dateVal, timeVal);
  await postRide({
    postedBy: {
      uid:   currentUser.uid,
      email: currentUser.email  || "",
      name:  currentUser.displayName || "",
    },
    from:          fromVal,
    to:            toVal,
    date:          dateVal,
    time:          timeVal,
    departureAt,
    vehicleType:   vehicleVal,
    isAvailable:   isAvailableVal,
    farePerPerson: fareStr !== "" ? Number(fareStr) : null,
    contact:       contactVal,
    notes:         notesVal,
    status:        "active",
    createdAt:     Timestamp.now(),
  });
} catch {
  setPostMessage("Failed to post ride. Please check your connection and try again.");
  isPostingRef.current = false;
  setIsPosting(false);
  return;
}

// Firestore write succeeded — cleanup runs outside catch
setPostMessage("Ride posted! Others can now find and contact you.");
setPostDate("");
setPostFrom("");
event.currentTarget.reset();
setTimeout(() => setPostMessage(""), 4000);
isPostingRef.current = false;
setIsPosting(false);

  // ── Search handler ─────────────────────────────────────────────────────────

  const handleSearchRide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);

    const from = String(fd.get("from") || "").trim();
    const to   = String(fd.get("to")   || "").trim();
    const date = String(fd.get("date") || "").trim();

    if (date && date < getLocalDateISO()) {
      setSearchMessage("You cannot search rides for past dates.");
      setSearchResults([]);
      return;
    }

    if (!date) {
  setSearchMessage("Please select a date to search rides.");
  setSearchResults([]);
  return;
}

    const transitSet = new Set(TRANSIT_LOCATIONS as readonly string[]);
    if (!transitSet.has(from) && !transitSet.has(to)) {
  setSearchMessage("Please select at least one transit hub — railway station, airport, or bus terminal.");
  setSearchResults([]);
  return;
    }

    setIsSearching(true);
    setSearchMessage("");
    setSearchResults([]);

    try {
      // Fetch all active future rides from Firestore, then filter client-side.
      // This avoids needing composite Firestore indexes.
      const all = await getActiveFutureRides();

      const matches = all.filter((r) => {
        if (r.status !== "active") return false;  // skip cancelled
        if (from && !locationsMatch(from, r.from)) return false;
        if (to   && !locationsMatch(to,   r.to))   return false;
        if (date && r.date !== date) return false;
        return true;
      });

      setSearchResults(matches);
      setSearchMessage(
        matches.length === 0
          ? "No rides found. Try broadening your search or post one yourself!"
          : `Found ${matches.length} ride${matches.length > 1 ? "s" : ""}.`,
      );
    } catch {
      setSearchMessage("Could not fetch rides. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  // ── My Rides handlers ──────────────────────────────────────────────────────

  const loadMyRides = async () => {
    if (!currentUser) return;
    setMyRidesLoading(true);
    setMyRidesError("");
    try {
      const rides = await getMyRides(currentUser.uid);
      setMyRides(rides);
    } catch {
      setMyRidesError("Could not load your rides. Please check your connection.");
    } finally {
      setMyRidesLoading(false);
    }
  };

  const handleCancelRide = async (rideId: string) => {
    if (!confirm("Cancel this ride? Others won't see it anymore.")) return;
    try {
      await cancelRide(rideId);
      // Update local state immediately — no need to re-fetch.
      setMyRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, status: "cancelled" } : r)),
      );
    } catch {
      alert("Could not cancel. Please try again.");
    }
  };

  const handleToggleAvailability = async (rideId: string, current: boolean) => {
    try {
      await setRideAvailability(rideId, !current);
      setMyRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, isAvailable: !current } : r)),
      );
    } catch {
      alert("Could not update. Please try again.");
    }
  };

  // ── Shared style tokens ────────────────────────────────────────────────────
  const cardBg  = isDark ?"bg-[#121A2E] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-[#f7f4fb]/95 shadow-[#8f75a9]/25";
  const heading = isDark ? "text-[#F8FAFC]" : "text-slate-900";
  const btnMain = isDark ? "bg-[#7C3AED] text-white hover:bg-[#8B5CF6]" : "bg-[#aa82bc] text-white hover:bg-[#9d74b2]";
  const btnCyan = isDark ? "bg-[#2563EB] text-white hover:bg-[#3B82F6]" : "bg-[#a8deef] text-[#1f3145] hover:bg-[#96d5ea]";
  const muted   = isDark ? "text-[#CBD5E1]" : "text-[#5f6170]";

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main
      className={cn(
        "min-h-screen px-4 py-8 transition-colors duration-300 md:px-10",
        isDark
          ? "bg-[#0B1020] text-[#F8FAFC]"
          : "bg-gradient-to-br from-[#d8cfe3] via-[#cfc3dc] to-[#c4b6d6] text-[#242638]",
      )}
    >
      {/* ════════════════════════════════════════════════════════════════════
          HOME PAGE
      ════════════════════════════════════════════════════════════════════ */}
      {route === "/index.html" && (
        <section className="mx-auto flex w-full max-w-6xl animate-rise flex-col">
          <nav className="mb-12 flex items-center justify-between">
            {/* Theme toggle */}
<button
  type="button"
  aria-label="Toggle theme"
  onClick={() => setIsDark((p) => !p)}
  style={{
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: 74,
    height: 36,
    padding: 3,
    borderRadius: 999,
    cursor: 'pointer',
    flexShrink: 0,
    background: isDark ? '#0f172a' : '#e2e8f0',
    border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    transition: 'background 200ms ease, border-color 200ms ease',
  }}
>
  {/* knob — slides left (light) or right (dark) */}
  <span style={{
    position: 'absolute',
    left: 3,
    top: 3,
    width: 30,
    height: 30,
    borderRadius: '50%',
    background: isDark ? '#1e3a5f' : '#ffffff',
    transform: `translateX(${isDark ? '38px' : '0px'})`,
    transition: 'transform 200ms ease, background 200ms ease',
    boxShadow: isDark
      ? '0 0 8px rgba(59,130,246,0.35)'
      : '0 1px 4px rgba(0,0,0,0.15)',
  }} />
  {/* sun — left half */}
  <span style={{
    position: 'relative', zIndex: 1,
    width: 34, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <SunIconSmall active={!isDark} />
  </span>
  {/* moon — right half */}
  <span style={{
    position: 'relative', zIndex: 1,
    width: 34, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    <MoonIconSmall active={isDark} />
  </span>
</button>

            {/* Install App */}
            {installPrompt && (
              <button
                type="button"
                onClick={handleInstall}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-semibold transition-all",
                  isDark
                    ? "bg-[#7C3AED] text-white hover:bg-[#8B5CF6]"
                    : "bg-[#aa82bc] text-white hover:bg-[#9d74b2]",
                )}
              >
                Install App
              </button>
            )}

            {/* Auth area */}
            {currentUser ? (
              <div className="flex items-center gap-3">
                <span className={cn("hidden text-sm font-medium sm:block", muted)}>
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => navigate("/my-rides.html")}
                  className={cn("rounded-full px-4 py-1.5 text-sm font-semibold transition-all", btnMain)}
                >
                  My Rides
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full px-4 py-1.5 text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/auth.html")}
                className={cn("rounded-full px-5 py-2 text-sm font-semibold transition-all", btnMain)}
              >
                Sign In
              </button>
            )}
          </nav>

          <div className="mb-14 text-center">
            <h1 className={cn("mb-5 text-5xl font-black tracking-tight md:text-7xl", heading)}>
              IITransit
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-xl md:text-4xl md:leading-tight">
              Why Pay More? Share a ride with your peers!
            </p>
            
          </div>

          <div className="grid gap-5 pb-5 md:grid-cols-2">
            {[
              { label: "Post a Ride",    sub: "Offer a ride to others",  target: "/post.html"   as AppRoute, accent: btnMain },
              { label: "Search Rides",   sub: "Find available rides",    target: "/search.html" as AppRoute, accent: btnMain },
            ].map(({ label, sub, target, accent }) => (
              <div key={target} className={cn("rounded-3xl p-8 text-center shadow-lg hover:shadow-2xl transition-shadow", cardBg)}>
                <h2 className={cn("mb-2 text-4xl font-semibold", heading)}>{label}</h2>
                <p className={cn("mx-auto mb-7 text-lg md:text-2xl", muted)}>{sub}</p>
                <button
                  type="button"
                  onClick={() => guardedNavigate(target)}
                  className={cn("rounded-full px-8 py-4 text-2xl font-bold transition-all hover:-translate-y-0.5", accent)}
                >
                  {label}
                </button>
              </div>
            ))}
         </div>

          {/* ── Footer ── */}
          <footer className={cn(
            "mt-8 flex items-center justify-between px-4 py-4 border-t",
            isDark
              ? "border-[rgba(255,255,255,0.06)]"
              : "border-[rgba(100,70,130,0.15)]",
          )}>
            {/* Left — empty for balance */}
            <div className="w-32" />

            {/* Center — social icons */}
            <div className="flex items-center gap-5">
              {/* LinkedIn */}
              <a href="https://www.linkedin.com/in/dattarajdhatbale/" target="_blank" rel="noopener noreferrer"
                className={cn("transition-opacity hover:opacity-70",
                  isDark ? "text-[#8B5CF6]" : "text-[#5a3d7a]")}>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>

              {/* GitHub */}
              <a href="https://github.com/dattarajdhatbale" target="_blank" rel="noopener noreferrer"
                className={cn("transition-opacity hover:opacity-70",
                  isDark ? "text-[#8B5CF6]" : "text-[#5a3d7a]")}>
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
              </a>
            </div>

            {/* Right — feedback button */}
            <div className="w-32 flex justify-end">
              
                href="https://docs.google.com/forms/d/e/1FAIpQLSeet-8iazCjxWW6NFBJbTymvL3Grhx_rHKWJCiddUqWogUhWw/viewform"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90",
                  isDark
                    ? "bg-[#7C3AED] text-white"
                    : "bg-[#5a3d7a] text-white",
                )}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                </svg>
                Send Feedback
              </a>
            </div>
          </footer>

        </section>
      )}

      {/* ════ SIGN-IN PAGE ════ */}
      {route === "/auth.html" && (
        <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
          <BackButton onClick={() => navigate("/index.html")} dark={isDark} />
          <div className={cn("mx-auto mt-6 w-full max-w-xl rounded-3xl p-8 text-center shadow-xl md:p-12", cardBg)}>
            <h2 className={cn("mb-8 text-5xl font-bold", heading)}>Sign In</h2>
            <button
              type="button"
              onClick={handleAuth}
              disabled={isAuthenticating}
              className={cn(
                "mx-auto mb-6 inline-flex items-center gap-3 rounded-xl border px-7 py-4 text-xl font-medium transition-all",
                isDark
                  ? "border-[rgba(255,255,255,0.08)] bg-[#1A2540] text-[#F8FAFC] hover:bg-[#1E2D4A] hover:border-[rgba(139,92,246,0.3)]"
                  : "border-[#ddd2ea] bg-white text-[#303247] hover:bg-[#f1ebf8]",
                isAuthenticating && "cursor-not-allowed opacity-60",
              )}
            >
              <GoogleIcon />
              {isAuthenticating ? "Waiting for Google…" : "Sign in with Google"}
            </button>
            <p className={cn("text-lg", muted)}>
              Only <strong>@{ALLOWED_EMAIL_DOMAIN}</strong> accounts are accepted.
            </p>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          POST A RIDE
      ════════════════════════════════════════════════════════════════════ */}
      {route === "/post.html" && (
        <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
          <BackButton onClick={() => navigate("/index.html")} dark={isDark} />
          <div className={cn("mx-auto w-full max-w-2xl rounded-3xl p-8 shadow-xl md:p-10", cardBg)}>
            <h2 className={cn("mb-7 text-center text-5xl font-bold", heading)}>Post a Ride</h2>

            <form className="space-y-4" onSubmit={handlePostRide}>
              {/* ── From ── */}
           <select name="from" required defaultValue="" className="field-input"
  onChange={e => { setPostFrom(e.target.value); }}>
  <option value="" disabled>Select departure location</option>
  <optgroup label="Campus">
    {COLLEGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
  </optgroup>
  <optgroup label="Transit Hubs">
    {TRANSIT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
  </optgroup>
</select>

              {/* ── To ── */}
              <select name="to" required defaultValue="" className="field-input">
  <option value="" disabled>Select destination</option>
  {(COLLEGE_LOCATIONS.includes(postFrom as any)
    ? TRANSIT_LOCATIONS
    : postFrom !== ""
    ? COLLEGE_LOCATIONS
    : ALL_LOCATIONS
  ).map(l => <option key={l} value={l}>{l}</option>)}
</select>

              {/* ── Date ── */}
              <input
                name="date" type="date" min={todayISO} required
                className="field-input"
                onChange={(e) => setPostDate(e.target.value)}
              />

              {/* ── Time — specific departure time ── */}
              <input
                name="time" type="time" min={minPostTime} required
                className="field-input"
                placeholder="Departure time"
                 defaultValue={getLocalTimeHHMM()}
              />

              {/* ── Vehicle type ── */}
              <select name="vehicleType" required defaultValue="" className="field-input">
                <option value="" disabled>Select vehicle type</option>
                {(Object.entries(VEHICLE_LABELS) as [VehicleType, string][]).map(
                  ([val, label]) => <option key={val} value={val}>{label}</option>
                )}
              </select>

              {/* ── Is Available checkbox ── */}
              <label className={cn("flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer select-none",
                isDark ? "bg-slate-800 text-slate-200" : "bg-white/80 text-[#303247]")}>
                <input
                  type="checkbox"
                  name="isAvailable"
                  defaultChecked
                  className="h-5 w-5 accent-purple-500"
                />
                <span className="text-base font-medium">Seats still available</span>
                <span className={cn("ml-auto text-sm", muted)}>(uncheck if full)</span>
              </label>

              {/* ── Fare per person ── */}
              <input
                name="farePerPerson" type="number" min="0"
                placeholder="Fare per person (₹) — leave blank to discuss"
                className="field-input"
              />

              {/* ── Contact ── */}
              <input
                name="contact" type="tel" required
                  placeholder="WhatsApp / phone number"
                   className="field-input"
                   pattern="[6-9][0-9]{9}"
                   title="Enter a valid 10-digit Indian mobile number"
                     maxLength={10}
                       onKeyDown={(e) => {
                    if (!/[0-9]|Backspace|Delete|ArrowLeft|ArrowRight|Tab/.test(e.key)) {
                    e.preventDefault();
                     }
                    }}
              />

              {/* ── Notes ── */}
              <textarea
                name="notes"
                rows={3}
                placeholder="Any notes? e.g. 'Flexible by 15 min', 'Have luggage', 'Only for female students', 'Train details'..."
                className="field-input resize-none"
              />

              <button
  type="submit"
  disabled={isPosting}
  className={cn(
    "w-full rounded-full px-7 py-4 text-xl font-semibold transition-all",
    btnMain,
    isPosting
      ? "opacity-60 cursor-not-allowed"
      : "hover:-translate-y-0.5",
  )}
>
  {isPosting ? (
    <span className="inline-flex items-center justify-center gap-2">
      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10"
          stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor"
          d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      Posting…
    </span>
  ) : "Post Ride"}
</button>

            </form>

            {postMessage && (
              <p className={cn("mt-5 text-center text-lg font-medium",
                postMessage.startsWith("Failed") ? "text-red-500" : "text-emerald-500")}>
                {postMessage}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          SEARCH RIDES
      ════════════════════════════════════════════════════════════════════ */}
      {route === "/search.html" && (
        <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
          <BackButton onClick={() => navigate("/index.html")} dark={isDark} />
          <div className={cn("mx-auto w-full max-w-2xl rounded-3xl p-8 shadow-xl md:p-10", cardBg)}>
            <h2 className={cn("mb-7 text-center text-5xl font-bold", heading)}>Search Rides</h2>

            <form className="space-y-4" onSubmit={handleSearchRide}>
              <select name="from" defaultValue="" className="field-input">
                <option value="">Any departure location</option>
                <optgroup label="Campus">
                  {COLLEGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </optgroup>
                <optgroup label="Transit Hubs">
                  {TRANSIT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </optgroup>
              </select>
              <select name="to" defaultValue="" className="field-input">
                <option value="">Any destination</option>
                <optgroup label="Campus">
                  {COLLEGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </optgroup>
                <optgroup label="Transit Hubs">
                  {TRANSIT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                </optgroup>
              </select>
              <input name="date" type="date" min={todayISO} required  className="field-input" />

              <button
                type="submit"
                disabled={isSearching}
                className={cn("w-full rounded-full px-7 py-4 text-xl font-semibold transition-all hover:-translate-y-0.5",
                  btnMain, isSearching && "opacity-60 cursor-not-allowed")}
              >
                {isSearching ? "Searching…" : "Search"}
              </button>
            </form>

            {searchMessage && (
            <div className="mt-6 text-center space-y-3">
             <p className={cn("text-xl", muted)}>{searchMessage}</p>
             {searchResults.length === 0 && !isSearching && searchMessage.startsWith("No rides") && (
             <div className="space-y-2">
               <p className={cn("text-sm", muted)}>Be the first to post one.</p>
                 <button
          type="button"
          onClick={() => navigate("/post.html")}
          className={cn("rounded-full px-6 py-2 text-sm font-semibold transition-all", btnMain)}
        >
          Post Ride
        </button>
      </div>
    )}
  </div>
)}

            {searchResults.length > 0 && (
              <div className="mt-6 space-y-4">
                {searchResults.map((ride) => (
                  <RideCard key={ride.id} ride={ride} dark={isDark} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MY RIDES
      ════════════════════════════════════════════════════════════════════ */}
      {route === "/my-rides.html" && (
        <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
          <BackButton onClick={() => navigate("/index.html")} dark={isDark} />
          <div className={cn("mx-auto w-full max-w-2xl rounded-3xl p-8 shadow-xl md:p-10", cardBg)}>
            <div className="mb-7 flex items-center justify-between gap-4">
              <h2 className={cn("text-4xl font-bold", heading)}>My Rides</h2>
              <button
                type="button"
                onClick={loadMyRides}
                disabled={myRidesLoading}
                className={cn("rounded-full px-5 py-2 text-sm font-semibold transition-all", btnCyan,
                  myRidesLoading && "opacity-60 cursor-not-allowed")}
              >
                {myRidesLoading ? "Loading…" : "Refresh"}
              </button>
            </div>

            {myRidesError && (
              <p className="text-red-500 text-center mb-4">{myRidesError}</p>
            )}

            {!myRidesLoading && myRides.length === 0 && !myRidesError && (
              <p className={cn("text-center text-lg", muted)}>
                You haven't posted any rides yet.
              </p>
            )}

            {(() => {
  const now = Timestamp.now().seconds;
  const future = myRides.filter(r => r.departureAt.seconds >= now && r.status !== "cancelled");
  const past   = myRides.filter(r => r.departureAt.seconds <  now || r.status === "cancelled");

  return (
    <div className="space-y-6">
      {future.length > 0 && (
        <div className="space-y-4">
          <p className={cn("text-xs font-semibold uppercase tracking-widest", muted)}>
            Upcoming
          </p>
          {future.map((ride) => (
            <RideCard key={ride.id} ride={ride} dark={isDark} showActions
              onCancel={handleCancelRide}
              onToggleAvailability={handleToggleAvailability} />
          ))}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-4">
          {future.length > 0 && (
            <div className={cn("border-t pt-4", isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#ddd2ea]")} />
          )}
          <p className={cn("text-xs font-semibold uppercase tracking-widest", muted)}>
            Past & Cancelled
          </p>
          {past.map((ride) => (
            <RideCard key={ride.id} ride={ride} dark={isDark} showActions
              onCancel={handleCancelRide}
              onToggleAvailability={handleToggleAvailability} />
          ))}
        </div>
      )}
      {myRides.length === 0 && (
        <p className={cn("text-center text-lg", muted)}>
          You haven't posted any rides yet.
        </p>
      )}
    </div>
  );
})()}
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
