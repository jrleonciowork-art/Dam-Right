import { describe, expect, it } from "vitest";
import { affectedChecks, dependencyFingerprint } from "./dependencies";

describe("calculation dependencies", () => {
  it("invalidates downstream checks when scour changes", () => {
    expect(affectedChecks(["subsurface.designScourDepthM"])).toEqual(
      expect.arrayContaining(["scour", "sliding", "overturning", "bearing", "piping"]),
    );
  });

  it("produces stable fingerprints independent of object key order", () => {
    expect(dependencyFingerprint({ b: 2, a: 1 })).toBe(dependencyFingerprint({ a: 1, b: 2 }));
  });
});
