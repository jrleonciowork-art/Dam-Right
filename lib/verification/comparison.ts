export type Criticality = "noncritical" | "important" | "critical";

export type ComparisonStatus =
  | "within_tolerance"
  | "outside_tolerance"
  | "unconfirmed"
  | "missing_measurement"
  | "invalid";

export type StructureSegment = {
  id: string;
  name: string;
  startStationM: number;
  endStationM: number;
  panelReference: string;
};

export type ApprovedCharacteristic = {
  id: string;
  segmentId: string;
  category: "geometry" | "elevation" | "material" | "reinforcement" | "drainage";
  name: string;
  designValue: number;
  unit: string;
  minimumAccepted: number | null;
  maximumAccepted: number | null;
  criticality: Criticality;
  sourceReference: string;
};

export type FieldMeasurement = {
  characteristicId: string;
  measuredValue: number | null;
  uncertaintyPlusMinus: number | null;
  method: string;
  instrumentId: string;
  evidenceReference: string;
  measuredAt: string;
  confirmed: boolean;
};

export type ComparisonResult = {
  characteristic: ApprovedCharacteristic;
  measurement: FieldMeasurement | null;
  status: ComparisonStatus;
  conservativeMinimum: number | null;
  conservativeMaximum: number | null;
  signedVariance: number | null;
  message: string;
};

function finite(value: number | null): value is number {
  return value !== null && Number.isFinite(value);
}

export function formatStation(stationM: number) {
  if (!Number.isFinite(stationM) || stationM < 0) return "Invalid station";
  const kilometres = Math.floor(stationM / 1000);
  const metres = stationM - kilometres * 1000;
  return `${kilometres}+${metres.toFixed(3).padStart(7, "0")}`;
}

export function compareCharacteristic(
  characteristic: ApprovedCharacteristic,
  measurement: FieldMeasurement | null,
): ComparisonResult {
  if (
    !Number.isFinite(characteristic.designValue) ||
    (characteristic.minimumAccepted !== null && !Number.isFinite(characteristic.minimumAccepted)) ||
    (characteristic.maximumAccepted !== null && !Number.isFinite(characteristic.maximumAccepted)) ||
    (characteristic.minimumAccepted !== null &&
      characteristic.maximumAccepted !== null &&
      characteristic.minimumAccepted > characteristic.maximumAccepted)
  ) {
    return {
      characteristic,
      measurement,
      status: "invalid",
      conservativeMinimum: null,
      conservativeMaximum: null,
      signedVariance: null,
      message: "The approved characteristic or acceptance range is invalid.",
    };
  }

  if (!measurement || !finite(measurement.measuredValue)) {
    return {
      characteristic,
      measurement,
      status: "missing_measurement",
      conservativeMinimum: null,
      conservativeMaximum: null,
      signedVariance: null,
      message: "No finite field measurement has been recorded.",
    };
  }

  if (!finite(measurement.uncertaintyPlusMinus) || measurement.uncertaintyPlusMinus < 0) {
    return {
      characteristic,
      measurement,
      status: "invalid",
      conservativeMinimum: null,
      conservativeMaximum: null,
      signedVariance: measurement.measuredValue - characteristic.designValue,
      message: "A finite non-negative measurement uncertainty is required.",
    };
  }

  const conservativeMinimum = measurement.measuredValue - measurement.uncertaintyPlusMinus;
  const conservativeMaximum = measurement.measuredValue + measurement.uncertaintyPlusMinus;
  const signedVariance = measurement.measuredValue - characteristic.designValue;

  if (!measurement.confirmed) {
    return {
      characteristic,
      measurement,
      status: "unconfirmed",
      conservativeMinimum,
      conservativeMaximum,
      signedVariance,
      message: "The measurement and its source evidence require checker confirmation.",
    };
  }

  const belowMinimum =
    characteristic.minimumAccepted !== null &&
    conservativeMinimum < characteristic.minimumAccepted;
  const aboveMaximum =
    characteristic.maximumAccepted !== null &&
    conservativeMaximum > characteristic.maximumAccepted;

  if (belowMinimum || aboveMaximum) {
    const reasons = [
      belowMinimum
        ? `conservative minimum ${conservativeMinimum.toFixed(3)} is below ${characteristic.minimumAccepted?.toFixed(3)}`
        : null,
      aboveMaximum
        ? `conservative maximum ${conservativeMaximum.toFixed(3)} exceeds ${characteristic.maximumAccepted?.toFixed(3)}`
        : null,
    ].filter((reason): reason is string => reason !== null);

    return {
      characteristic,
      measurement,
      status: "outside_tolerance",
      conservativeMinimum,
      conservativeMaximum,
      signedVariance,
      message: `${reasons.join(" and ")} ${characteristic.unit}. Engineering disposition is required.`,
    };
  }

  return {
    characteristic,
    measurement,
    status: "within_tolerance",
    conservativeMinimum,
    conservativeMaximum,
    signedVariance,
    message: "The complete uncertainty interval is within the approved acceptance range.",
  };
}

export function compareAsBuilt(
  characteristics: ApprovedCharacteristic[],
  measurements: FieldMeasurement[],
) {
  const measurementsByCharacteristic = new Map(
    measurements.map((measurement) => [measurement.characteristicId, measurement]),
  );

  return characteristics.map((characteristic) =>
    compareCharacteristic(
      characteristic,
      measurementsByCharacteristic.get(characteristic.id) ?? null,
    ),
  );
}

export function summarizeComparisons(results: ComparisonResult[]) {
  return {
    withinTolerance: results.filter((result) => result.status === "within_tolerance").length,
    outsideTolerance: results.filter((result) => result.status === "outside_tolerance").length,
    awaitingConfirmation: results.filter((result) => result.status === "unconfirmed").length,
    missing: results.filter((result) => result.status === "missing_measurement").length,
    invalid: results.filter((result) => result.status === "invalid").length,
    releaseBlocked: results.some(
      (result) =>
        result.status !== "within_tolerance" &&
        result.characteristic.criticality === "critical",
    ),
  };
}

