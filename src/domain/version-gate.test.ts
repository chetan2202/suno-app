import { describe, it, expect } from "vitest";
import { advanceRequiredVersion, isUpdateRequired } from "./version-gate.js";

describe("version gate", () => {
  it("blocks a device older than the household requires", () => {
    expect(isUpdateRequired(1, 2)).toBe(true);
  });

  it("allows a device at or above the required version", () => {
    expect(isUpdateRequired(2, 2)).toBe(false);
    expect(isUpdateRequired(3, 2)).toBe(false);
  });

  it("advances the required version only forward when the admin updates", () => {
    expect(advanceRequiredVersion(1, 2)).toBe(2); // admin moved up
    expect(advanceRequiredVersion(0, 1)).toBe(1); // first set
    expect(advanceRequiredVersion(3, 2)).toBe(3); // never moves back
  });
});
