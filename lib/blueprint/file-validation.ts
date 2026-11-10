const MAX_BLUEPRINT_BYTES = 25 * 1024 * 1024;

const ALLOWED_TYPES = new Map([
  ["application/pdf", [".pdf"]],
  ["image/png", [".png"]],
  ["image/jpeg", [".jpg", ".jpeg"]],
]);

export class BlueprintFileValidationError extends Error {
  constructor(
    public readonly code:
      | "file_too_large"
      | "unsupported_file_type"
      | "extension_mismatch"
      | "invalid_file_signature",
    message: string,
  ) {
    super(message);
    this.name = "BlueprintFileValidationError";
  }
}

export function validateBlueprintFileMetadata(file: File) {
  if (file.size > MAX_BLUEPRINT_BYTES) {
    throw new BlueprintFileValidationError(
      "file_too_large",
      "Blueprint files must be 25 MB or smaller.",
    );
  }

  const extensions = ALLOWED_TYPES.get(file.type);
  if (!extensions) {
    throw new BlueprintFileValidationError(
      "unsupported_file_type",
      "Only PDF, PNG, and JPEG blueprint files are accepted.",
    );
  }

  const lowerName = file.name.toLowerCase();
  if (!extensions.some((extension) => lowerName.endsWith(extension))) {
    throw new BlueprintFileValidationError(
      "extension_mismatch",
      "The file extension does not match the declared blueprint type.",
    );
  }
}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function validateBlueprintFileSignature(bytes: Uint8Array, mimeType: string) {
  const valid = mimeType === "application/pdf"
    ? startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
    : mimeType === "image/png"
      ? startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      : mimeType === "image/jpeg"
        ? startsWith(bytes, [0xff, 0xd8, 0xff])
        : false;

  if (!valid) {
    throw new BlueprintFileValidationError(
      "invalid_file_signature",
      "The uploaded file content does not match its declared format.",
    );
  }
}

export { MAX_BLUEPRINT_BYTES };
