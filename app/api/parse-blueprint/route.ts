import { NextRequest, NextResponse } from "next/server";
import type {
  BlueprintParseResult,
  ExtractedBlueprintData,
} from "../../../lib/blueprint/types";
import { detectMissingData } from "../../../lib/blueprint/missing-data";
import { evaluateStructuralCompliance } from "../../../lib/blueprint/compliance";
import {
  reconcileBlueprintCandidates,
  type BlueprintCandidate,
} from "../../../lib/blueprint/candidates";
import { parseExtractedBlueprintData } from "../../../lib/blueprint/extraction-schema";
import {
  BlueprintFileValidationError,
  validateBlueprintFileMetadata,
  validateBlueprintFileSignature,
} from "../../../lib/blueprint/file-validation";

export const maxDuration = 60; // Allow sufficient time for vision/multimodal reasoning

const SYSTEM_EXTRACTION_PROMPT = `
You are a senior civil and structural engineering plan checker specialized in flood-control structures, river revetments, retaining walls, and Philippine DPWH / USACE / NSCP standards.
Your task is to analyze the attached structural drawing/blueprint PDF or image and extract all design dimensions, material specifications, reinforcement details, subsurface foundation data, and hydrological/geotechnical criteria.

SPECIAL EMPHASIS FOR PHILIPPINE DPWH FLOOD CONTROL DRAWINGS:
1. Title Block (typically bottom-right corner or title margin):
   - Look for Project Name, Implementing Office (e.g. DPWH Regional Office, Zamboanga del Sur 1st/2nd DEO), Municipality, Province, Station Limits (e.g. Sta. 0+000 to Sta. 1+500), Sheet Number, Contract ID, and the Engineer of Record (PRC license).
2. Typical Section & Geometry:
   - Identify Wall Height (H), stem top/bottom thickness, footing base width (B), footing thickness, toe and heel projections.
   - Pay close attention to elevations: Top of Wall / Crest Elevation, River Bed Elevation, Natural Ground Line (NGL), High Water Level (HWL), and Scour Depth.
3. Subsurface & Sheet Pile Cutoff:
   - Check if steel sheet piles (e.g. Type II, III, IV, or Hat-type) or concrete cutoffs are called out.
   - Extract embedment depth below riverbed / footing base.
4. General Notes & Material Specifications:
   - Concrete: Look for compressive strength f'c at 28 days (e.g. 20.7 MPa / 3000 psi, 24 MPa, 28 MPa).
   - Rebar: Look for Grade 40 (275 MPa) or Grade 60 (414 MPa), deformed bars (Item 404).
   - Minimum clear cover (e.g. 75 mm for earth contact).

OUTPUT REQUIREMENTS:
You MUST respond with ONLY a single raw JSON object (no markdown fences, no explanatory text).

JSON SCHEMA:
{
  "metadata": {
    "projectName": string,
    "structureId": string,
    "sheetNumber": string,
    "sheetTitle": string,
    "revision": string,
    "issueStatus": "approved_for_construction" | "as_built" | "preliminary" | "superseded" | "unknown",
    "date": string,
    "engineerOfRecord": string
  },
  "dimensions": {
    "wallHeightM": number | null,        // Total height from base of footing to wall crest (in meters)
    "crestElevationM": number | null,   // Finished top-of-wall crest elevation (in meters or datum)
    "baseWidthM": number | null,        // Total width of foundation footing slab (in meters)
    "stemThicknessM": number | null,    // Wall stem thickness at footing junction (in meters)
    "baseThicknessM": number | null,    // Foundation footing slab thickness (in meters)
    "toeWidthM": number | null,         // Dry-side footing toe projection width (in meters)
    "heelWidthM": number | null,        // Wet/backfill side footing heel projection width (in meters)
    "embedmentDepthM": number | null    // Depth of foundation embedment below ground (in meters)
  },
  "materials": {
    "concreteStrengthMPa": number | null,  // f'c compressive strength (in MPa, e.g. 20.7, 24, 28)
    "concreteUnitWeightKNM3": number | null, // Typically 23.5 - 24.0 kN/m3
    "rebarYieldStrengthMPa": number | null, // fy reinforcing steel yield strength (in MPa, e.g. 275 or 414)
    "rebarSizeMm": number | null,           // Main vertical stem flexural bar diameter in mm (e.g. 16, 20, 25)
    "rebarSpacingMm": number | null,        // Main vertical bar spacing in mm (e.g. 150, 200)
    "concreteCoverMm": number | null        // Specified clear concrete cover in mm (e.g. 50, 75)
  },
  "hydrologyGeotech": {
    "designFloodElevationM": number | null, // High water level / design flood head in meters
    "wetSideLevelM": number | null,         // Operational or maximum wet-side water head in meters
    "drySideLevelM": number | null,         // Dry side tailwater depth in meters
    "frictionCoefficient": number | null,   // Foundation base sliding friction coefficient mu (e.g. 0.45)
    "soilUnitWeightKNM3": number | null,    // Granular backfill moist unit weight (in kN/m3, e.g. 18)
    "soilFrictionAngleDeg": number | null,  // Internal friction angle phi in degrees (e.g. 30, 32)
    "allowableBearingKPa": number | null,   // Allowable soil bearing capacity in kPa (e.g. 150, 200)
    "surchargeKPa": number | null,          // Uniform live/traffic surcharge in kPa (e.g. 10)
    "drainageEfficiency": number | null,    // Weep hole / drainage relief factor between 0.0 and 1.0
    "retainedSoilHeightM": number | null,   // Retained-soil height acting on the wall
    "designScourDepthM": number | null,     // Approved design scour depth below the reference bed/grade
    "foundationSoilType": "fine_sand" | "coarse_sand" | "silt" | "clay" | "gravel" | null
  },
  "rawNotes": [string]                     // Array of extracted key general notes, specifications, or citations
}

IMPORTANT EXTRACTION RULES:
1. Always convert all linear dimensions to METERS (e.g. 500 mm -> 0.5; 2400 mm -> 2.4).
2. Always convert concrete/rebar strength to MPa (e.g. 3000 psi -> 20.7 MPa; 4000 psi -> 27.6 MPa; Grade 40 -> 275 MPa; Grade 60 -> 414 MPa).
3. If a dimension or parameter is NOT explicitly labeled or legible anywhere on the sheet, output null. DO NOT guess or fabricate missing dimensions.
`;

