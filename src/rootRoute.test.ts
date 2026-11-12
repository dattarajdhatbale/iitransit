import { describe, expect, it } from "vitest";
import { rootRoute, type RootRouteInput } from "./rootRoute";

const visit = (over: Partial<RootRouteInput>) =>
  rootRoute({ pathname: "/", hash: "", firstPage: true, skipLanding: () => false, ...over });

describe("rootRoute", () => {
  it("shows the landing page on / to new visitors", () => {
    expect(visit({})).toEqual({ show: "landing" });
  });

  it("sends returning users and installed apps from / to /app on the first page", () => {
    expect(visit({ skipLanding: () => true })).toEqual({ redirect: "/app", keepHash: false });
  });

  it("shows the landing page on / after navigating inside the site, even for returning users", () => {
    expect(visit({ firstPage: false, skipLanding: () => true })).toEqual({ show: "landing" });
  });

  it("shows the landing page for a link to a section, even for returning users", () => {
    expect(visit({ hash: "#faq", skipLanding: () => true })).toEqual({ show: "landing" });
  });

  it("always shows the landing page on /about, and ignores a trailing slash", () => {
    expect(visit({ pathname: "/about", skipLanding: () => true })).toEqual({ show: "landing" });
    expect(visit({ pathname: "/about/", skipLanding: () => true })).toEqual({ show: "landing" });
  });

  it("moves the old preview link to /about", () => {
    expect(visit({ pathname: "/intro-preview" })).toEqual({ redirect: "/about", keepHash: true });
  });

  it("leaves every other path to the app, and only asks about skipping on /", () => {
    let asked = 0;
    const skipLanding = () => (asked++, true);
    for (const pathname of ["/app", "/search", "/post", "/profile", "/nope"]) {
      expect(visit({ pathname, skipLanding })).toEqual({ show: "app" });
    }
    expect(asked).toBe(0);
  });
});
