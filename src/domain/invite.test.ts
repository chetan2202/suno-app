import { describe, it, expect } from "vitest";
import { encodeInvite, decodeInvite } from "./invite.js";

describe("household invite", () => {
  it("round-trips an invite through encode/decode", () => {
    const invite = { v: 1 as const, hid: "hh-123", hname: "Sharma Home", profile: "vegetarian" };
    const decoded = decodeInvite(encodeInvite(invite));
    expect(decoded).toEqual(invite);
  });

  it("rejects non-Suno or malformed codes", () => {
    expect(decodeInvite("hello")).toBeNull();
    expect(decodeInvite("suno:not-base64!!")).toBeNull();
    expect(decodeInvite("")).toBeNull();
  });
});
