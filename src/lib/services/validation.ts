import type { GenerationRequest } from "@/lib/domain";
import { MAX_OUTPUT_COUNT, MIN_OUTPUT_COUNT } from "@/lib/domain";

export interface ValidationIssue {
  field: string;
  message: string;
}

/**
 * Validate that a request has the selections required to produce a complete
 * generation. A location may be satisfied either by a saved location or by
 * freshly uploaded location assets.
 */
export function validateGenerationRequest(request: GenerationRequest): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!request.brandId) {
    issues.push({ field: "brand", message: "Select a brand." });
  }
  if (request.productIds.length === 0) {
    issues.push({ field: "products", message: "Select at least one product." });
  }

  const hasUploadedLocation = request.uploadedAssets.some((a) => a.role === "location");
  if (!request.locationId && !hasUploadedLocation) {
    issues.push({ field: "location", message: "Select an existing location or upload a new one." });
  }

  if (request.settings.outputCount < MIN_OUTPUT_COUNT || request.settings.outputCount > MAX_OUTPUT_COUNT) {
    issues.push({ field: "outputCount", message: `Output count must be between ${MIN_OUTPUT_COUNT} and ${MAX_OUTPUT_COUNT}.` });
  }

  return issues;
}

export class GenerationValidationError extends Error {
  readonly issues: ValidationIssue[];
  constructor(issues: ValidationIssue[]) {
    super(issues.map((i) => i.message).join(" "));
    this.name = "GenerationValidationError";
    this.issues = issues;
  }
}
