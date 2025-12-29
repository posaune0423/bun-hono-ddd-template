/**
 * HTTP Error Mapping - centralized conversion from domain/usecase errors to HTTP responses.
 * Uses Problem Details (RFC7807) style response format.
 */

import type { Context } from "hono";
import type { ZodError } from "zod";

import type { DomainError, ValidationDetail } from "../domain/shared/errors";

/**
 * Problem Details response body (RFC7807-like).
 */
export interface ProblemDetails {
  /** URI reference identifying the problem type */
  readonly type: string;
  /** Short human-readable summary */
  readonly title: string;
  /** HTTP status code */
  readonly status: number;
  /** Human-readable explanation (no sensitive data) */
  readonly detail: string;
  /** URI reference to the specific occurrence (request path or id) */
  readonly instance?: string;
  /** Validation error details (for 400 responses) */
  readonly errors?: readonly ValidationDetail[];
  /** Additional metadata (debug info, suppress in production) */
  readonly meta?: Record<string, unknown>;
}

/**
 * HTTP error response structure returned by toHttpError.
 */
export interface HttpErrorResponse {
  readonly status: number;
  readonly body: ProblemDetails;
  readonly headers?: Record<string, string>;
}

/**
 * Error type URNs for consistent identification.
 */
const ERROR_TYPE_URNS = {
  ValidationError: "urn:app:error:validation",
  NotFoundError: "urn:app:error:not-found",
  ConflictError: "urn:app:error:conflict",
  UnauthorizedError: "urn:app:error:unauthorized",
  ForbiddenError: "urn:app:error:forbidden",
  UnexpectedError: "urn:app:error:unexpected",
  ZodError: "urn:app:error:validation",
} as const;

/**
 * HTTP status codes for each error type.
 */
const ERROR_STATUS_CODES: Record<string, number> = {
  ValidationError: 400,
  NotFoundError: 404,
  ConflictError: 409,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  UnexpectedError: 500,
  ZodError: 400,
};

/**
 * Human-readable titles for each error type.
 */
const ERROR_TITLES: Record<string, string> = {
  ValidationError: "Validation Error",
  NotFoundError: "Not Found",
  ConflictError: "Conflict",
  UnauthorizedError: "Unauthorized",
  ForbiddenError: "Forbidden",
  UnexpectedError: "Internal Server Error",
  ZodError: "Validation Error",
};

/**
 * Convert a Zod error to ValidationDetail array.
 */
const zodErrorToDetails = (error: ZodError): ValidationDetail[] =>
  error.issues.map(issue => ({
    field: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));

/**
 * Convert domain/usecase error to HTTP error response.
 * Pure function - no side effects, easy to test.
 *
 * @param error - Domain error, Usecase error, or ZodError
 * @param instance - Request path or identifier for the specific occurrence
 * @returns HTTP error response with status, body, and optional headers
 */
export const toHttpError = (error: DomainError | ZodError, instance?: string): HttpErrorResponse => {
  // Handle ZodError (from DTO validation)
  if ("issues" in error && Array.isArray(error.issues)) {
    const zodError = error as ZodError;
    return {
      status: 400,
      body: {
        type: ERROR_TYPE_URNS.ZodError,
        title: ERROR_TITLES.ZodError!,
        status: 400,
        detail: "Request validation failed",
        instance,
        errors: zodErrorToDetails(zodError),
      },
      headers: { "Content-Type": "application/problem+json" },
    };
  }

  // Handle domain errors
  const domainError = error as DomainError;
  const errorType = domainError.type;
  const status = ERROR_STATUS_CODES[errorType] ?? 500;
  const title = ERROR_TITLES[errorType] ?? "Internal Server Error";
  const typeUrn = ERROR_TYPE_URNS[errorType as keyof typeof ERROR_TYPE_URNS] ?? ERROR_TYPE_URNS.UnexpectedError;

  const body: ProblemDetails = {
    type: typeUrn,
    title,
    status,
    detail: status === 500 ? "An unexpected error occurred" : domainError.message,
    instance,
  };

  // Add validation details if present
  if (domainError.type === "ValidationError" && domainError.details) {
    return {
      status,
      body: { ...body, errors: domainError.details },
      headers: { "Content-Type": "application/problem+json" },
    };
  }

  return {
    status,
    body,
    headers: { "Content-Type": "application/problem+json" },
  };
};

/**
 * Helper to send HTTP error response from Hono context.
 * Use this in route handlers after Result.isErr() check.
 */
export const sendHttpError = (c: Context, error: DomainError | ZodError): Response => {
  const { status, body, headers } = toHttpError(error, c.req.path);

  return c.json(body, status as 400 | 401 | 403 | 404 | 409 | 500, headers);
};
