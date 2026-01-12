/**
 * Shared utility functions for CLI commands
 */

import { readFileSync } from 'fs';
import { basename, extname } from 'path';
import { Hypervideo } from '@hypervideo-dev/sdk';
import { requireApiKey, getBaseUrl } from './config.js';
import { error } from './output.js';

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * Parse hex color string to RGB values
 * @param hex - Hex color string (with or without #)
 * @returns RGB object with values 0-255, or null if invalid
 */
export function parseHexColor(hex: string): RGBColor | null {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) {
    return null;
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  // Validate NaN and range (0-255)
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return null;
  }
  if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
    return null;
  }
  return { r, g, b };
}

/**
 * Format error for logging - handles both Error instances and other values
 */
export function formatError(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === 'string') {
    return err;
  }
  return `Unexpected error: ${String(err)}`;
}

/**
 * Generate default output path with a suffix
 */
export function getDefaultOutputPath(
  inputPath: string,
  suffix: string,
  extension?: string
): string {
  const ext = extension || extname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  return `${base}${suffix}${ext}`;
}

/**
 * Parse and validate tolerance option (0-100)
 * @throws Error if invalid
 */
export function parseTolerance(value: string): number {
  const tolerance = parseInt(value, 10);
  if (isNaN(tolerance) || tolerance < 0 || tolerance > 100) {
    throw new Error('Tolerance must be a number between 0 and 100');
  }
  return tolerance;
}

/**
 * Parse and validate quality option (1-100)
 * @throws Error if invalid
 */
export function parseQuality(value: string): number {
  const quality = parseInt(value, 10);
  if (isNaN(quality) || quality < 1 || quality > 100) {
    throw new Error('Quality must be a number between 1 and 100');
  }
  return quality;
}

/**
 * Parse and validate chroma key hex color
 * @throws Error if invalid format
 */
export function parseChromaKey(hex: string | undefined): RGBColor | undefined {
  if (!hex) return undefined;
  const parsed = parseHexColor(hex);
  if (!parsed) {
    throw new Error('Invalid hex color format. Use #RRGGBB (e.g., #00FF00)');
  }
  return parsed;
}

/**
 * Read a file with context-rich error messages
 * @throws Error with file path context
 */
export function readFile(filePath: string): Buffer {
  try {
    return readFileSync(filePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read ${filePath}: ${message}`);
  }
}

export interface CreateClientOptions {
  /** Extended timeout in milliseconds (for video processing) */
  timeout?: number;
}

/**
 * Create an SDK client with API key validation
 * Handles API key retrieval and error display, exits on failure
 */
export function createClient(options: CreateClientOptions = {}): Hypervideo {
  let apiKey: string;
  try {
    apiKey = requireApiKey();
  } catch (err) {
    error(formatError(err));
    process.exit(1);
  }

  return new Hypervideo({
    apiKey,
    baseUrl: getBaseUrl(),
    ...(options.timeout && { timeout: options.timeout }),
  });
}
