import { describe, it, expect } from "vitest";
import { parseWhen } from "./when-parser.js";

// Fixed "now": 2026-09-07 10:00 local, so tests are deterministic.
const NOW = new Date(2026, 8, 7, 10, 0, 0, 0).getTime();
const at = (y: number, mon: number, d: number, h: number, m = 0) => new Date(y, mon, d, h, m, 0, 0).getTime();

describe("parseWhen", () => {
  it("time with an explicit 'today' -> today at that time (the delegation example)", () => {
    const r = parseWhen("papa, mujhe academy jana hai 6 PM today", NOW);
    expect(r.dueAt).toBe(at(2026, 8, 7, 18));
    expect(r.hasTime).toBe(true);
    expect(r.hasDate).toBe(true);
  });

  it("time with no date defaults to today", () => {
    const r = parseWhen("call plumber 6 pm", NOW);
    expect(r.dueAt).toBe(at(2026, 8, 7, 18));
    expect(r.hasDate).toBe(false);
    expect(r.hasTime).toBe(true);
  });

  it("'kal 7am' -> tomorrow 07:00", () => {
    expect(parseWhen("kal 7am dawai leni hai", NOW).dueAt).toBe(at(2026, 8, 8, 7));
  });

  it("'shaam 6 baje' -> today 18:00 (period disambiguates the hour)", () => {
    expect(parseWhen("shaam 6 baje", NOW).dueAt).toBe(at(2026, 8, 7, 18));
  });

  it("a period word alone sets a default hour", () => {
    expect(parseWhen("subah walk", NOW).dueAt).toBe(at(2026, 8, 7, 8));
  });

  it("a date with no time defaults to a morning hour", () => {
    const r = parseWhen("kal", NOW);
    expect(r.dueAt).toBe(at(2026, 8, 8, 9));
    expect(r.hasTime).toBe(false);
    expect(r.hasDate).toBe(true);
  });

  it("24-hour clock", () => {
    expect(parseWhen("meeting 18:30", NOW).dueAt).toBe(at(2026, 8, 7, 18, 30));
  });

  it("12pm is noon and 12am is midnight", () => {
    expect(parseWhen("lunch 12 pm", NOW).dueAt).toBe(at(2026, 8, 7, 12));
    expect(parseWhen("alarm 12 am", NOW).dueAt).toBe(at(2026, 8, 7, 0));
  });

  it("explicit day/month", () => {
    expect(parseWhen("cake 25 dec 9am", NOW).dueAt).toBe(at(2026, 11, 25, 9));
  });

  it("a weekday resolves to its upcoming occurrence", () => {
    const r = parseWhen("monday 9am gym", NOW);
    expect(r.dueAt).not.toBeNull();
    const d = new Date(r.dueAt!);
    expect(d.getDay()).toBe(1); // Monday
    expect(d.getHours()).toBe(9);
    expect(r.dueAt!).toBeGreaterThan(NOW);
  });

  it("nothing recognised -> null", () => {
    const r = parseWhen("buy some milk", NOW);
    expect(r.dueAt).toBeNull();
    expect(r.hasDate).toBe(false);
    expect(r.hasTime).toBe(false);
  });
});
