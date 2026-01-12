import { request } from '../utils/fetch';
import { buildFormData } from '../utils/form-data';
import { HypervideoError } from '../types/errors';
import { validateQuality, validateTolerance, validateDimension, validateRGB } from '../types/common';
import type { ResolvedConfig } from '../types/common';
import type {
  ResizeOptions,
  ResizeResponse,
  ThumbnailOptions,
  ThumbnailResponse,
  EmoticonOptions,
  EmoticonResponse,
  RemoveBackgroundOptions,
  RemoveBackgroundResponse,
  DetectBackgroundColorOptions,
  DetectBackgroundColorResponse,
} from '../types/image';

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
 * Image transformation endpoints
 */
export class ImageEndpoints {
  constructor(private config: ResolvedConfig) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Resize an image to specified dimensions
   *
   * @param options - Resize options (file or url required, at least one dimension recommended)
   * @returns Promise resolving to resize response with data URL and metadata
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * const result = await client.image.resize({
   *   file: imageFile,
   *   width: 800,
   *   height: 600,
   *   fit: 'cover',
   *   quality: 85,
   *   format: 'webp',
   * });
   * ```
   */
  async resize(options: ResizeOptions): Promise<ResizeResponse> {
    validateMediaInput(options, 'resize');

    if (options.quality !== undefined) {
      validateQuality(options.quality);
    }
    if (options.width !== undefined) {
      validateDimension(options.width);
    }
    if (options.height !== undefined) {
      validateDimension(options.height);
    }

    const formData = buildFormData(options);
    return request<ResizeResponse>(
      `${this.config.baseUrl}/api/v1/image/resize`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Generate an optimized thumbnail
   *
   * @param options - Thumbnail options (file or url required)
   * @returns Promise resolving to thumbnail response with data URL and metadata
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * const result = await client.image.thumbnail({
   *   file: imageFile,
   *   size: 'medium', // 'small' (150px) | 'medium' (300px) | 'large' (600px)
   * });
   *
   * // Or with custom dimensions
   * const result = await client.image.thumbnail({
   *   url: 'https://example.com/image.jpg',
   *   width: 400,
   *   height: 300,
   * });
   * ```
   */
  async thumbnail(options: ThumbnailOptions): Promise<ThumbnailResponse> {
    validateMediaInput(options, 'thumbnail');

    if (options.quality !== undefined) {
      validateQuality(options.quality);
    }
    if (options.width !== undefined) {
      validateDimension(options.width);
    }
    if (options.height !== undefined) {
      validateDimension(options.height);
    }

    const formData = buildFormData(options);
    return request<ThumbnailResponse>(
      `${this.config.baseUrl}/api/v1/image/thumbnail`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Generate a multi-size emoticon pack (PNG + WebP variants)
   *
   * @param options - Emoticon options (file or url required, should be square image)
   * @returns Promise resolving to emoticon response with all sizes
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * const result = await client.image.emoticon({
   *   file: squareImage,
   *   sizes: [32, 64, 128], // optional custom sizes
   * });
   *
   * // Access specific sizes
   * const size32 = result.sizes.find(s => s.size === 32);
   * console.log(size32.png.dataUrl);
   * ```
   */
  async emoticon(options: EmoticonOptions): Promise<EmoticonResponse> {
    validateMediaInput(options, 'emoticon');

    if (options.sizes) {
      for (const size of options.sizes) {
        validateDimension(size);
      }
    }

    const formData = buildFormData(options);
    return request<EmoticonResponse>(
      `${this.config.baseUrl}/api/v1/image/emoticon`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Generate emoticon pack and download as ZIP
   *
   * @param options - Emoticon options (file or url required, should be square image)
   * @returns Promise resolving to Blob containing the ZIP file
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * const zipBlob = await client.image.emoticonZip({ file: squareImage });
   *
   * // Browser: download file
   * const url = URL.createObjectURL(zipBlob);
   * const a = document.createElement('a');
   * a.href = url;
   * a.download = 'emoticons.zip';
   * a.click();
   * URL.revokeObjectURL(url);
   * ```
   */
  async emoticonZip(options: EmoticonOptions): Promise<Blob> {
    validateMediaInput(options, 'emoticonZip');

    if (options.sizes) {
      for (const size of options.sizes) {
        validateDimension(size);
      }
    }

    const formData = buildFormData(options);
    return request<Blob>(
      `${this.config.baseUrl}/api/v1/image/emoticon/zip`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Remove background from an image
   *
   * Auto-detects the background color from edges, or use chromaKey for manual selection.
   *
   * @param options - Remove background options (file or url required)
   * @returns Promise resolving to PNG with transparency
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * // Auto-detect background color
   * const result = await client.image.removeBackground({
   *   file: imageFile,
   *   tolerance: 20,
   * });
   *
   * // Manual green screen removal
   * const result = await client.image.removeBackground({
   *   file: greenScreenImage,
   *   chromaKey: { r: 0, g: 255, b: 0 },
   * });
   *
   * // Convert to blob for display
   * const blob = Hypervideo.dataUrlToBlob(result.url);
   * ```
   */
  async removeBackground(
    options: RemoveBackgroundOptions
  ): Promise<RemoveBackgroundResponse> {
    validateMediaInput(options, 'removeBackground');

    if (options.tolerance !== undefined) {
      validateTolerance(options.tolerance);
    }
    if (options.edgeSampleSize !== undefined) {
      validateDimension(options.edgeSampleSize);
    }
    if (options.chromaKey !== undefined) {
      validateRGB(options.chromaKey);
    }

    const formData = buildFormData(options);
    return request<RemoveBackgroundResponse>(
      `${this.config.baseUrl}/api/v1/image/remove-background`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Detect the dominant background color from image edges
   *
   * @param options - Detect background color options (file or url required)
   * @returns Promise resolving to detected color in RGB and hex formats
   * @throws {HypervideoError} If input validation fails or API request fails
   *
   * @example
   * ```ts
   * const result = await client.image.detectBackgroundColor({ file: imageFile });
   * console.log(result.hex); // "#E92FBC"
   * console.log(result.backgroundColor); // { r: 233, g: 47, b: 188 }
   * ```
   */
  async detectBackgroundColor(
    options: DetectBackgroundColorOptions
  ): Promise<DetectBackgroundColorResponse> {
    validateMediaInput(options, 'detectBackgroundColor');

    const formData = buildFormData(options);
    return request<DetectBackgroundColorResponse>(
      `${this.config.baseUrl}/api/v1/image/detect-background-color`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }
}
