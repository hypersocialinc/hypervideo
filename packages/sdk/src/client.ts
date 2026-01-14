import { ImageEndpoints } from './endpoints/image';
import { VideoEndpoints } from './endpoints/video';
import { dataUrlToBlob, toDataUrl, extractBase64, extractMimeType } from './utils/blob';
import { HypervideoError } from './types/errors';
import type { HypervideoConfig, ResolvedConfig } from './types/common';

const DEFAULT_BASE_URL = 'https://api.hypervideo.dev';
const DEFAULT_TIMEOUT = 30000;

/**
 * Hypervideo SDK client
 *
 * @example
 * ```ts
 * import { Hypervideo } from '@hypervideo-dev/sdk';
 *
 * const client = new Hypervideo({
 *   apiKey: 'your-api-key',
 * });
 *
 * // Remove background from an image
 * const result = await client.image.removeBackground({
 *   file: imageFile,
 *   tolerance: 20,
 * });
 *
 * // Convert result to blob for display
 * const blob = Hypervideo.dataUrlToBlob(result.url);
 * const objectUrl = URL.createObjectURL(blob);
 * ```
 */
export class Hypervideo {
  private readonly config: ResolvedConfig;

  /**
   * Image transformation endpoints
   */
  public readonly image: ImageEndpoints;

  /**
   * Video transformation endpoints
   */
  public readonly video: VideoEndpoints;

  /**
   * Create a new Hypervideo SDK client
   *
   * @param config - Client configuration
   * @throws {HypervideoError} If apiKey is not provided
   */
  constructor(config: HypervideoConfig) {
    if (!config.apiKey) {
      throw new HypervideoError(
        'INVALID_API_KEY',
        'apiKey is required in configuration'
      );
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
    };

    this.image = new ImageEndpoints(this.config);
    this.video = new VideoEndpoints(this.config);
  }

  /**
   * Convert a base64 data URL to a Blob
   *
   * @param dataUrl - Base64 encoded data URL (e.g., "data:image/png;base64,...")
   * @returns Blob object
   * @throws {HypervideoError} If the data URL format is invalid
   *
   * @example
   * ```ts
   * const result = await client.image.removeBackground({ file });
   * const blob = Hypervideo.dataUrlToBlob(result.url);
   *
   * // Browser: create object URL for display
   * const objectUrl = URL.createObjectURL(blob);
   * img.src = objectUrl;
   *
   * // Node.js: write to file
   * const buffer = Buffer.from(await blob.arrayBuffer());
   * fs.writeFileSync('output.png', buffer);
   * ```
   */
  static dataUrlToBlob(dataUrl: string): Blob {
    return dataUrlToBlob(dataUrl);
  }

  /**
   * Convert a Blob to a base64 data URL
   *
   * @param blob - Blob object to convert
   * @returns Base64 encoded data URL
   * @throws {HypervideoError} If the blob cannot be read
   */
  static async toDataUrl(blob: Blob): Promise<string> {
    return toDataUrl(blob);
  }

  /**
   * Extract the base64 string from a data URL
   *
   * @param dataUrl - Base64 encoded data URL
   * @returns Raw base64 string without the data URL prefix
   * @throws {HypervideoError} If the data URL format is invalid
   */
  static extractBase64(dataUrl: string): string {
    return extractBase64(dataUrl);
  }

  /**
   * Extract the MIME type from a data URL
   *
   * @param dataUrl - Base64 encoded data URL
   * @returns MIME type string (e.g., "image/png")
   * @throws {HypervideoError} If the data URL format is invalid
   */
  static extractMimeType(dataUrl: string): string {
    return extractMimeType(dataUrl);
  }
}
