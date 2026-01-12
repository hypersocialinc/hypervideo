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
   * Auto-detects the background color from the first frame, or use chromaKey for manual selection.
   *
   * Supports multiple output formats:
   * - `webm`: VP9 codec with alpha, small file, Chrome/Firefox/Edge (default)
   * - `stacked-alpha`: H.264 with stacked RGB+Alpha, requires WebGL player, universal support (default)
   * - `webp`: Animated WebP with alpha, very small, Safari compatible
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
   * // Default formats (webm + stacked-alpha)
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   tolerance: 20,
   * });
   *
   * // Single format
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   format: 'webm',
   * });
   *
   * // Multiple formats
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   formats: ['webm', 'stacked-alpha', 'webp'],
   * });
   * // result.outputs contains all formats
   *
   * // Manual green screen
   * const result = await client.video.removeBackground({
   *   file: greenScreenVideo,
   *   chromaKey: { r: 0, g: 255, b: 0 },
   * });
   *
   * // Stacked-alpha playback (requires @hypervideo/react)
   * // npm install @hypervideo/react
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
    if (options.format !== undefined && options.formats !== undefined) {
      throw new HypervideoError(
        'INVALID_REQUEST',
        "Cannot specify both 'format' and 'formats'. Use 'format' for single output or 'formats' for multiple outputs.",
        undefined,
        { format: options.format, formats: options.formats }
      );
    }

    const formData = buildFormData(options);

    // Video processing can take longer, use extended timeout (minimum 120s)
    const timeout = Math.max(this.config.timeout, 120000);

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
