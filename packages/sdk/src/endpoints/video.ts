import { request } from '../utils/fetch';
import { buildFormData } from '../utils/form-data';
import { HypervideoError } from '../types/errors';
import { validateTolerance, validateFps, validateRGB } from '../types/common';
import type { ResolvedConfig } from '../types/common';
import type {
  VideoRemoveBackgroundOptions,
  VideoRemoveBackgroundResponse,
} from '../types/video';

/**
 * Validate that either file or url is provided
 */
function validateMediaInput(options: { file?: unknown; url?: string }, operation: string): void {
  if (!options.file && !options.url) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      `Either 'file' or 'url' is required for ${operation}`,
      undefined,
      { operation }
    );
  }
}

/**
 * Video transformation endpoints
 */
export class VideoEndpoints {
  constructor(private config: ResolvedConfig) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Remove background from a video
   *
   * **Smart Processing:**
   * - `webp` format: Uses AI for 5x smaller files (~1.5MB vs 8MB)
   * - Other formats: Uses chromakey for faster processing (~10s vs 60s)
   * - Manual `chromaKey`: Always uses chromakey (for green/blue screen)
   *
   * Supports multiple output formats:
   * - `webp`: Animated WebP with alpha, smallest files (AI), all browsers
   * - `webm`: VP9 codec with alpha, fast processing, Chrome/Firefox/Edge
   * - `stacked-alpha`: H.264 with stacked RGB+Alpha, fast, universal with WebGL player
   * - `mov`: ProRes 4444 codec, large file, all browsers
   *
   * Default formats: `['webm', 'stacked-alpha']`
   *
   * @param options - Video background removal options (file or url required)
   * @returns Promise resolving to video with transparent background
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * // WebP format (smallest files, uses AI internally)
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   format: 'webp',
   *   quality: 60,  // Lower = smaller file
   * });
   *
   * // Default formats (webm + stacked-alpha, fast chromakey)
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   tolerance: 20,
   * });
   *
   * // Multiple formats (webp uses AI, others use chromakey)
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   formats: ['webp', 'webm', 'stacked-alpha'],
   *   quality: 60,
   * });
   *
   * // Manual green screen (forces chromakey even for webp)
   * const result = await client.video.removeBackground({
   *   file: greenScreenVideo,
   *   format: 'webp',
   *   chromaKey: { r: 0, g: 255, b: 0 },
   * });
   * ```
   */
  async removeBackground(
    options: VideoRemoveBackgroundOptions
  ): Promise<VideoRemoveBackgroundResponse> {
    validateMediaInput(options, 'video.removeBackground');

    if (options.tolerance !== undefined) {
      validateTolerance(options.tolerance);
    }
    if (options.fps !== undefined) {
      validateFps(options.fps);
    }
    if (options.chromaKey !== undefined) {
      validateRGB(options.chromaKey);
    }
    if (options.quality !== undefined && (options.quality < 0 || options.quality > 100)) {
      throw new HypervideoError(
        'INVALID_QUALITY',
        'quality must be between 0 and 100',
        undefined,
        { quality: options.quality }
      );
    }
    if (options.format !== undefined && options.formats !== undefined) {
      throw new HypervideoError(
        'INVALID_REQUEST',
        "Cannot specify both 'format' and 'formats'. Use 'format' for single output or 'formats' for multiple outputs.",
        undefined,
        { format: options.format, formats: options.formats }
      );
    }

    const formData = buildFormData(options);

    // Video processing can take longer, use extended timeout
    // AI processing needs more time, so use 180s minimum
    const timeout = Math.max(this.config.timeout, 180000);

    return request<VideoRemoveBackgroundResponse>(
      `${this.config.baseUrl}/api/v1/video/remove-background`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout,
      }
    );
  }
}