function getMockExtractionData(fileName: string): ExtractedBlueprintData {
  const isDeficient = fileName.toLowerCase().includes("deficient") || fileName.toLowerCase().includes("fail");
  const isMissing = fileName.toLowerCase().includes("incomplete") || fileName.toLowerCase().includes("missing");

  return {
    metadata: {
      projectName: "Pampanga River Basin Flood Mitigation Project - Sector 4",
      structureId: "PRB-CW-04A",
      sheetNumber: "S-05",
      sheetTitle: "Standard Cantilever Flood Wall - Section & Schedule",
      revision: "Rev 0",
      issueStatus: "approved_for_construction",
      date: "2026-10-18",
      engineerOfRecord: "Engr. Roberto D. Alcantara, PE (PRC No. 0089412)",
    },
    dimensions: {
      wallHeightM: 4.5,
      crestElevationM: 8.5,
      baseWidthM: isMissing ? null : isDeficient ? 1.8 : 2.8,
      stemThicknessM: isDeficient ? 0.22 : 0.40,
      baseThicknessM: 0.50,
      toeWidthM: 0.70,
      heelWidthM: isMissing ? null : isDeficient ? 0.88 : 1.70,
      embedmentDepthM: 1.20,
    },
    materials: {
      concreteStrengthMPa: isDeficient ? 17.5 : 24.0,
      concreteUnitWeightKNM3: 24.0,
      rebarYieldStrengthMPa: 414.0,
      rebarSizeMm: 20,
      rebarSpacingMm: 150,
      concreteCoverMm: isDeficient ? 40 : 75,
    },
    hydrologyGeotech: {
      designFloodElevationM: 3.8,
      wetSideLevelM: 3.8,
      drySideLevelM: 0.0,
      frictionCoefficient: isMissing ? null : 0.45,
      soilUnitWeightKNM3: 18.0,
      soilFrictionAngleDeg: 30.0,
      allowableBearingKPa: 160.0,
      surchargeKPa: 10.0,
      drainageEfficiency: 0.3,
      retainedSoilHeightM: 3.6,
      designScourDepthM: 0.6,
      foundationSoilType: "fine_sand",
    },
    rawNotes: [
      "All reinforced concrete work shall conform to NSCP 2015 and DPWH Standard Specifications Item 405.",
      "Concrete Compressive Strength f'c = 24 MPa at 28 days for Class A mix.",
      "Reinforcing steel: ASTM A615 Grade 60 (fy = 414 MPa) with deformed bars.",
      "Minimum concrete clear cover: 75 mm for concrete deposited against native soil.",
      "Provide 50 mm diameter PVC weep holes with filter cloth spaced at 2.0 m on center.",
    ],
  };
}

