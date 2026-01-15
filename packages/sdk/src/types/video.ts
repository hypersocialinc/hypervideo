import type { MediaInput, RGB, RGBWithHex } from './common';

/**
 * Video output format
 * - webm: VP9 codec with alpha, small file, Chrome/Firefox/Edge
 * - stacked-alpha: H.264 with stacked RGB+Alpha, requires WebGL player, universal support
 * - webp: Animated WebP with alpha, very small, Safari compatible
 * - mov: ProRes 4444 codec, large file, all browsers
 */
export type VideoFormat = 'webm' | 'stacked-alpha' | 'webp' | 'mov';

/**
 * AI output format (subset of VideoFormat, supported by AI endpoint)
 * - webp: Animated WebP with alpha, small file, all browsers
 * - webm: VP9 codec with alpha, Chrome/Firefox/Edge
 * - apng: Animated PNG, larger file, all browsers
 * - stacked-alpha: H.264 with stacked RGB+Alpha, requires WebGL player
 */
export type AIVideoFormat = 'webp' | 'webm' | 'apng' | 'stacked-alpha';

/**
 * Non-empty array of video formats (at least one required)
 */
export type VideoFormatArray = [VideoFormat, ...VideoFormat[]];

// ============================================================================
// Remove Video Background
// ============================================================================

/**
 * Options for removing background from a video
 *
 * Provide either `file` or `url` as input (mutually exclusive).
 * Use `format` for single output or `formats` for multiple outputs.
 * By default, auto-detects background color from the first frame.
 * Use `chromaKey` for manual color selection (e.g., green screen).
 */
export type VideoRemoveBackgroundOptions = MediaInput & {
  /** Background removal sensitivity 0-100 (default: 20) */
  tolerance?: number;
  /** Frames per second for processing 1-60 (default: 24) */
  fps?: number;
  /** Single output format */
  format?: VideoFormat;
  /** Multiple output formats (at least one required if specified) */
  formats?: VideoFormatArray;
  /** Manual chromakey color (e.g., green screen) */
  chromaKey?: RGB;
};

export interface VideoOutput {
  /** Output format */
  format: VideoFormat;
  /** Base64 data URL */
  url: string;
  /** File size in bytes */
  size: number;
}

export interface VideoRemoveBackgroundResponse {
  /** Base64 data URL of primary output (first format) */
  url: string;
  /** Format of primary output */
  format: VideoFormat;
  /** Primary output file size in bytes */
  size: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Duration in seconds */
  duration: number;
  /** Total number of frames processed */
  frameCount: number;
  /** Frames per second */
  fps: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** All outputs (present when multiple formats requested) */
  outputs?: VideoOutput[];
  /** Detected background color (auto-detect mode) */
  detectedBackgroundColor?: RGBWithHex;
}

// ============================================================================
// Remove Video Background with AI (BiRefNet v2)
// ============================================================================

/**
 * Non-empty array of AI video formats
 */
export type AIVideoFormatArray = [AIVideoFormat, ...AIVideoFormat[]];

/**
 * Options for AI-powered video background removal
 *
 * Uses FAL BiRefNet v2 for high-quality frame-by-frame segmentation.
 * Better edge detection than chromakey, works on any background.
 */
export type VideoRemoveBackgroundAIOptions = MediaInput & {
  /** WebP/WebM quality 0-100 (default: 60, lower = smaller file) */
  quality?: number;
  /** Output size in pixels, e.g., 512 for 512x512 (omit for original) */
  size?: number;
  /** Frames per second 1-60 (default: 24) */
  fps?: number;
  /** Batch size for parallel processing 1-200 (default: 50) */
  batchSize?: number;
  /** Single output format */
  format?: AIVideoFormat;
  /** Multiple output formats */
  formats?: AIVideoFormatArray;
};

export interface AIVideoOutput {
  /** Output format */
  format: AIVideoFormat;
  /** Base64 data URL */
  url: string;
  /** File size in bytes */
  size: number;
}

export interface VideoRemoveBackgroundAIResponse {
  /** Base64 data URL of primary output (first format) */
  url: string;
  /** Format of primary output */
  format: AIVideoFormat;
  /** Primary output file size in bytes */
  size: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Duration in seconds */
  duration: number;
  /** Total number of frames processed */
  frameCount: number;
  /** Frames per second */
  fps: number;
  /** Quality setting used */
  quality: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** All outputs (present when multiple formats requested) */
  outputs?: AIVideoOutput[];
}
