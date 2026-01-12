import type { MediaInput, RGB, RGBWithHex } from './common';

/**
 * Image fit modes for resizing
 */
export type ImageFit = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';

/**
 * Output format for images
 */
export type ImageFormat = 'jpeg' | 'png' | 'webp';

/**
 * Thumbnail size presets
 * - small: 150px
 * - medium: 300px
 * - large: 600px
 */
export type ThumbnailSize = 'small' | 'medium' | 'large';

/**
 * Non-empty array type (at least one element required)
 */
export type NonEmptyArray<T> = [T, ...T[]];

// ============================================================================
// Resize
// ============================================================================

/**
 * Options for resizing an image
 *
 * Provide either `file` or `url` as input (mutually exclusive).
 * At least one of `width` or `height` should be specified.
 */
export type ResizeOptions = MediaInput & {
  /** Target width in pixels (positive integer) */
  width?: number;
  /** Target height in pixels (positive integer) */
  height?: number;
  /** Resize fit mode (default: 'cover') */
  fit?: ImageFit;
  /** Output quality 1-100 (default: 80) */
  quality?: number;
  /** Output format (default: 'jpeg') */
  format?: ImageFormat;
};

export interface ResizeResponse {
  /** Base64 data URL of resized image */
  url: string;
  /** Output format */
  format: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** File size in bytes */
  size: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

// ============================================================================
// Thumbnail
// ============================================================================

/**
 * Options for generating a thumbnail
 *
 * Provide either `file` or `url` as input (mutually exclusive).
 * Use `size` preset or custom `width`/`height` (which override the preset).
 */
export type ThumbnailOptions = MediaInput & {
  /** Preset size: small=150px, medium=300px, large=600px */
  size?: ThumbnailSize;
  /** Custom width (overrides size preset) */
  width?: number;
  /** Custom height (overrides size preset) */
  height?: number;
  /** Output quality 1-100 (default: 60) */
  quality?: number;
};

export interface ThumbnailResponse {
  /** Base64 data URL of thumbnail */
  url: string;
  /** Output format */
  format: string;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** File size in bytes */
  size: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

// ============================================================================
// Emoticon
// ============================================================================

/**
 * Options for generating an emoticon pack
 *
 * Provide either `file` or `url` as input (mutually exclusive).
 * Input should be a square image for best results.
 */
export type EmoticonOptions = MediaInput & {
  /** Custom sizes to generate (default: [16,24,32,48,64,96,128,256]) */
  sizes?: NonEmptyArray<number>;
};

export interface EmoticonVariant {
  /** Base64 data URL */
  dataUrl: string;
  /** File size in bytes */
  size: number;
}

export interface EmoticonSize {
  /** Size in pixels */
  size: number;
  /** PNG variant */
  png: EmoticonVariant;
  /** WebP variant */
  webp: EmoticonVariant;
}

export interface EmoticonResponse {
  /** All generated sizes */
  sizes: EmoticonSize[];
  /** Total size of all PNG files in bytes */
  totalPngSize: number;
  /** Total size of all WebP files in bytes */
  totalWebpSize: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

// ============================================================================
// Remove Background
// ============================================================================

/**
 * Options for removing background from an image
 *
 * Provide either `file` or `url` as input (mutually exclusive).
 * By default, auto-detects background color from edges.
 * Use `chromaKey` for manual color selection (e.g., green screen).
 */
export type RemoveBackgroundOptions = MediaInput & {
  /** Background removal sensitivity 0-100 (default: 20) */
  tolerance?: number;
  /** Pixels to sample from edges (default: 50) */
  edgeSampleSize?: number;
  /** Apply edge smoothing (default: true) */
  smoothEdges?: boolean;
  /** Manual chromakey color (e.g., green screen) */
  chromaKey?: RGB;
};

export interface RemoveBackgroundResponse {
  /** Base64 data URL of PNG with transparency */
  url: string;
  /** Always 'png' */
  format: 'png';
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** File size in bytes */
  size: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Detected background color (auto-detect mode) */
  detectedBackgroundColor?: RGBWithHex;
}

// ============================================================================
// Detect Background Color
// ============================================================================

/**
 * Options for detecting background color
 *
 * Provide either `file` or `url` as input (mutually exclusive).
 */
export type DetectBackgroundColorOptions = MediaInput;

export interface DetectBackgroundColorResponse {
  /** Detected background color */
  backgroundColor: RGB;
  /** Hex color code */
  hex: string;
}