async function callGeminiVision(
  apiKey: string,
  base64Data: string,
  mimeType: string,
): Promise<{ data: ExtractedBlueprintData; modelName: string }> {
  // Ordered list of vision models to try if the primary encounters high demand (503) or transient failures
  const candidateModels = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-2.5-pro"];

  let lastError: Error | null = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          parts: [
            { text: SYSTEM_EXTRACTION_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      },
    };

    // Retry up to 3 times per model for 503 or network glitches
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) => setTimeout(resolve, 1500 * Math.pow(2, attempt - 1)));
        }

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.status === 503 || response.status === 429) {
          // Model busy or rate-limited, wait and retry or switch model
          const errText = await response.text();
          lastError = new Error(`Gemini (${model}) ${response.status}: ${errText}`);
          continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
        }

        const json = await response.json();
        let rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          throw new Error(`No text content returned from ${model}.`);
        }

        // Strip markdown code fences if returned
        rawText = rawText.trim();
        if (rawText.startsWith("```json")) {
          rawText = rawText.replace(/^```json\s*/, "").replace(/```$/, "").trim();
        } else if (rawText.startsWith("```")) {
          rawText = rawText.replace(/^```\s*/, "").replace(/```$/, "").trim();
        }

        const parsedData = parseExtractedBlueprintData(JSON.parse(rawText));
        return { data: parsedData, modelName: model };
      } catch (err) {
        lastError = err as Error;
        // If it's a DNS or network drop, retry briefly
        console.warn(`Attempt ${attempt + 1} with ${model} failed:`, (err as Error).message);
      }
    }
  }

  throw lastError || new Error("Failed to process blueprint with Gemini Vision.");
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No blueprint file provided. Upload a PDF, PNG, or JPEG file." },
        { status: 400 },
      );
    }

    validateBlueprintFileMetadata(file);

    // Provider credentials are server-managed only. Never accept API keys from
    // browser form fields or request headers where they may be logged or leaked.
    const serverApiKey = process.env.GEMINI_API_KEY;

    let extractedData: ExtractedBlueprintData;
    let aiProvider = "Local Civil Engineering Rule Parser (Demonstration Mode)";

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    validateBlueprintFileSignature(new Uint8Array(buffer), file.type);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "application/pdf";

    if (serverApiKey && serverApiKey.trim().length > 0) {
      const visionResult = await callGeminiVision(serverApiKey, base64Data, mimeType);
      extractedData = visionResult.data;
      aiProvider = `Google ${visionResult.modelName} Multimodal Vision`;
    } else if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      extractedData = parseExtractedBlueprintData(getMockExtractionData(file.name));
      aiProvider = "Automated Test Rule Parser";
    } else {
      return NextResponse.json(
        {
          error: "No GEMINI_API_KEY configured on the server. Please set your API key in .env.local to enable live blueprint vision reading.",
        },
        { status: 500 },
      );
    }

    // 1. Missing Data Detection & Anomaly Reporting
    const missingDataFlags = detectMissingData(extractedData);

    // 2. Structural Code Compliance Evaluation
    const complianceReport = evaluateStructuralCompliance(extractedData);

    // 3. Blueprint Candidate Reconciliation Integration (lib/blueprint/candidates.ts)
    const blueprintCandidates: BlueprintCandidate[] = [];
    const revisionState: BlueprintCandidate["revisionState"] =
      extractedData.metadata.issueStatus === "approved_for_construction" ||
      extractedData.metadata.issueStatus === "as_built"
        ? "approved"
        : extractedData.metadata.issueStatus === "superseded"
          ? "superseded"
          : extractedData.metadata.issueStatus === "preliminary"
            ? "current_unapproved"
            : "unknown";
    if (extractedData.dimensions.wallHeightM !== null) {
      blueprintCandidates.push({
        id: "cand-wall-height",
        fieldKey: "geometry.wallHeightM",
        rawText: `${extractedData.dimensions.wallHeightM} m`,
        normalizedValue: extractedData.dimensions.wallHeightM,
        unit: "m",
        pageNumber: null,
        boundingPolygon: [],
        sourceRevisionId: extractedData.metadata.revision || "Rev 0",
        revisionState,
        extractionMethod: serverApiKey ? "multimodal_model" : "native_pdf_text",
        confidence: null,
        reviewDecision: "unreviewed",
      });
    }

    if (extractedData.dimensions.stemThicknessM !== null) {
      blueprintCandidates.push({
        id: "cand-stem-thickness",
        fieldKey: "geometry.stemThicknessM",
        rawText: `${(extractedData.dimensions.stemThicknessM * 1000).toFixed(0)} mm`,
        normalizedValue: extractedData.dimensions.stemThicknessM,
        unit: "m",
        pageNumber: null,
        boundingPolygon: [],
        sourceRevisionId: extractedData.metadata.revision || "Rev 0",
        revisionState,
        extractionMethod: serverApiKey ? "multimodal_model" : "native_pdf_text",
        confidence: null,
        reviewDecision: "unreviewed",
      });
    }

    if (extractedData.dimensions.baseWidthM !== null) {
      blueprintCandidates.push({
        id: "cand-base-width",
        fieldKey: "geometry.baseWidthM",
        rawText: `${extractedData.dimensions.baseWidthM} m`,
        normalizedValue: extractedData.dimensions.baseWidthM,
        unit: "m",
        pageNumber: null,
        boundingPolygon: [],
        sourceRevisionId: extractedData.metadata.revision || "Rev 0",
        revisionState,
        extractionMethod: serverApiKey ? "multimodal_model" : "native_pdf_text",
        confidence: null,
        reviewDecision: "unreviewed",
      });
    }

    const candidateGroups = reconcileBlueprintCandidates(blueprintCandidates);

    const violations = complianceReport.filter((f) => f.status === "violation").length;
    const warnings = complianceReport.filter((f) => f.status === "warning").length;
    const incomplete = complianceReport.filter(
      (f) => f.status === "insufficient_information" || f.status === "not_evaluated",
    ).length;
    const passed = complianceReport.filter((f) => f.status === "pass").length;
    const criticalMissing = missingDataFlags.filter((f) => f.severity === "critical").length;

    const result: BlueprintParseResult & { candidateGroups: typeof candidateGroups } = {
      success: true,
      sourceFileName: file.name,
      fileSizeBytes: file.size,
      extractedData,
      missingDataFlags,
      complianceReport,
      candidateGroups,
      summary: {
        totalMissing: missingDataFlags.length,
        criticalMissing,
        violations,
        warnings,
        incomplete,
        passed,
      },
      aiProvider,
      parsedAt: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Blueprint parsing failed:", err);
    if (err instanceof BlueprintFileValidationError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: 400 },
      );
    }
    return NextResponse.json(
      {
        error: "Failed to parse blueprint document.",
        code: "blueprint_processing_failed",
      },
      { status: 500 },
    );
  }
}
