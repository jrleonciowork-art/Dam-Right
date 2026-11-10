import { describe, expect, it } from "vitest";
import { POST } from "../../app/api/parse-blueprint/route";
import { NextRequest } from "next/server";

describe("/api/parse-blueprint endpoint", () => {
  it("returns 400 when no file is uploaded", async () => {
    const formData = new FormData();
    const req = new NextRequest("http://localhost:3000/api/parse-blueprint", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("No blueprint file provided");
  });

  it("successfully parses a standard blueprint file and produces compliance report", async () => {
    const formData = new FormData();
    const file = new File(["%PDF-1.4 Mock drawing"], "DPWH_Standard_Cantilever_Wall_S05.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/parse-blueprint", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.sourceFileName).toBe("DPWH_Standard_Cantilever_Wall_S05.pdf");
    expect(json.extractedData).toBeDefined();
    expect(json.extractedData.dimensions.wallHeightM).toBe(4.5);
    expect(json.complianceReport.length).toBeGreaterThan(0);
    expect(json.summary).toBeDefined();
    expect(json.summary.incomplete).toBeDefined();
    expect(json.candidateGroups).toBeDefined();
  });

  it("identifies missing data on incomplete blueprints", async () => {
    const formData = new FormData();
    const file = new File(["%PDF-1.4 Mock drawing"], "Incomplete_Blueprint_Missing_Footing.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/parse-blueprint", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.criticalMissing).toBeGreaterThan(0);
    const baseWidthFlag = json.missingDataFlags.find(
      (f: { field: string }) => f.field === "dimensions.baseWidthM",
    );
    expect(baseWidthFlag).toBeDefined();
    expect(baseWidthFlag.severity).toBe("critical");
    expect(json.complianceReport.some(
      (finding: { status: string }) => finding.status === "insufficient_information",
    )).toBe(true);
  });

  it("identifies code violations on structurally deficient plans", async () => {
    const formData = new FormData();
    const file = new File(["%PDF-1.4 Mock drawing"], "FloodWall_Deficient_Section_Fail.pdf", {
      type: "application/pdf",
    });
    formData.append("file", file);

    const req = new NextRequest("http://localhost:3000/api/parse-blueprint", {
      method: "POST",
      body: formData,
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.summary.violations).toBeGreaterThan(0);
    const fcViolation = json.complianceReport.find(
      (f: { ruleId: string }) => f.ruleId === "NSCP-419.2-FC-MIN",
    );
    expect(fcViolation).toBeDefined();
    expect(fcViolation.status).toBe("violation");
  });
});
