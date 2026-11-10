import { describe, expect, it } from "vitest";
import { DRAFT_PHILIPPINE_FLOOD_WALL_PACK, resolveWallCriteria } from "./rule-pack";

describe("rule-pack resolution", () => {
  it("keeps draft criteria explicitly unapproved", () => {
    const resolved = resolveWallCriteria(DRAFT_PHILIPPINE_FLOOD_WALL_PACK);

    expect(resolved.minimumSlidingFs).toBe(1.5);
    expect(resolved.approved).toBe(false);
    expect(resolved.packVersion).toContain("draft");
  });
});
