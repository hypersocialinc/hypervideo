/**
 * Error codes returned by the Hypervideo API
 */
export type ErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_URL'
  | 'INVALID_QUALITY'
  | 'INVALID_TOLERANCE'
  | 'INVALID_FPS'
  | 'INVALID_CHROMA_KEY'
  | 'INVALID_FORMATS'
  | 'INVALID_VIDEO'
  | 'PROCESSING_FAILED'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'INVALID_API_KEY'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Custom error class for Hypervideo SDK errors
 *
 * @example
 * ```ts
 * try {
 *   await client.image.resize({ file });
 * } catch (error) {
 *   if (error instanceof HypervideoError) {
 *     if (error.isAuthError()) {
 *       // Handle authentication error
 *     } else if (error.isTimeoutError()) {
 *       // Handle timeout - maybe retry with longer timeout
 *     }
 *     console.error(`[${error.code}] ${error.message}`);
 *   }
 * }
 * ```
 */
export class HypervideoError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  /**
   * Create a new HypervideoError
   *
   * @param code - Error code from the ErrorCode union
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code if applicable
   * @param details - Additional error context for debugging
   */
  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HypervideoError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, HypervideoError);
    }
  }

  /**
   * Check if this is an authentication error
   * @returns true if error code is UNAUTHORIZED, INVALID_API_KEY, or status is 401
   */
  isAuthError(): boolean {
    return (
      this.code === 'UNAUTHORIZED' ||
      this.code === 'INVALID_API_KEY' ||
      this.statusCode === 401
    );
  }

  /**
   * Check if this is a validation error
   * @returns true if HTTP status is 400 (Bad Request)
   */
  isValidationError(): boolean {
    return this.statusCode === 400;
  }

  /**
   * Check if this is a timeout error
   * @returns true if error code is TIMEOUT or status is 504 (Gateway Timeout)
   */
  isTimeoutError(): boolean {
    return this.code === 'TIMEOUT' || this.statusCode === 504;
  }
}
