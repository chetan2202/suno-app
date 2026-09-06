import { describe, it, expect } from "vitest";
import { compareOperations, dedupeOperations, orderOperations } from "./order.js";
import { makeOp } from "./test-helpers.js";

describe("operation ordering", () => {
  it("orders by logical_version first", () => {
    const a = makeOp({ operation_type: "ADD", logical_version: 1 });
    const b = makeOp({ operation_type: "ADD", logical_version: 2 });
    expect(compareOperations(a, b)).toBeLessThan(0);
    expect(compareOperations(b, a)).toBeGreaterThan(0);
  });

  it("tie-breaks by device_id then sequence", () => {
    const a = makeOp({ operation_type: "ADD", logical_version: 5, device_id: "dev-A", sequence: 9 });
    const b = makeOp({ operation_type: "ADD", logical_version: 5, device_id: "dev-B", sequence: 1 });
    expect(compareOperations(a, b)).toBeLessThan(0); // A < B by device_id

    const c = makeOp({ operation_type: "ADD", logical_version: 5, device_id: "dev-A", sequence: 2 });
    const d = makeOp({ operation_type: "ADD", logical_version: 5, device_id: "dev-A", sequence: 3 });
    expect(compareOperations(c, d)).toBeLessThan(0); // by sequence
  });

  it("dedupes by operation_id keeping the first seen", () => {
    const a = makeOp({ operation_type: "ADD", operation_id: "op-1" });
    const dup = makeOp({ operation_type: "DELETE", operation_id: "op-1" });
    const b = makeOp({ operation_type: "ADD", operation_id: "op-2" });
    const result = dedupeOperations([a, dup, b]);
    expect(result).toHaveLength(2);
    expect(result[0]!.operation_type).toBe("ADD");
    expect(result.map((o) => o.operation_id)).toEqual(["op-1", "op-2"]);
  });

  it("orderOperations dedupes and sorts without mutating input", () => {
    const input = [
      makeOp({ operation_type: "ADD", operation_id: "op-3", logical_version: 3 }),
      makeOp({ operation_type: "ADD", operation_id: "op-1", logical_version: 1 }),
      makeOp({ operation_type: "ADD", operation_id: "op-1", logical_version: 1 }),
      makeOp({ operation_type: "ADD", operation_id: "op-2", logical_version: 2 }),
    ];
    const ordered = orderOperations(input);
    expect(ordered.map((o) => o.operation_id)).toEqual(["op-1", "op-2", "op-3"]);
    expect(input).toHaveLength(4); // input untouched
  });
});
