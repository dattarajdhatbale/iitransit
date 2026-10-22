// ─────────────────────────────────────────────────────────────────────────────
// src/App.tsx
//
// PURPOSE: UI layer only. No Firestore calls live here — those are in db.ts.
//          No Firebase init lives here — that's in firebase.ts.
//          This file: routes, forms, and what the user sees.
//
// ROUTE MAP
//   /         → Landing page (anyone can see; login prompt for actions)
//   /auth     → Sign-in page
//   /post     → Post a ride (requires login)
//   /search   → Search rides (requires login)
//   /profile  → User profile and rides (requires login)
//   /my-rides → Redirects to /profile
// ─────────────────────────────────────────────────────────────────────────────

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  type User,
} from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { auth } from "./firebase";
import {
  postRide,
  getRidesByDate,
  getMyRides,
  cancelRide,
  setRideAvailability,
  updateAvailableSeats,
  buildDepartureTimestamp,
  getSharedRide,
  incrementContactClicks,
  getUserProfile,
  saveUserContact,
  getUserAlerts,
  createRideAlert,
  deleteRideAlert,
  markAlertRidesSeen,
  type UserProfile,
} from "./db";
import { Avatar } from "./components/Avatar";
import {
  BackArrow,
  GoogleIcon,
  SunIconSmall,
  MoonIconSmall,
  WhatsAppIcon,
  ShareIcon,
  ChevronDownIcon,
  RefreshIcon,
  SpinnerIcon,
  Linkedin,
  FeedbackIcon,
  BellIcon,
  TrashIcon,
} from "./components/icons";
import {
  COLLEGE_LOCATIONS,
  TRANSIT_LOCATIONS,
  locationsMatch,
  MAX_ALERTS,
  MAX_SEEN_IDS,
  ALERT_COOLDOWN_MS,
  buildAlertId,
  isRideEligibleForAlert,
  getUnreadRideIds,
  type RideAlert,
} from "./utils/alertUtils";
import { syncTimeOffset, getTrueTime } from "./utils/timeUtils";
import type { Ride, VehicleType } from "./types";
import { cn } from "./utils/cn";
import {
  CONTACT_REGEX,
  sanitizeDigits,
  partitionRides,
  paginate,
} from "./utils/profileUtils";
import { Pagination } from "./components/Pagination";

declare const showToast: any;

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const ALLOWED_EMAIL_DOMAIN = "iitbbs.ac.in";
const SEARCH_PAGE_SIZE = 6;

