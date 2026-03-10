import type { MediaInput, RGB, RGBWithHex } from './common';

/**
 * Video output format
 * - webm: VP9 codec with alpha, small file, Chrome/Firefox/Edge
 * - stacked-alpha: H.264 with stacked RGB+Alpha, requires WebGL player, universal support
 * - webp: Animated WebP with alpha, very small, Safari compatible
 * - apng: Animated PNG with alpha, all browsers including iOS Safari, works in <img> tag
 * - mov: ProRes 4444 codec, large file, all browsers
 */
export type VideoFormat = 'webm' | 'stacked-alpha' | 'webp' | 'apng' | 'mov';

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
 *
 * **Smart Processing:**
 * - `webp`/`apng` format: Uses AI for smaller files (~1.5MB vs 8MB)
 * - `stacked-alpha`: Uses AI (FAL Bria video model, ~15s)
 * - `webm`/`mov`: Uses chromakey for faster processing (~10s)
 * - Manual `chromaKey`: Always uses chromakey (for green/blue screen)
 */
export type VideoRemoveBackgroundOptions = MediaInput & {
  /** Background removal sensitivity 0-100 (default: 30). Used for chromakey processing. */
  tolerance?: number;
  /** Frames per second for processing 1-60 (default: 24) */
  fps?: number;
  /** Single output format */
  format?: VideoFormat;
  /** Multiple output formats (at least one required if specified) */
  formats?: VideoFormatArray;
  /** Manual chromakey color (e.g., green screen). Forces chromakey processing. */
  chromaKey?: RGB;
  /** Quality 0-100 (default: 60, lower = smaller file). Used for webp/apng formats. */
  quality?: number;
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
  /** Processing method used ('chromakey' or 'ai') */
  processingMethod?: 'chromakey' | 'ai';
  /** All outputs (present when multiple formats requested) */
  outputs?: VideoOutput[];
  /** Detected background color (auto-detect mode) */
  detectedBackgroundColor?: RGBWithHex;
}
