import { HypervideoError } from './errors';

// ============================================================================
// Branded Types for Runtime Validation
// ============================================================================

/**
 * Branded type for quality values (1-100)
 * Use `validateQuality()` to create validated values
 */
export type Quality = number & { readonly __brand: 'Quality' };

/**
 * Branded type for tolerance values (0-100)
 * Use `validateTolerance()` to create validated values
 */
export type Tolerance = number & { readonly __brand: 'Tolerance' };

/**
 * Branded type for FPS values (1-60)
 * Use `validateFps()` to create validated values
 */
export type Fps = number & { readonly __brand: 'Fps' };

/**
 * Branded type for positive integer dimensions (width/height)
 * Use `validateDimension()` to create validated values
 */
export type PositiveDimension = number & { readonly __brand: 'PositiveDimension' };

/**
 * Branded type for RGB component values (0-255 integers)
 */
export type RGBValue = number & { readonly __brand: 'RGBValue' };

// ============================================================================
// Color Types
// ============================================================================

/**
 * RGB color representation
 * Each component should be an integer 0-255
 */
export interface RGB {
  /** Red component (0-255) */
  r: number;
  /** Green component (0-255) */
  g: number;
  /** Blue component (0-255) */
  b: number;
}

/**
 * RGB color with hex string (returned from API)
 * The hex value is always consistent with RGB values
 */
export interface RGBWithHex extends RGB {
  /** Hex color code (e.g., "#FF5500") */
  hex: `#${string}`;
}

// ============================================================================
// API Types
// ============================================================================

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Standard API response wrapper (discriminated union)
 * Success and error states are mutually exclusive
 */
export type ApiResponse<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: ApiError };

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * SDK client configuration
 */
export interface HypervideoConfig {
  /** API key for authentication */
  apiKey: string;
  /** Base URL for the API (default: production) */
  baseUrl?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Resolved configuration with all fields required
 */
export interface ResolvedConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

// ============================================================================
// Input Types
// ============================================================================

/**
 * File input type - supports browser File/Blob and Node.js Buffer
 */
export type FileInput = File | Blob | Buffer | ArrayBuffer;

/**
 * Input that accepts either a file or URL (mutually exclusive)
 *
 * This union type ensures only one of `file` or `url` is provided:
 * - Use `{ file: buffer }` for direct file uploads
 * - Use `{ url: "https://..." }` to fetch from URL
 */
export type MediaInput =
  | { file: FileInput; url?: never }
  | { file?: never; url: string };

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate and brand a quality value (1-100)
 * @param value - Raw number to validate
 * @returns Branded Quality value
 * @throws {HypervideoError} If value is out of range
 */
export function validateQuality(value: number): Quality {
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      `Quality must be an integer between 1 and 100, got ${value}`,
      undefined,
      { value, min: 1, max: 100 }
    );
  }
  return value as Quality;
}

/**
 * Validate and brand a tolerance value (0-100)
 * @param value - Raw number to validate
 * @returns Branded Tolerance value
 * @throws {HypervideoError} If value is out of range
 */
export function validateTolerance(value: number): Tolerance {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      `Tolerance must be an integer between 0 and 100, got ${value}`,
      undefined,
      { value, min: 0, max: 100 }
    );
  }
  return value as Tolerance;
}

/**
 * Validate and brand an FPS value (1-60)
 * @param value - Raw number to validate
 * @returns Branded Fps value
 * @throws {HypervideoError} If value is out of range
 */
export function validateFps(value: number): Fps {
  if (!Number.isInteger(value) || value < 1 || value > 60) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      `FPS must be an integer between 1 and 60, got ${value}`,
      undefined,
      { value, min: 1, max: 60 }
    );
  }
  return value as Fps;
}

/**
 * Validate and brand a dimension value (positive integer)
 * @param value - Raw number to validate
 * @returns Branded PositiveDimension value
 * @throws {HypervideoError} If value is not a positive integer
 */
export function validateDimension(value: number): PositiveDimension {
  if (!Number.isInteger(value) || value < 1) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      `Dimension must be a positive integer, got ${value}`,
      undefined,
      { value }
    );
  }
  return value as PositiveDimension;
}

/**
 * Validate RGB component value (0-255 integer)
 * @param value - Raw number to validate
 * @param component - Component name for error messages (r, g, or b)
 * @returns Branded RGBValue
 * @throws {HypervideoError} If value is out of range
 */
export function validateRGBValue(value: number, component: 'r' | 'g' | 'b'): RGBValue {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      `RGB ${component} must be an integer between 0 and 255, got ${value}`,
      undefined,
      { component, value, min: 0, max: 255 }
    );
  }
  return value as RGBValue;
}

/**
 * Validate an RGB object
 * @param rgb - RGB object to validate
 * @returns The same RGB object if valid
 * @throws {HypervideoError} If any component is out of range
 */
export function validateRGB(rgb: RGB): RGB {
  validateRGBValue(rgb.r, 'r');
  validateRGBValue(rgb.g, 'g');
  validateRGBValue(rgb.b, 'b');
  return rgb;
}
