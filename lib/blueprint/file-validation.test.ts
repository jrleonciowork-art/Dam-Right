import { describe, expect, it } from "vitest";
import {
  BlueprintFileValidationError,
  validateBlueprintFileMetadata,
  validateBlueprintFileSignature,
} from "./file-validation";

describe("blueprint file validation", () => {
  it("accepts matching PDF metadata and signature", () => {
    const file = new File(["%PDF-1.7"], "drawing.pdf", { type: "application/pdf" });

    expect(() => validateBlueprintFileMetadata(file)).not.toThrow();
    expect(() => validateBlueprintFileSignature(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), file.type)).not.toThrow();
  });

  it("rejects unsupported file types", () => {
    const file = new File(["drawing"], "drawing.txt", { type: "text/plain" });

    expect(() => validateBlueprintFileMetadata(file)).toThrow(BlueprintFileValidationError);
  });

  it("rejects spoofed file signatures", () => {
    expect(() =>
      validateBlueprintFileSignature(new TextEncoder().encode("not a PDF"), "application/pdf"),
    ).toThrow(/does not match/);
  });
});