// Both dropdowns offer all locations so rides can go in either direction.
const ALL_LOCATIONS = [...COLLEGE_LOCATIONS, ...TRANSIT_LOCATIONS];
// Vehicle label map — keeps display names in one place.
const VEHICLE_LABELS: Record<VehicleType, string> = {
  cab: "Cab (OLA / Uber / etc.)",
  auto: "Auto-rickshaw",
  car: "Personal Car",
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

// Format a Firestore Timestamp into a readable string like "15 Jun · 08:30".
function formatDeparture(ts: Timestamp): string {
  const d = ts.toDate();
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
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
      aria-label="Back"
      className={cn(
        "mb-8 inline-flex w-fit items-center justify-center rounded-xl p-3 text-xl font-medium shadow-md transition-all duration-300",
        dark
          ? "bg-[#1A2540] text-[#F8FAFC] border border-[rgba(255,255,255,0.08)] hover:bg-[#1E2D4A] hover:border-[rgba(139,92,246,0.3)]"
          : "bg-[#a8deef] text-[#1f3145] hover:bg-[#96d5ea]",
      )}
    >
      <BackArrow />
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
  onUpdateSeats,
  onShare,
  highlight,
  onContactReveal,
}: {
  ride: Ride;
  dark: boolean;
  showActions?: boolean;
  onCancel?: (id: string) => void;
  onToggleAvailability?: (id: string, current: boolean) => void;
  onUpdateSeats?: (id: string, newSeats: number) => void;
  onShare?: (ride: Ride) => void;
  highlight?: boolean;
  onContactReveal?: (ride: Ride) => void;
}) {
  const [showContact, setShowContact] = useState(false);
  const [isHighlighted, setIsHighlighted] = useState(false);

  useEffect(() => {
    if (highlight) setIsHighlighted(true);
  }, [highlight]);

  const isPast = ride.departureAt.seconds < Timestamp.now().seconds;
  const isCancelled = ride.status === "cancelled";

  // Availability badge
  const hasSeatData = ride.totalSeats !== undefined && ride.availableSeats !== undefined;
  const derivedIsAvailable = hasSeatData ? ride.availableSeats! > 0 : ride.isAvailable;

  const availBadge = isCancelled
    ? { label: "Cancelled", cls: dark ? "bg-red-900/40 text-red-400" : "bg-red-100 text-red-700" }
    : isPast
      ? { label: "Departed", cls: dark ? "bg-slate-700/40 text-slate-400" : "bg-slate-100 text-slate-500" }
      : derivedIsAvailable
        ? { label: "Available", cls: dark ? "bg-emerald-900/40 text-emerald-400" : "bg-emerald-100 text-emerald-700" }
        : { label: "Full", cls: dark ? "bg-amber-900/40 text-amber-400" : "bg-amber-100 text-amber-700" };

  return (
    <div
      id={`ride-${ride.id}`}
      className={cn(
        "rounded-2xl border p-5 space-y-2 transition-opacity",
        dark ? "border-[rgba(255,255,255,0.06)] bg-[#121A2E]"
          : "border-[#ddd2ea] bg-white/90",
        (isCancelled || isPast) && "opacity-60",
        isHighlighted && "ride-highlight",
      )}
      onAnimationEnd={() => setIsHighlighted(false)}
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
        Fare: {ride.farePerPerson !== null ? `₹${ride.farePerPerson} total` : "Contact to discuss"}
      </p>

      {/* Seat Availability */}
      {hasSeatData && (
        <p className={cn("text-sm", dark ? "text-slate-300" : "text-[#686978]")}>
          Seats: <strong className={dark ? "text-slate-100" : "text-slate-900"}>{ride.availableSeats} / {ride.totalSeats}</strong> available
        </p>
      )}

      {/* Notes (only if non-empty) */}
      {ride.notes && (
        <p className={cn("text-sm italic", dark ? "text-slate-400" : "text-[#888]")}>
          "{ride.notes}"
        </p>
      )}

      {/* Bottom section: Contact block on left, Share button on right */}
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          {showActions ? (
            <p className={cn("text-sm font-medium", dark ? "text-[#CBD5E1]" : "text-[#5a4f72]")}>
              Contact: {ride.contact}
            </p>
          ) : !showContact ? (
            <button
              type="button"
              onClick={() => {
                setShowContact(true);
                if (!showActions) {
                  onContactReveal?.(ride);
                }
              }}
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
              href={`https://wa.me/91${ride.contact}?text=${encodeURIComponent(`Hi, I saw your ride on IITransit from ${ride.from} to ${ride.to} on ${ride.date}. Is it still available?`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-500 transition-all"
            >
              <WhatsAppIcon />
              WhatsApp
            </a>
          )}

          {!showActions && (
            <p className={cn("text-xs", dark ? "text-slate-500" : "text-slate-400")}>
              Posted by {ride.postedBy.name || ride.postedBy.email}
            </p>
          )}
        </div>

        {onShare && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onShare(ride);
            }}
            aria-label="Share ride"
            className={cn(
              "rounded-full p-1.5 transition-all hover:opacity-80",
              dark ? "text-slate-400 hover:text-slate-200"
                : "text-slate-500 hover:text-slate-700",
            )}
          >
            <ShareIcon />
          </button>
        )}
      </div>

      {/* Action buttons — only shown on My Rides page */}
      {showActions && !isCancelled && !isPast && (
        <div className="flex gap-3 pt-2 flex-wrap items-center">
          {hasSeatData ? (
            <div className="flex items-center gap-2 rounded-full border px-3 py-1.5" style={{ borderColor: dark ? 'rgba(255,255,255,0.1)' : '#ddd2ea' }}>
              <span className={cn("text-sm font-medium mr-1", dark ? "text-slate-300" : "text-[#5a4f72]")}>Seats:</span>
              <button
                type="button"
                onClick={() => onUpdateSeats?.(ride.id, Math.max(0, ride.availableSeats! - 1))}
                disabled={ride.availableSeats === 0}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-opacity disabled:opacity-30",
                  dark ? "bg-slate-700 text-slate-100 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                )}
              >
                -
              </button>
              <span className={cn("w-4 text-center text-sm font-bold", dark ? "text-slate-100" : "text-slate-900")}>
                {ride.availableSeats}
              </span>
              <button
                type="button"
                onClick={() => onUpdateSeats?.(ride.id, Math.min(ride.totalSeats!, ride.availableSeats! + 1))}
                disabled={ride.availableSeats === ride.totalSeats}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full transition-opacity disabled:opacity-30",
                  dark ? "bg-slate-700 text-slate-100 hover:bg-slate-600" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                )}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onToggleAvailability?.(ride.id, !!ride.isAvailable)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-all",
                ride.isAvailable
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200"
                  : "bg-emerald-100 text-emerald-800 hover:bg-emerald-200",
              )}
            >
              {ride.isAvailable ? "Mark as Full" : "Mark as Available"}
            </button>
          )}

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



// ─────────────────────────────────────────────────────────────────────────────
// PROTECTED ROUTE
// ─────────────────────────────────────────────────────────────────────────────

function ProtectedRoute({
  children,
  currentUser,
  authLoading,
}: {
  children: React.ReactNode;
  currentUser: User | null;
  authLoading: boolean;
}) {
  const location = useLocation();
  if (authLoading) return null;
  if (!currentUser) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// WATCHED SEARCHES (ALERTS) PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface AlertsPageProps {
  alerts: RideAlert[];
  alertMatches: Record<string, Ride[]>;
  uid: string;
  loading: boolean;
  error: boolean;
  isDark: boolean;
  cardBg: string;
  heading: string;
  muted: string;
  btnMain: string;
  btnCyan: string;
  renderRide: (ride: Ride) => React.ReactNode;
  onDelete: (alertId: string) => Promise<void>;
  onSeen: (alertId: string, newlySeenIds: string[]) => void;
  onRefresh: () => void;
}

function AlertsPage({
  alerts,
  alertMatches,
  uid,
  loading,
  error,
  isDark,
  cardBg,
  heading,
  muted,
  btnMain,
  renderRide,
  onDelete,
  onSeen,
  onRefresh,
}: AlertsPageProps) {
  const navigate = useNavigate();
  const newIdsRef = useRef<Record<string, Set<string>>>({});
  const stampedRef = useRef<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  useEffect(() => {
    for (const alert of alerts) {
      const allRides = alertMatches[alert.date] || [];
      const eligibleRides = allRides.filter((r) =>
        isRideEligibleForAlert(r, alert, uid, Math.floor(getTrueTime() / 1000))
      );
      const unread = getUnreadRideIds(eligibleRides, alert);
      if (unread.length === 0) continue;

      if (!newIdsRef.current[alert.id]) {
        newIdsRef.current[alert.id] = new Set();
      }
      for (const id of unread) {
        newIdsRef.current[alert.id].add(id);
      }

      const toStamp = unread.filter((id) => !stampedRef.current.has(`${alert.id}:${id}`));
      if (toStamp.length > 0) {
        for (const id of toStamp) {
          stampedRef.current.add(`${alert.id}:${id}`);
        }
        markAlertRidesSeen(alert.id, [...alert.seenRideIds, ...toStamp], alert.firstMatchSeenAt == null).catch(() => {});
        onSeen(alert.id, toStamp);
      }
    }
  }, [alerts, alertMatches, uid, onSeen]);

  const handleDelete = async (alertId: string) => {
    setDeleteErrorId(null);
    setDeletingId(alertId);
    try {
      await onDelete(alertId);
    } catch {
      setDeleteErrorId(alertId);
    } finally {
      setDeletingId(null);
    }
  };

  const newBadgeClass = isDark
    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
    : "bg-cyan-100 text-cyan-800 border border-cyan-300";

  return (
    <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
      <BackButton onClick={() => navigate("/")} dark={isDark} />
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className={cn("rounded-3xl p-6 md:p-8 shadow-xl", cardBg)}>
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className={cn("text-2xl md:text-3xl font-bold", heading)}>
              Watched searches
            </h2>
            <button
              type="button"
              aria-label="Refresh alerts"
              onClick={onRefresh}
              disabled={loading}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full transition-all focus:outline-none",
                isDark
                  ? "bg-[#1A2540] text-slate-300 hover:text-white border border-[rgba(255,255,255,0.06)]"
                  : "bg-slate-100 text-slate-600 hover:text-slate-900 border border-[#ddd2ea]",
                loading && "opacity-50 cursor-not-allowed"
              )}
            >
              <RefreshIcon className={cn("h-5 w-5", loading && "animate-spin")} />
            </button>
          </div>

          {loading && (
            <div className="mb-4 text-center">
              <span className={cn("text-xs tracking-wide animate-pulse", muted)}>
                Checking for updates…
              </span>
            </div>
          )}

          {error && alerts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className={cn("text-lg", muted)}>Couldn't load your alerts.</p>
              <button
                type="button"
                onClick={onRefresh}
                className={cn("rounded-full px-6 py-2 text-sm font-semibold transition-all", btnMain)}
              >
                Retry
              </button>
            </div>
          ) : !loading && alerts.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className={cn("text-lg", muted)}>You aren't watching any searches yet.</p>
              <button
                type="button"
                onClick={() => navigate("/search")}
                className={cn("rounded-full px-6 py-2 text-sm font-semibold transition-all", btnMain)}
              >
                Search rides
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {alerts.map((alert) => {
                const allRides = alertMatches[alert.date] || [];
                const eligibleRides = allRides
                  .filter((r) =>
                    isRideEligibleForAlert(r, alert, uid, Math.floor(getTrueTime() / 1000))
                  )
                  .sort((a, b) => a.departureAt.seconds - b.departureAt.seconds);

                const currentUnreadSet = new Set(getUnreadRideIds(eligibleRides, alert));

                return (
                  <div
                    key={alert.id}
                    className={cn(
                      "rounded-2xl p-4 md:p-5 border transition-all",
                      isDark
                        ? "border-[rgba(255,255,255,0.08)] bg-[#10172A]"
                        : "border-[#e0d6ed] bg-white/70"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <span className={cn("font-semibold text-base md:text-lg block", heading)}>
                          {formatShortDate(alert.date)} · {alert.from || "Any"} to {alert.to || "Any"}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Stop watching this search"
                        disabled={loading || deletingId === alert.id}
                        onClick={() => handleDelete(alert.id)}
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
                          isDark
                            ? "text-slate-400 hover:text-red-400 hover:bg-red-950/30"
                            : "text-slate-500 hover:text-red-600 hover:bg-red-50",
                          (loading || deletingId === alert.id) && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {deleteErrorId === alert.id && (
                      <p className="text-xs text-red-500 mb-2">
                        Could not remove alert. Please try again.
                      </p>
                    )}

                    {eligibleRides.length === 0 ? (
                      <p className={cn("text-sm py-2", muted)}>Watching, nothing yet.</p>
                    ) : (
                      <div className="space-y-3 mt-3">
                        {eligibleRides.map((ride) => {
                          const isNew =
                            currentUnreadSet.has(ride.id) ||
                            Boolean(newIdsRef.current[alert.id]?.has(ride.id));
                          return (
                            <div key={ride.id} className="relative space-y-1">
                              {isNew && (
                                <div className="flex justify-end mb-1">
                                  <span
                                    className={cn(
                                      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                                      newBadgeClass
                                    )}
                                  >
                                    New
                                  </span>
                                </div>
                              )}
                              {renderRide(ride)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function App() {
  // ── Routing hooks ──────────────────────────────────────────────────────────
  const navigate = useNavigate();
  const location = useLocation();

  // ── Theme ──────────────────────────────────────────────────────────────────
  const [isDark, setIsDark] = useState<boolean>(
    () => localStorage.getItem("theme") !== "light",
  );

  // ── Auth state ─────────────────────────────────────────────────────────────
  // currentUser is null when logged out, a Firebase User object when logged in.
  // We don't read from localStorage for auth — Firebase handles persistence
  // internally. onAuthStateChanged (below) is the single source of truth.
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // ── Post Ride form state ───────────────────────────────────────────────────
  const [postMessage, setPostMessage] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [postDate, setPostDate] = useState("");
  const [postTime, setPostTime] = useState("");
  const [postFrom, setPostFrom] = useState("");
  const [postPrefill, setPostPrefill] = useState<{ date: string; from: string; to: string; nonce: number } | null>(null);

  // ── Search state ───────────────────────────────────────────────────────────
  const [searchResults, setSearchResults] = useState<Ride[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchMessage, setSearchMessage] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchDate, setSearchDate] = useState("");
  const [emptySearch, setEmptySearch] = useState<{ date: string; from: string; to: string } | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<{ date: string; from: string; to: string } | null>(null);
  const [sharedRide, setSharedRide] = useState<Ride | null>(null);
  const [sharedRideError, setSharedRideError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Alerts state ───────────────────────────────────────────────────────────
  const [alerts, setAlerts] = useState<RideAlert[]>([]);
  const [alertMatches, setAlertMatches] = useState<Record<string, Ride[]>>({});
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsLoaded, setAlertsLoaded] = useState(false);
  const [alertsError, setAlertsError] = useState(false);
  const [creatingAlert, setCreatingAlert] = useState(false);
  const [watchMessage, setWatchMessage] = useState<{ text: string; showLink: boolean } | null>(null);
  const lastAlertCheckRef = useRef<number>(0);
  const inFlightUidRef = useRef<string | null>(null);
  const refetchAfterRef = useRef<boolean>(false);

  // ── My Rides state ─────────────────────────────────────────────────────────
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myRidesLoading, setMyRidesLoading] = useState(false);
  const [myRidesError, setMyRidesError] = useState("");
  const [dismissedNudgeIds, setDismissedNudgeIds] = useState<Set<string>>(
    new Set()
  );

  // ── Profile state ──────────────────────────────────────────────────────────
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileStatus, setProfileStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [historyPage, setHistoryPage] = useState(1);
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactStatusMessage, setContactStatusMessage] = useState("");

  // Posting : 
  const isPostingRef = useRef(false);

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    void syncTimeOffset();
  }, []);

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

  const todayISO = getLocalDateISO();
  const minPostTime = postDate === todayISO ? getLocalTimeHHMM() : undefined;

  // ── Alerts data fetcher ─────────────────────────────────────────────────────

  const fetchAlertsData = async (uid: string): Promise<Record<string, Ride[]> | null> => {
    if (inFlightUidRef.current === uid) {
      refetchAfterRef.current = true;
      return null;
    }
    inFlightUidRef.current = uid;
    setAlertsLoading(true);
    setAlertsError(false);
    try {
      const fetchedAlerts = await getUserAlerts(uid);
      if (auth.currentUser?.uid !== uid) return null;

      const today = getLocalDateISO();
      for (const a of fetchedAlerts) {
        if (a.date < today) {
          deleteRideAlert(a.id).catch(() => {});
        }
      }

      const validAlerts = fetchedAlerts.filter((a) => a.date >= today).slice(0, MAX_ALERTS);

      if (validAlerts.length === 0) {
        setAlerts([]);
        setAlertMatches({});
        setAlertsLoaded(true);
        setAlertsError(false);
        lastAlertCheckRef.current = Date.now();
        return {};
      }

      const distinctDates = Array.from(new Set(validAlerts.map((a) => a.date)));
      const ridesByDate = await Promise.all(distinctDates.map((d) => getRidesByDate(d)));
      if (auth.currentUser?.uid !== uid) return null;

      const newMatches: Record<string, Ride[]> = {};
      distinctDates.forEach((date, i) => {
        newMatches[date] = ridesByDate[i];
      });

      setAlerts(validAlerts);
      setAlertMatches(newMatches);
      setAlertsLoaded(true);
      setAlertsError(false);
      lastAlertCheckRef.current = Date.now();
      return newMatches;
    } catch {
      if (auth.currentUser?.uid === uid) {
        setAlertsError(true);
      }
      return null;
    } finally {
      if (inFlightUidRef.current === uid) {
        inFlightUidRef.current = null;
        setAlertsLoading(false);
        if (refetchAfterRef.current && auth.currentUser?.uid === uid) {
          refetchAfterRef.current = false;
          void fetchAlertsData(uid);
        }
      }
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  // Dark-mode class on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark-mode", isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  // Firebase Auth listener — fires on every auth state change.
  // When a user signs in: `user` is a Firebase User object.
  // When they sign out (or the session expires): `user` is null.
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

  const loadUserProfile = async (uid: string) => {
    setProfileStatus("loading");
    try {
      const data = await getUserProfile(uid);
      if (auth.currentUser?.uid !== uid) return;
      setUserProfile(data ?? {});
      setProfileStatus("ready");
    } catch {
      if (auth.currentUser?.uid !== uid) return;
      setProfileStatus("error");
    }
  };

  useEffect(() => {
    setUserProfile(null);
    setMyRides([]);
    setMyRidesError("");
    setDismissedNudgeIds(new Set());
    setHistoryPage(1);
    setContactStatusMessage("");
    setIsSavingContact(false);

    setAlerts([]);
    setAlertMatches({});
    setAlertsLoaded(false);
    setAlertsError(false);
    setAlertsLoading(false);
    setWatchMessage(null);
    lastAlertCheckRef.current = 0;
    inFlightUidRef.current = null;
    refetchAfterRef.current = false;

    if (currentUser?.uid) {
      loadUserProfile(currentUser.uid);
      void fetchAlertsData(currentUser.uid);
    } else {
      setProfileStatus("idle");
    }
  }, [currentUser?.uid]);

  // Load My Rides whenever the user navigates to /profile.
  useEffect(() => {
    if (location.pathname !== "/profile" || !currentUser) return;
    loadMyRides();
  }, [location.pathname, currentUser]);

  // Refetch alerts on navigating to /alerts if cooldown passed
  useEffect(() => {
    if (
      location.pathname === "/alerts" &&
      currentUser?.uid &&
      lastAlertCheckRef.current > 0 &&
      Date.now() - lastAlertCheckRef.current > 10000
    ) {
      void fetchAlertsData(currentUser.uid);
    }
  }, [location.pathname, currentUser?.uid]);

  // Refetch alerts on tab visibility change if cooldown passed
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        currentUser?.uid &&
        alerts.length > 0 &&
        Date.now() - lastAlertCheckRef.current > ALERT_COOLDOWN_MS
      ) {
        void fetchAlertsData(currentUser.uid);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [currentUser?.uid, alerts.length]);

  // Search state reset when navigating to /search.
  useEffect(() => {
    if (location.pathname === "/search") {
      setSearchResults([]);
      setSearchMessage("");
      setSearchDate("");
      setSearchPage(1);
      setSearchCriteria(null);
    }
    if (location.pathname !== "/search") {
      setEmptySearch(null);
      setWatchMessage(null);
      setSearchPage(1);
      setSearchCriteria(null);
    }
    if (location.pathname !== "/post") {
      setPostMessage("");
      setPostPrefill(null);
      setPostDate("");
      setPostTime("");
      setPostFrom("");
    }
  }, [location.pathname]);

  useEffect(() => {
    const rideId = searchParams.get("id");
    if (!rideId) {
      setSharedRide(null);
      // NOTE: Do NOT call setSharedRideError("") here.
      // If an invalid ride clears the query param below, clearing the error
      // here would wipe out the error message before the user can read it.
      return;
    }

    setSharedRideError("");

    (async () => {
      try {
        const ride = await getSharedRide(rideId);

        if (!ride) {
          setSharedRide(null);
          setSharedRideError("The shared ride could not be found.");
          setSearchParams({}, { replace: true });
          return;
        }

        const isCancelled = ride.status === "cancelled";
        const isDeparted = ride.departureAt.seconds < Timestamp.now().seconds;

        if (isCancelled || isDeparted) {
          setSharedRide(null);
          setSharedRideError("The shared ride has departed or been cancelled.");
          setSearchParams({}, { replace: true });
          return;
        }

        setSharedRide(ride);
        setSharedRideError("");
      } catch {
        setSharedRide(null);
        setSharedRideError("Could not load the shared ride.");
      }
    })();
  }, [searchParams]);

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
      const fromLocation = (location.state as { from?: { pathname: string; search?: string } })?.from;
      const from = fromLocation ? `${fromLocation.pathname}${fromLocation.search || ""}` : "/";
      navigate(from, { replace: true });
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
    navigate("/");
    await signOut(auth);
    // onAuthStateChanged fires and sets currentUser to null.
  };

  // ── Post Ride handler ──────────────────────────────────────────────────────

  const handlePostRide = async (event: FormEvent<HTMLFormElement>) => {
    if (isPostingRef.current) return;
    isPostingRef.current = true;

    event.preventDefault();
    if (!currentUser) {
      isPostingRef.current = false; // Cleanup if returning early
      return;
    }

    //preventing the NULL error
    const form = event.currentTarget;
    const fd = new FormData(form);

    const fromVal = String(fd.get("from") || "").trim();
    const toVal = String(fd.get("to") || "").trim();
    const dateVal = String(fd.get("date") || "").trim();
    const timeVal = String(fd.get("time") || "").trim();
    const vehicleVal = String(fd.get("vehicleType") || "cab") as VehicleType;
    const fareStr = String(fd.get("farePerPerson") || "").trim();
    const contactVal = String(fd.get("contact") || "").trim();
    const saveContactVal = fd.get("saveContact") === "on";
    const notesVal = String(fd.get("notes") || "").trim();
    const totalSeatsVal = parseInt(String(fd.get("totalSeats") || "0"), 10);
    const availableSeatsVal = parseInt(String(fd.get("availableSeats") || "0"), 10);

    if (isNaN(totalSeatsVal) || totalSeatsVal <= 0) {
      setPostMessage("Total seats must be a valid positive number.");
      isPostingRef.current = false;
      return;
    }
    if (isNaN(availableSeatsVal) || availableSeatsVal < 0 || availableSeatsVal > totalSeatsVal) {
      setPostMessage("Available seats cannot exceed total seats.");
      isPostingRef.current = false;
      return;
    }

    // Validate departure is in the future
    const now = getLocalDateISO();
    const nowTime = getLocalTimeHHMM();
    if (
      dateVal < now ||
      (dateVal === now && timeVal < nowTime)
    ) {
      alert("You cannot post a ride in the past.");
      isPostingRef.current = false;
      return;
    }

    if (fromVal === toVal) {
      alert("From and To locations cannot be the same.");
      isPostingRef.current = false;
      return;
    }

    setIsPosting(true);
    setPostMessage("");

    try {
      const departureAt = buildDepartureTimestamp(dateVal, timeVal);
      await postRide({
        postedBy: {
          uid: currentUser.uid,
          email: currentUser.email || "",
          name: currentUser.displayName || "",
        },
        from: fromVal,
        to: toVal,
        date: dateVal,
        time: timeVal,
        departureAt,
        vehicleType: vehicleVal,
        totalSeats: totalSeatsVal,
        availableSeats: availableSeatsVal,
        farePerPerson: fareStr !== "" ? Number(fareStr) : null,
        contact: contactVal,
        notes: notesVal,
        status: "active",
        createdAt: Timestamp.now(),
      });

      if (saveContactVal && profileStatus === "ready" && !userProfile?.contact && CONTACT_REGEX.test(contactVal)) {
        const uid = currentUser.uid;
        saveUserContact(uid, contactVal)
          .then(() => {
            if (auth.currentUser?.uid === uid) {
              setUserProfile((prev) => ({ ...(prev ?? {}), contact: contactVal }));
            }
          })
          .catch(() => {});
      }

      // 3. UI CLEANUP (Safe to run because form is safely stored)
      setPostMessage("Ride posted! Others can now find and contact you.");
      setPostPrefill(null);
      setPostDate("");
      setPostTime("");
      setPostFrom("");
      form.reset();
      setTimeout(() => setPostMessage(""), 10000);
    } catch {
      setPostMessage("Failed to post ride. Please check your connection and try again.");
    } finally {
      // 4. GUARANTEED STATE RESET
      isPostingRef.current = false;
      setIsPosting(false);
    }
  };

  // ── Search handler ─────────────────────────────────────────────────────────

  const handleSearchRide = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmptySearch(null);
    setSearchCriteria(null);
    setWatchMessage(null);
    setSearchPage(1);
    setSharedRideError("");
    const fd = new FormData(event.currentTarget);

    const from = String(fd.get("from") || "").trim();
    const to = String(fd.get("to") || "").trim();
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
      setSearchMessage("Please select at least one transit hub : railway station, airport, or bus terminal.");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setSearchMessage("");
    setSearchResults([]);

    try {
      const ridesOnDate = await getRidesByDate(date);
      const nowSeconds = Timestamp.now().seconds;

      const matches = ridesOnDate
        .filter((r) => {
          if (r.status !== "active") return false;
          if (r.departureAt.seconds < nowSeconds) return false; // Exclude already departed rides for today
          if (from && !locationsMatch(from, r.from)) return false;
          if (to && !locationsMatch(to, r.to)) return false;
          return true;
        })
        .sort((a, b) => a.departureAt.seconds - b.departureAt.seconds); // In-memory sort by departure time

      setSearchResults(matches);
      setSearchCriteria({ date, from, to });
      if (matches.length === 0) {
        setEmptySearch({ date, from, to });
      }
      setSearchMessage(
        matches.length === 0
          ? "No rides found"
          : `Found ${matches.length} ride${matches.length > 1 ? "s" : ""}.`,
      );
    } catch {
      setEmptySearch(null);
      setSearchMessage("Could not fetch rides. Please check your connection.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleEmptySearchPost = () => {
    if (!emptySearch) return;

    const validDate =
      emptySearch.date && emptySearch.date >= getLocalDateISO()
        ? emptySearch.date
        : "";

    const validFrom =
      (COLLEGE_LOCATIONS as readonly string[]).includes(emptySearch.from) ||
      (TRANSIT_LOCATIONS as readonly string[]).includes(emptySearch.from)
        ? emptySearch.from
        : "";

    const availableToOptions: readonly string[] = (
      COLLEGE_LOCATIONS as readonly string[]
    ).includes(validFrom)
      ? TRANSIT_LOCATIONS
      : validFrom !== ""
        ? COLLEGE_LOCATIONS
        : ALL_LOCATIONS;

    const validTo = availableToOptions.includes(emptySearch.to)
      ? emptySearch.to
      : "";

    setPostPrefill({
      date: validDate,
      from: validFrom,
      to: validTo,
      nonce: Date.now(),
    });
    setPostDate(validDate);
    setPostFrom(validFrom);
    navigate("/post");
  };

  const handleWatchSearch = async () => {
    const uid = currentUser?.uid;
    const target = searchCriteria ?? emptySearch;
    if (!uid || !target || creatingAlert) return;
    setCreatingAlert(true);
    setWatchMessage(null);
    try {
      const created = await createRideAlert(uid, target.date, target.from, target.to);
      setAlerts((prev) =>
        prev.some((a) => a.id === created.id) ? prev : [...prev, created].slice(0, MAX_ALERTS)
      );
      const freshMatches = await fetchAlertsData(uid);
      const dateRides = (freshMatches ? freshMatches[created.date] : alertMatches[created.date]) || [];
      const hasEligible = dateRides.some((r) =>
        isRideEligibleForAlert(r, created, uid, Math.floor(getTrueTime() / 1000))
      );
      if (hasEligible) {
        setWatchMessage({ text: "A matching ride was just posted.", showLink: true });
      } else {
        setWatchMessage({
          text: "Watching. New matches will show up here the next time you open IITransit.",
          showLink: false,
        });
      }
    } catch {
      setWatchMessage({ text: "Could not save. Please try again.", showLink: false });
    } finally {
      setCreatingAlert(false);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    await deleteRideAlert(alertId);
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const handleAlertSeen = (alertId: string, newlySeenIds: string[]) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              seenRideIds: Array.from(new Set([...a.seenRideIds, ...newlySeenIds])).slice(-MAX_SEEN_IDS),
              firstMatchSeenAt: a.firstMatchSeenAt ?? Timestamp.now(),
            }
          : a
      )
    );
  };

  const unreadAlertCount = useMemo(() => {
    const uid = currentUser?.uid;
    if (!uid) return 0;
    const nowSec = Math.floor(getTrueTime() / 1000);
    let count = 0;
    for (const alert of alerts) {
      const eligibleRides = (alertMatches[alert.date] || []).filter((r) =>
        isRideEligibleForAlert(r, alert, uid, nowSec)
      );
      if (getUnreadRideIds(eligibleRides, alert).length > 0) {
        count++;
      }
    }
    return count;
  }, [currentUser?.uid, alerts, alertMatches]);

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

  const handleUpdateSeats = async (rideId: string, newSeats: number) => {
    try {
      await updateAvailableSeats(rideId, newSeats);
      setMyRides((prev) =>
        prev.map((r) => (r.id === rideId ? { ...r, availableSeats: newSeats } : r)),
      );
    } catch {
      alert("Could not update seats. Please try again.");
    }
  };

  const handleShareRide = async (ride: Ride) => {
    const shareUrl = `${window.location.origin}/search?id=${ride.id}`;
    const title = "IITransit — Ride Share";
    const text = `Ride from ${ride.from} → ${ride.to} on ${ride.date}. Seats available.`;

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${shareUrl}`);
        if (typeof showToast === "function") {
          showToast("Link copied to clipboard!", "success");
        } else {
          alert("Link copied to clipboard!");
        }
      }
    } catch (err) {
      const code = (err as { name?: string }).name;
      if (code !== "AbortError") {
        if (typeof showToast === "function") {
          showToast("Could not share. Try copying the link manually.", "error");
        } else {
          alert("Could not share. Try copying the link manually.");
        }
      }
    }
  };

  const handleContactReveal = (ride: Ride) => {
    if (ride.postedBy.uid === currentUser?.uid) return;
    incrementContactClicks(ride.id).catch(() => {
      // Silently fail — this is an analytics signal, not a critical op
    });
  };

  const { nextRide, upcoming, history } = useMemo(
    () => partitionRides(myRides, Timestamp.now().seconds),
    [myRides]
  );

  const { pageItems: historyPageItems, page: currentHistoryPage, totalPages: historyTotalPages } = useMemo(
    () => paginate(history, historyPage),
    [history, historyPage]
  );

  useEffect(() => {
    if (historyPage > historyTotalPages) {
      setHistoryPage(Math.max(1, historyTotalPages));
    }
  }, [historyPage, historyTotalPages]);

  const totalSearchPages = Math.max(1, Math.ceil(searchResults.length / SEARCH_PAGE_SIZE));
  const safeSearchPage = Math.min(searchPage, totalSearchPages);
  const paginatedSearchResults = useMemo(
    () =>
      searchResults.slice(
        (safeSearchPage - 1) * SEARCH_PAGE_SIZE,
        safeSearchPage * SEARCH_PAGE_SIZE
      ),
    [searchResults, safeSearchPage]
  );

  const handleSaveContact = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser || profileStatus !== "ready" || isSavingContact) return;
    const uid = currentUser.uid;
    const fd = new FormData(event.currentTarget);
    const value = String(fd.get("contact") || "").trim();

    if (!CONTACT_REGEX.test(value)) {
      setContactStatusMessage("Could not save. Please try again.");
      return;
    }

    setIsSavingContact(true);
    setContactStatusMessage("");
    try {
      await saveUserContact(uid, value);
      if (auth.currentUser?.uid === uid) {
        setUserProfile((prev) => ({ ...(prev ?? {}), contact: value }));
        setContactStatusMessage("Number saved.");
      }
    } catch {
      setContactStatusMessage("Could not save. Please try again.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleRemoveContact = async () => {
    if (!currentUser || profileStatus !== "ready" || isSavingContact) return;
    const uid = currentUser.uid;
    setIsSavingContact(true);
    setContactStatusMessage("");
    try {
      await saveUserContact(uid, null);
      if (auth.currentUser?.uid === uid) {
        setUserProfile((prev) => {
          if (!prev) return null;
          const next = { ...prev };
          delete next.contact;
          return next;
        });
        setContactStatusMessage("Number removed.");
      }
    } catch {
      setContactStatusMessage("Could not save. Please try again.");
    } finally {
      setIsSavingContact(false);
    }
  };

  const renderUpcomingRide = (ride: Ride) => {
    const n = ride.contactClicks ?? 0;
    return (
      <div key={ride.id}>
        {/* Nudge Banner */}
        {n >= 1 &&
          ride.status === "active" &&
          !dismissedNudgeIds.has(ride.id) && (
            <div
              className={cn(
                "mb-3 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm",
                isDark
                  ? "bg-[#1A2540] text-[#CBD5E1] border border-[rgba(255,255,255,0.06)]"
                  : "bg-[#f0ebf8] text-[#5a3d7a] border border-[#ddd2ea]"
              )}
            >
              <span>
                Contact info viewed {n} {n === 1 ? "time" : "times"}. Mark as full to stop messages.
              </span>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() =>
                  setDismissedNudgeIds((prev) => new Set(prev).add(ride.id))
                }
                className="shrink-0 opacity-60 hover:opacity-100 transition-opacity px-1 leading-none text-lg"
              >
                ×
              </button>
            </div>
          )}

        <RideCard
          ride={ride}
          dark={isDark}
          showActions
          onCancel={handleCancelRide}
          onToggleAvailability={handleToggleAvailability}
          onUpdateSeats={handleUpdateSeats}
          onShare={handleShareRide}
          onContactReveal={handleContactReveal}
        />
      </div>
    );
  };

  // ── Shared style tokens ────────────────────────────────────────────────────
  const cardBg = isDark ? "bg-[#121A2E] border border-[rgba(255,255,255,0.06)] shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-[#f7f4fb]/95 shadow-[#8f75a9]/25";
  const heading = isDark ? "text-[#F8FAFC]" : "text-slate-900";
  const btnMain = isDark ? "bg-[#7C3AED] text-white hover:bg-[#8B5CF6]" : "bg-[#aa82bc] text-white hover:bg-[#9d74b2]";
  const btnCyan = isDark ? "bg-[#2563EB] text-white hover:bg-[#3B82F6]" : "bg-[#a8deef] text-[#1f3145] hover:bg-[#96d5ea]";
  const muted = isDark ? "text-[#CBD5E1]" : "text-[#5f6170]";

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
      <Routes>
        {/* ════════════════════════════════════════════════════════════════════
            HOME PAGE
        ════════════════════════════════════════════════════════════════════ */}
        <Route
          path="/"
          element={
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
                    {alerts.length > 0 && (
                      <button
                        type="button"
                        aria-label={unreadAlertCount > 0 ? `Alerts, ${unreadAlertCount} new` : "Alerts"}
                        onClick={() => navigate("/alerts")}
                        className={cn(
                          "relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50",
                          isDark
                            ? "bg-[#121A2E] text-[#F8FAFC] border border-[rgba(255,255,255,0.06)] hover:bg-[#1a2540]"
                            : "bg-white/80 text-slate-700 border border-[#ddd2ea] hover:bg-white"
                        )}
                      >
                        <BellIcon className="h-5 w-5" />
                        {unreadAlertCount > 0 && (
                          <span
                            className={cn(
                              "absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#0B1020]",
                              isDark ? "ring-[#0B1020]" : "ring-white"
                            )}
                          />
                        )}
                      </button>
                    )}

                    <button
                      type="button"
                      aria-label="Open profile"
                      onClick={() => navigate("/profile")}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/50"
                    >
                      <Avatar
                        photoURL={currentUser.photoURL}
                        name={currentUser.displayName}
                        email={currentUser.email}
                        className="h-9 w-9"
                      />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className={cn("rounded-full px-5 py-2 text-sm font-semibold transition-all", btnMain)}
                  >
                    Sign In
                  </button>
                )}
              </nav>

              <div className="mb-14 text-center">
                <h1 className={cn(
                  "mb-0 font-['Space_Grotesk'] font-bold tracking-tighter text-6xl md:text-8xl",
                  isDark
                    ? "bg-gradient-to-br from-[#a78bfa] via-[#8B5CF6] to-[#7C3AED] bg-clip-text text-transparent"
                    : "text-indigo-950"
                )}>
                  IITransit
                </h1>
                <p className={cn(
                  "mb-10 font-['Inter'] text-base md:text-xl font-normal tracking-normal",
                  isDark ? "text-slate-400" : "text-slate-600"
                )}>
                  Split the ride. Save the fare
                </p>
              </div>

              <div className="grid gap-5 pb-5 md:grid-cols-2">
                {[
                  { label: "Post a Ride", sub: "Offer a ride to others", target: "/post", accent: btnMain },
                  { label: "Search Rides", sub: "Find available rides", target: "/search", accent: btnMain },
                ].map(({ label, sub, target, accent }) => (
                  <div key={target} className={cn("rounded-3xl p-8 text-center shadow-lg hover:shadow-2xl transition-shadow", cardBg)}>
                    <p className={cn("mx-auto mb-7 text-xl md:text-3xl font-semibold", isDark ? "text-[#F8FAFC]" : "text-slate-800")}>{sub}</p>
                    <button
                      type="button"
                      onClick={() => navigate(target)}
                      className={cn("rounded-full px-8 py-4 text-2xl font-bold transition-all hover:-translate-y-0.5", accent)}
                    >
                      {label}
                    </button>
                  </div>
                ))}
              </div>

              {/* ── Footer ── */}
              <footer className={cn(
                "mt-8 flex flex-row items-center justify-between px-4 py-4 border-t",
                isDark
                  ? "border-[rgba(255,255,255,0.06)]"
                  : "border-[rgba(100,70,130,0.15)]",
              )}>
                {/* Left — empty for balance */}
                <div className="flex-1 sm:flex-none sm:w-48" />

                {/* Center — attribution */}
                <a 
                  href="https://www.linkedin.com/in/dattarajdhatbale/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`inline-flex items-center justify-center transition-colors shrink-0 ${isDark ? "text-blue-400 hover:text-blue-300" : "text-[#0A66C2] hover:text-[#004182]"}`}
                  aria-label="Creator's LinkedIn"
                >
                  <Linkedin className="h-5 w-5"/>
                </a>

                {/* Right — feedback button */}
                <div className="flex flex-1 sm:flex-none justify-end sm:w-48">
                  <a href="https://forms.gle/ecHCMBF3aQyRF4tE8"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90 whitespace-nowrap",
                      isDark
                        ? "bg-[#7C3AED] text-white"
                        : "bg-[#5a3d7a] text-white",
                    )}
                  >
                    <FeedbackIcon />
                    / 💡/ 🐛
                  </a>
                </div>
              </footer>
            </section>
          }
        />

        {/* ════════════════════════════════════════════════════════════════════
            SIGN-IN PAGE
        ════════════════════════════════════════════════════════════════════ */}
        <Route
          path="/auth"
          element={
            <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
              <BackButton onClick={() => navigate("/")} dark={isDark} />
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
          }
        />

        {/* ════════════════════════════════════════════════════════════════════
            POST A RIDE
        ════════════════════════════════════════════════════════════════════ */}
        <Route
          path="/post"
          element={
            <ProtectedRoute currentUser={currentUser} authLoading={authLoading}>
              <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
                <BackButton onClick={() => navigate("/")} dark={isDark} />
                <div className={cn("mx-auto w-full max-w-2xl rounded-3xl p-8 shadow-xl md:p-10", cardBg)}>
                  <h2 className={cn("mb-7 text-center text-3xl md:text-4xl font-bold", heading)}>Post a Ride</h2>

                  <form className="space-y-4" onSubmit={handlePostRide}>
                    {/* ── From ── */}
                    <div className="relative w-full">
                      <select
                        key={`from-${postPrefill?.nonce ?? 0}`}
                        name="from"
                        required
                        defaultValue={postPrefill?.from ?? ""}
                        className="field-input !pr-12 appearance-none w-full"
                        onChange={e => { setPostFrom(e.target.value); }}
                      >
                        <option value="" disabled>Select departure location</option>
                        <optgroup label="Campus">
                          {COLLEGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                        <optgroup label="Transit Hubs">
                          {TRANSIT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* ── To ── */}
                    <div className="relative w-full">
                      <select
                        key={`to-${postPrefill?.nonce ?? 0}-${postFrom}`}
                        name="to"
                        required
                        defaultValue={postPrefill && postFrom === postPrefill.from ? postPrefill.to : ""}
                        className="field-input !pr-12 appearance-none w-full"
                      >
                        <option value="" disabled>Select destination</option>
                        {(COLLEGE_LOCATIONS.includes(postFrom as any)
                          ? TRANSIT_LOCATIONS
                          : postFrom !== ""
                            ? COLLEGE_LOCATIONS
                            : ALL_LOCATIONS
                        ).map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* ── Date ── */}
                    <div className="relative w-full field-input flex items-center justify-start overflow-hidden focus-within:ring-2 focus-within:ring-[#8B5CF6]/50">
                      <span className={postDate ? "text-current" : "text-slate-400 pointer-events-none"}>
                        {postDate || "Departure Date"}
                      </span>
                      <input
                        key={`date-${postPrefill?.nonce ?? 0}`}
                        name="date"
                        type="date"
                        defaultValue={postPrefill?.date ?? ""}
                        min={todayISO}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch {
                            // Ignore unsupported browsers
                          }
                        }}
                        onChange={(e) => setPostDate(e.target.value)}
                        required
                      />
                    </div>

                    {/* ── Time — specific departure time ── */}
                    <div className="relative w-full field-input flex items-center justify-start overflow-hidden focus-within:ring-2 focus-within:ring-[#8B5CF6]/50">
                      <span className={postTime ? "text-current" : "text-slate-400 pointer-events-none"}>
                        {postTime || "Departure Time"}
                      </span>
                      <input
                        name="time"
                        type="time"
                        min={minPostTime}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch {
                            // Ignore unsupported browsers
                          }
                        }}
                        onChange={(e) => setPostTime(e.target.value)}
                        required
                      />
                    </div>

                    {/* ── Vehicle type ── */}
                    <div className="relative w-full">
                      <select name="vehicleType" required defaultValue="" className="field-input !pr-12 appearance-none w-full">
                        <option value="" disabled>Select vehicle type</option>
                        {(Object.entries(VEHICLE_LABELS) as [VehicleType, string][]).map(
                          ([val, label]) => <option key={val} value={val}>{label}</option>
                        )}
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* ── Seats ── */}
                    <div className="flex gap-4">
                      <input
                        name="totalSeats" type="number" min="1" required
                        placeholder="Total seats"
                        className="field-input w-1/2"
                      />
                      <input
                        name="availableSeats" type="number" min="0" required
                        placeholder="Available seats"
                        className="field-input w-1/2"
                      />
                    </div>

                    {/* ── Fare per person ── */}
                    <input
                      name="farePerPerson" type="number" min="0" required
                      placeholder="Total fare (₹)"
                      className="field-input"
                    />

                    {/* ── Contact ── */}
                    <input
                      key={userProfile?.contact ?? "no-contact"}
                      name="contact"
                      type="tel"
                      inputMode="numeric"
                      required
                      defaultValue={userProfile?.contact ?? ""}
                      placeholder="WhatsApp / phone number"
                      className="field-input"
                      pattern="[6-9][0-9]{9}"
                      title="Enter a valid 10-digit Indian mobile number"
                      onInput={(e) => {
                        e.currentTarget.value = sanitizeDigits(e.currentTarget.value);
                      }}
                    />

                    {profileStatus === "ready" && !userProfile?.contact && (
                      <label className={cn("flex items-center gap-2 text-sm cursor-pointer select-none", muted)}>
                        <input
                          type="checkbox"
                          name="saveContact"
                          defaultChecked
                          className="rounded accent-[#8B5CF6]"
                        />
                        <span>Save this number for next time</span>
                      </label>
                    )}

                    {/* ── Notes ── */}
                    <textarea
                      name="notes"
                      rows={3}
                      placeholder="Any notes? e.g. Flexible by 15 min, Have luggage, Only for female students, Train details..."
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
                          <SpinnerIcon className="h-5 w-5 animate-spin" />
                          Posting…
                        </span>
                      ) : "Post Ride"}
                    </button>

                  </form>

                  {postMessage && (
                    <div className="mt-5 text-center">
                      <p
                        className={cn(
                          "text-lg font-medium",
                          postMessage.startsWith("Ride posted")
                            ? "text-emerald-500"
                            : "text-red-500"
                        )}
                      >
                        {postMessage}
                      </p>
                      {postMessage.startsWith("Ride posted") && (
                        <button
                          type="button"
                          onClick={() => navigate("/profile")}
                          className="mt-2 inline-block text-sm font-semibold underline hover:opacity-80 transition-opacity"
                        >
                          View in your profile
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════════════════════════════════
            SEARCH RIDES
        ════════════════════════════════════════════════════════════════════ */}
        <Route
          path="/search"
          element={
            <ProtectedRoute currentUser={currentUser} authLoading={authLoading}>
              <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
                <BackButton onClick={() => navigate("/")} dark={isDark} />

                {/* ── Shared ride deep link result ── */}
                {sharedRideError && (
                  <div className={cn("mx-auto w-full max-w-2xl mb-4 rounded-xl px-4 py-3 text-sm font-medium",
                    isDark
                      ? "bg-red-900/40 text-red-300 border border-red-700/40"
                      : "bg-red-50 text-red-700 border border-red-200")}>
                    {sharedRideError}
                  </div>
                )}

                {sharedRide && (
                  <div className={cn("mx-auto w-full max-w-2xl mb-6 rounded-3xl p-6 shadow-xl", cardBg)}>
                    <p className={cn("mb-3 text-xs font-semibold uppercase tracking-widest", muted)}>
                      Shared Ride
                    </p>
                    <RideCard
                      ride={sharedRide}
                      dark={isDark}
                      highlight={true}
                      onShare={handleShareRide}
                      onContactReveal={handleContactReveal}
                    />
                  </div>
                )}

                <div className={cn("mx-auto w-full max-w-2xl rounded-3xl p-8 shadow-xl md:p-10", cardBg)}>
                  <h2 className={cn("mb-7 text-center text-3xl md:text-4xl font-bold", heading)}>Search Rides</h2>

                  <form className="space-y-4" onSubmit={handleSearchRide}>
                    <div className="relative w-full">
                      <select name="from" defaultValue="" className="field-input !pr-12 appearance-none w-full">
                        <option value="">Any departure location</option>
                        <optgroup label="Campus">
                          {COLLEGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                        <optgroup label="Transit Hubs">
                          {TRANSIT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative w-full">
                      <select name="to" defaultValue="" className="field-input !pr-12 appearance-none w-full">
                        <option value="">Any destination</option>
                        <optgroup label="Campus">
                          {COLLEGE_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                        <optgroup label="Transit Hubs">
                          {TRANSIT_LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </optgroup>
                      </select>
                      <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
                    </div>
                    <div className="relative w-full field-input flex items-center justify-start overflow-hidden focus-within:ring-2 focus-within:ring-[#8B5CF6]/50">
                      <span className={searchDate ? "text-current" : "text-slate-400 pointer-events-none"}>
                        {searchDate || "Travel Date"}
                      </span>
                      <input
                        name="date"
                        type="date"
                        min={todayISO}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onClick={(e) => {
                          try {
                            e.currentTarget.showPicker();
                          } catch {
                            // Ignore unsupported browsers
                          }
                        }}
                        onChange={(e) => setSearchDate(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSearching}
                      className={cn("w-full rounded-full px-7 py-4 text-xl font-semibold transition-all hover:-translate-y-0.5",
                        btnMain, isSearching && "opacity-60 cursor-not-allowed")}
                    >
                      {isSearching ? "Searching…" : "Search"}
                    </button>
                  </form>

                  {searchMessage && searchResults.length === 0 && (
                    <div className="mt-6 text-center space-y-3">
                      {emptySearch !== null ? (
                        <div className="space-y-1">
                          <p className={cn("text-lg font-medium", heading)}>No rides found</p>
                          <p className={cn("text-sm text-slate-500 dark:text-slate-400", isDark ? "text-slate-400" : "text-slate-500")}>
                            Try adjusting your filters or post a ride.
                          </p>
                        </div>
                      ) : (
                        <p className={cn("text-xl", muted)}>{searchMessage}</p>
                      )}
                      {emptySearch !== null && (() => {
                        const uid = currentUser?.uid ?? "";
                        const currentAlertId = uid && emptySearch ? buildAlertId(uid, emptySearch.date, emptySearch.from, emptySearch.to) : "";
                        const isWatching = alerts.some((a) => a.id === currentAlertId);
                        const isCapReached = !isWatching && alerts.length >= MAX_ALERTS;

                        let watchBtnLabel = "Watch this search";
                        let watchBtnDisabled = false;
                        let onWatchClick: () => void = handleWatchSearch;

                        if (!alertsLoaded && alertsError) {
                          watchBtnLabel = "Couldn't load, tap to retry";
                          watchBtnDisabled = false;
                          onWatchClick = () => { if (uid) void fetchAlertsData(uid); };
                        } else if (!alertsLoaded || alertsLoading) {
                          watchBtnLabel = "Loading...";
                          watchBtnDisabled = true;
                        } else if (isWatching) {
                          watchBtnLabel = "Watching ✓";
                          watchBtnDisabled = true;
                        } else if (isCapReached) {
                          watchBtnLabel = "Watch this search";
                          watchBtnDisabled = true;
                        } else if (creatingAlert) {
                          watchBtnLabel = "Saving...";
                          watchBtnDisabled = true;
                        } else {
                          watchBtnLabel = "Watch this search";
                          watchBtnDisabled = false;
                          onWatchClick = handleWatchSearch;
                        }

                        return (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-center gap-3">
                              <button
                                type="button"
                                onClick={handleEmptySearchPost}
                                className={cn("rounded-full px-6 py-2 text-sm font-semibold transition-all", btnMain)}
                              >
                                Post a ride for {formatShortDate(emptySearch.date)}
                              </button>
                              {Boolean(emptySearch.date) && (
                                <button
                                  type="button"
                                  disabled={watchBtnDisabled}
                                  onClick={onWatchClick}
                                  className={cn(
                                    "rounded-full px-6 py-2 text-sm font-semibold transition-all",
                                    btnCyan,
                                    watchBtnDisabled && "opacity-60 cursor-not-allowed"
                                  )}
                                >
                                  {watchBtnLabel}
                                </button>
                              )}
                            </div>
                            {isCapReached && (
                              <p className={cn("text-xs", muted)}>
                                You can watch up to 5 searches. Remove one on the alerts page.
                              </p>
                            )}
                            {watchMessage && (
                              <div className="space-y-1 text-sm">
                                <p className={cn(isDark ? "text-slate-300" : "text-slate-700")}>
                                  {watchMessage.text}
                                </p>
                                {watchMessage.showLink && (
                                  <button
                                    type="button"
                                    onClick={() => navigate("/alerts")}
                                    className={cn(
                                      "font-semibold underline underline-offset-2 transition-colors",
                                      isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-800"
                                    )}
                                  >
                                    View on alerts page →
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {searchResults.length > 0 && (() => {
                    const uid = currentUser?.uid ?? "";
                    const activeCriteria = searchCriteria ?? emptySearch;
                    const currentAlertId = uid && activeCriteria ? buildAlertId(uid, activeCriteria.date, activeCriteria.from, activeCriteria.to) : "";
                    const isWatching = alerts.some((a) => a.id === currentAlertId);
                    const isCapReached = !isWatching && alerts.length >= MAX_ALERTS;
                    const watchBtnDisabled = !alertsLoaded || alertsLoading || isWatching || isCapReached || creatingAlert;

                    return (
                      <div className="mt-6">
                        <div className="mb-3 flex flex-wrap items-center gap-2 px-1 text-sm">
                          <span className={cn("font-medium", isDark ? "text-slate-400" : "text-slate-600")}>
                            {searchResults.length} {searchResults.length === 1 ? "ride" : "rides"} found
                          </span>
                          <span aria-hidden="true" className={isDark ? "text-slate-600" : "text-slate-300"}>
                            ·
                          </span>
                          {isWatching ? (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 font-medium cursor-default",
                                isDark ? "text-emerald-400" : "text-emerald-600"
                              )}
                            >
                              ✓ Watching
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={watchBtnDisabled}
                              onClick={handleWatchSearch}
                              title={isCapReached ? "You can watch up to 5 searches. Remove one on the alerts page." : undefined}
                              className={cn(
                                "inline-flex items-center gap-1.5 font-medium transition-colors",
                                isDark ? "text-cyan-400 hover:text-cyan-300" : "text-cyan-700 hover:text-cyan-600",
                                watchBtnDisabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              <BellIcon className="h-3.5 w-3.5 shrink-0" />
                              {creatingAlert ? "Saving..." : "Watch this search"}
                            </button>
                          )}
                        </div>

                        {watchMessage && !watchMessage.showLink && watchMessage.text.includes("Could not save") && (
                          <p className="mb-3 px-1 text-xs text-red-500">
                            {watchMessage.text}
                          </p>
                        )}
                        {isCapReached && !isWatching && (
                          <p className={cn("mb-3 px-1 text-xs", muted)}>
                            You can watch up to 5 searches. Remove one on the alerts page.
                          </p>
                        )}

                        <div className="space-y-4">
                          {paginatedSearchResults.map((ride) => (
                            <RideCard
                              key={ride.id}
                              ride={ride}
                              dark={isDark}
                              onShare={handleShareRide}
                              onContactReveal={handleContactReveal}
                            />
                          ))}
                          <Pagination
                            currentPage={safeSearchPage}
                            totalPages={totalSearchPages}
                            onPageChange={setSearchPage}
                            isDark={isDark}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════════════════════════════════
            USER PROFILE & RIDES
        ════════════════════════════════════════════════════════════════════ */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute currentUser={currentUser} authLoading={authLoading}>
              <section className="mx-auto flex min-h-[85vh] w-full max-w-4xl animate-rise flex-col">
                <BackButton onClick={() => navigate("/")} dark={isDark} />
                <div className="mx-auto w-full max-w-2xl space-y-6">
                  {/* a) Account card */}
                  <div className={cn("rounded-3xl p-6 md:p-8 shadow-xl", cardBg)}>
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-4">
                        <Avatar
                          photoURL={currentUser?.photoURL}
                          name={currentUser?.displayName}
                          email={currentUser?.email}
                          className="h-16 w-16"
                        />
                        <div>
                          <h2 className={cn("text-xl font-bold", heading)}>
                            {currentUser?.displayName || "Student"}
                          </h2>
                          {currentUser?.email && (
                            <p className={cn("text-sm", muted)}>{currentUser.email}</p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="rounded-full px-4 py-1.5 text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>

                  {/* b) Contact manager card */}
                  <div className={cn("rounded-3xl p-6 md:p-8 shadow-xl space-y-4", cardBg)}>
                    <h3 className={cn("text-xl font-bold", heading)}>WhatsApp number</h3>

                    {profileStatus === "loading" && (
                      <p className={cn("text-sm", muted)}>Loading…</p>
                    )}

                    {profileStatus === "error" && (
                      <div className="flex items-center gap-3">
                        <p className="text-sm text-red-500">Could not load your saved number.</p>
                        <button
                          type="button"
                          onClick={() => currentUser?.uid && loadUserProfile(currentUser.uid)}
                          className="text-sm font-semibold underline hover:opacity-80 transition-opacity"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    <form onSubmit={handleSaveContact} className="space-y-3">
                      <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                        <input
                          key={userProfile?.contact ?? "none"}
                          name="contact"
                          type="tel"
                          inputMode="numeric"
                          pattern="[6-9][0-9]{9}"
                          title="Enter a valid 10-digit Indian mobile number"
                          required
                          disabled={profileStatus !== "ready" || isSavingContact}
                          defaultValue={userProfile?.contact ?? ""}
                          onInput={(e) => {
                            e.currentTarget.value = sanitizeDigits(e.currentTarget.value);
                          }}
                          placeholder="WhatsApp / phone number"
                          className="field-input flex-1"
                        />
                        <button
                          type="submit"
                          disabled={profileStatus !== "ready" || isSavingContact}
                          className={cn(
                            "rounded-full px-5 py-2 text-sm font-semibold transition-all shrink-0",
                            btnMain,
                            (profileStatus !== "ready" || isSavingContact) && "opacity-60 cursor-not-allowed"
                          )}
                        >
                          {isSavingContact ? "Saving…" : "Save"}
                        </button>
                        {Boolean(userProfile?.contact) && (
                          <button
                            type="button"
                            onClick={handleRemoveContact}
                            disabled={profileStatus !== "ready" || isSavingContact}
                            className={cn(
                              "rounded-full px-4 py-2 text-sm font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-all shrink-0",
                              (profileStatus !== "ready" || isSavingContact) && "opacity-60 cursor-not-allowed"
                            )}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {contactStatusMessage && (
                        <p
                          aria-live="polite"
                          className={cn(
                            "text-sm font-medium",
                            contactStatusMessage === "Could not save. Please try again."
                              ? "text-red-500"
                              : "text-emerald-500"
                          )}
                        >
                          {contactStatusMessage}
                        </p>
                      )}

                      <p className={cn("text-xs leading-relaxed", muted)}>
                        Pre-fills new rides. Past rides keep their original number.
                      </p>
                    </form>
                  </div>

                  {/* c) My Rides card */}
                  <div className={cn("rounded-3xl p-6 md:p-8 shadow-xl", cardBg)}>
                    <div className="mb-7 flex items-center justify-between gap-4">
                      <h2 className={cn("text-xl font-bold", heading)}>My Rides</h2>
                      <button
                        type="button"
                        onClick={() => {
                          loadMyRides();
                          setHistoryPage(1);
                        }}
                        disabled={myRidesLoading}
                        aria-label="Refresh rides"
                        className={cn(
                          "rounded-full p-2.5 text-sm font-semibold transition-all",
                          btnCyan,
                          myRidesLoading && "opacity-60 cursor-not-allowed"
                        )}
                      >
                        <RefreshIcon className={cn("h-5 w-5", myRidesLoading && "animate-spin")} />
                      </button>
                    </div>

                    {myRidesError && (
                      <p className="text-red-500 text-center mb-4">{myRidesError}</p>
                    )}

                    {myRidesLoading && myRides.length === 0 ? (
                      <p className={cn("text-center text-lg", muted)}>Loading rides…</p>
                    ) : myRides.length === 0 && !myRidesError ? (
                      <div className="text-center space-y-4 py-4">
                        <p className={cn("text-lg", muted)}>You haven't posted any rides yet.</p>
                        <button
                          type="button"
                          onClick={() => navigate("/post")}
                          className={cn("rounded-full px-6 py-2.5 text-sm font-semibold transition-all", btnMain)}
                        >
                          Post a ride
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {nextRide && (
                          <div className="space-y-4">
                            <p className={cn("text-xs font-semibold uppercase tracking-widest", muted)}>
                              Next ride
                            </p>
                            {renderUpcomingRide(nextRide)}
                          </div>
                        )}

                        {upcoming.length > 0 && (
                          <div className="space-y-4">
                            <p className={cn("text-xs font-semibold uppercase tracking-widest", muted)}>
                              Other upcoming
                            </p>
                            {upcoming.map((ride) => renderUpcomingRide(ride))}
                          </div>
                        )}

                        {history.length > 0 && (
                          <div className="space-y-4">
                            {(nextRide || upcoming.length > 0) && (
                              <div className={cn("border-t pt-2", isDark ? "border-[rgba(255,255,255,0.06)]" : "border-[#ddd2ea]")} />
                            )}
                            <p className={cn("text-xs font-semibold uppercase tracking-widest", muted)}>
                              Past & Cancelled
                            </p>
                            <div className="space-y-4">
                              {historyPageItems.map((ride) => (
                                <RideCard
                                  key={ride.id}
                                  ride={ride}
                                  dark={isDark}
                                  showActions
                                  onCancel={handleCancelRide}
                                  onToggleAvailability={handleToggleAvailability}
                                  onUpdateSeats={handleUpdateSeats}
                                  onShare={handleShareRide}
                                />
                              ))}
                            </div>

                            <Pagination
                              currentPage={currentHistoryPage}
                              totalPages={historyTotalPages}
                              onPageChange={setHistoryPage}
                              isDark={isDark}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </ProtectedRoute>
          }
        />

        {/* ════════════════════════════════════════════════════════════════════
            WATCHED SEARCHES (ALERTS)
        ════════════════════════════════════════════════════════════════════ */}
        <Route
          path="/alerts"
          element={
            <ProtectedRoute currentUser={currentUser} authLoading={authLoading}>
              <AlertsPage
                alerts={alerts}
                alertMatches={alertMatches}
                uid={currentUser?.uid ?? ""}
                loading={alertsLoading}
                error={alertsError}
                isDark={isDark}
                cardBg={cardBg}
                heading={heading}
                muted={muted}
                btnMain={btnMain}
                btnCyan={btnCyan}
                renderRide={(ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    dark={isDark}
                    onShare={handleShareRide}
                    onContactReveal={handleContactReveal}
                  />
                )}
                onDelete={handleDeleteAlert}
                onSeen={handleAlertSeen}
                onRefresh={() => {
                  if (currentUser?.uid) void fetchAlertsData(currentUser.uid);
                }}
              />
            </ProtectedRoute>
          }
        />

        <Route path="/my-rides" element={<Navigate to="/profile" replace />} />

        {/* ════════════════════════════════════════════════════════════════════
            CATCH-ALL WILDCARD ROUTE
        ════════════════════════════════════════════════════════════════════ */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}

export default App;
