import { request } from '../utils/fetch';
import { buildFormData } from '../utils/form-data';
import { HypervideoError } from '../types/errors';
import { validateTolerance, validateFps, validateRGB } from '../types/common';
import type { ResolvedConfig } from '../types/common';
import type {
  VideoRemoveBackgroundOptions,
  VideoRemoveBackgroundResponse,
  VideoRemoveBackgroundAIOptions,
  VideoRemoveBackgroundAIResponse,
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
   * // Stacked-alpha playback (requires @hypervideo-dev/react)
   * // npm install @hypervideo-dev/react
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

  /**
   * Remove background from a video using AI (FAL BiRefNet v2)
   *
   * Uses advanced AI segmentation for high-quality edge detection.
   * Works on any background, not just solid colors.
   *
   * Supports multiple output formats:
   * - `webp`: Animated WebP with alpha, small file, all browsers (default)
   * - `webm`: VP9 codec with alpha, small file, Chrome/Firefox/Edge
   * - `apng`: Animated PNG, larger file, all browsers
   * - `stacked-alpha`: H.264 with stacked RGB+Alpha, requires WebGL player
   *
   * @param options - AI background removal options (file or url required)
   * @returns Promise resolving to video with transparent background
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * // Default (WebP format)
   * const result = await client.video.removeBackgroundAI({
   *   file: videoFile,
   *   fps: 8,  // Lower FPS = faster processing
   * });
   *
   * // Multiple formats
   * const result = await client.video.removeBackgroundAI({
   *   file: videoFile,
   *   formats: ['webp', 'webm'],
   *   quality: 60,
   * });
   *
   * // With resize for smaller output
   * const result = await client.video.removeBackgroundAI({
   *   file: videoFile,
   *   size: 512,  // 512x512 output
   *   fps: 8,
   * });
   * ```
   */
  async removeBackgroundAI(
    options: VideoRemoveBackgroundAIOptions
  ): Promise<VideoRemoveBackgroundAIResponse> {
    validateMediaInput(options, 'video.removeBackgroundAI');

    if (options.fps !== undefined) {
      validateFps(options.fps);
    }
    if (options.quality !== undefined && (options.quality < 0 || options.quality > 100)) {
      throw new HypervideoError(
        'INVALID_QUALITY',
        'quality must be between 0 and 100',
        undefined,
        { quality: options.quality }
      );
    }
    if (options.size !== undefined && (options.size < 64 || options.size > 2048)) {
      throw new HypervideoError(
        'INVALID_SIZE',
        'size must be between 64 and 2048',
        undefined,
        { size: options.size }
      );
    }
    if (options.batchSize !== undefined && (options.batchSize < 1 || options.batchSize > 200)) {
      throw new HypervideoError(
        'INVALID_BATCH_SIZE',
        'batchSize must be between 1 and 200',
        undefined,
        { batchSize: options.batchSize }
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

    // AI processing can take longer, use extended timeout (minimum 180s)
    const timeout = Math.max(this.config.timeout, 180000);

    return request<VideoRemoveBackgroundAIResponse>(
      `${this.config.baseUrl}/api/v1/video/remove-background-ai`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout,
      }
    );
  }
}
