import { describe, expect, it } from "vitest";
import { getIsDark } from "../../theme";

describe("test setup", () => {
  it("runs TypeScript tests in node", () => {
    expect(typeof getIsDark).toBe("function");
  });
});
