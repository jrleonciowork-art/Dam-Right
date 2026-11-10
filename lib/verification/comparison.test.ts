import { describe, expect, it } from "vitest";
import {
  compareAsBuilt,
  compareCharacteristic,
  formatStation,
  summarizeComparisons,
  type ApprovedCharacteristic,
  type FieldMeasurement,
} from "./comparison";
import {
  DEFAULT_APPROVED_CHARACTERISTICS,
  DEFAULT_FIELD_MEASUREMENTS,
} from "./defaults";

const characteristic: ApprovedCharacteristic = {
  id: "thickness",
  segmentId: "segment-a",
  category: "geometry",
  name: "Stem thickness",
  designValue: 500,
  unit: "mm",
  minimumAccepted: 490,
  maximumAccepted: null,
  criticality: "critical",
  sourceReference: "S-05",
};

function measurement(overrides: Partial<FieldMeasurement> = {}): FieldMeasurement {
  return {
    characteristicId: characteristic.id,
    measuredValue: 500,
    uncertaintyPlusMinus: 5,
    method: "Survey",
    instrumentId: "TS-01",
    evidenceReference: "SR-01",
    measuredAt: "2026-10-18",
    confirmed: true,
    ...overrides,
  };
}

describe("as-built comparison", () => {
  it("uses the adverse uncertainty bound for a minimum requirement", () => {
    const result = compareCharacteristic(characteristic, measurement({ measuredValue: 494 }));

    expect(result.conservativeMinimum).toBe(489);
    expect(result.status).toBe("outside_tolerance");
  });

  it("passes only when the complete uncertainty interval is accepted", () => {
    const result = compareCharacteristic(characteristic, measurement({ measuredValue: 500 }));

    expect(result.conservativeMinimum).toBe(495);
    expect(result.status).toBe("within_tolerance");
  });

  it("does not use an unconfirmed measurement for acceptance", () => {
    const result = compareCharacteristic(
      characteristic,
      measurement({ measuredValue: 510, confirmed: false }),
    );

    expect(result.status).toBe("unconfirmed");
  });

  it("rejects missing or negative uncertainty", () => {
    expect(
      compareCharacteristic(characteristic, measurement({ uncertaintyPlusMinus: null })).status,
    ).toBe("invalid");
    expect(
      compareCharacteristic(characteristic, measurement({ uncertaintyPlusMinus: -1 })).status,
    ).toBe("invalid");
  });

  it("evaluates bilateral tolerances conservatively", () => {
    const bilateral = { ...characteristic, minimumAccepted: 490, maximumAccepted: 510 };

    expect(
      compareCharacteristic(bilateral, measurement({ measuredValue: 507, uncertaintyPlusMinus: 4 }))
        .status,
    ).toBe("outside_tolerance");
  });

  it("summarizes the locked demonstration measurements", () => {
    const results = compareAsBuilt(
      DEFAULT_APPROVED_CHARACTERISTICS,
      DEFAULT_FIELD_MEASUREMENTS,
    );
    const summary = summarizeComparisons(results);

    expect(summary.withinTolerance).toBe(3);
    expect(summary.outsideTolerance).toBe(2);
    expect(summary.awaitingConfirmation).toBe(1);
    expect(summary.releaseBlocked).toBe(true);
  });

  it("flags truncated sheet pile as outside tolerance with conservative uncertainty", () => {
    const sheetPileChar = DEFAULT_APPROVED_CHARACTERISTICS.find(
      (c) => c.id === "sheet-pile-depth-a",
    )!;
    const sheetPileMeas = DEFAULT_FIELD_MEASUREMENTS.find(
      (m) => m.characteristicId === "sheet-pile-depth-a",
    )!;
    const result = compareCharacteristic(sheetPileChar, sheetPileMeas);

    expect(result.status).toBe("outside_tolerance");
    expect(result.conservativeMinimum).toBe(4400);
    expect(result.characteristic.criticality).toBe("critical");
  });

  it("formats civil station notation without losing millimetres", () => {
    expect(formatStation(0)).toBe("0+000.000");
    expect(formatStation(1234.567)).toBe("1+234.567");
  });
});

