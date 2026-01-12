import { HypervideoError } from '../types/errors';

/**
 * Convert a base64 data URL to a Blob
 * Works in both browser and Node.js environments
 *
 * @param dataUrl - Base64 encoded data URL (e.g., "data:image/png;base64,...")
 * @returns Blob object with correct MIME type
 * @throws {HypervideoError} If the data URL format is invalid
 *
 * @example
 * ```ts
 * const blob = dataUrlToBlob('data:image/png;base64,iVBORw0...');
 * ```
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    const preview = dataUrl.substring(0, 50);
    throw new HypervideoError(
      'INVALID_REQUEST',
      `Invalid data URL format in dataUrlToBlob. Expected "data:<mime>;base64,<data>"`,
      undefined,
      {
        inputLength: dataUrl.length,
        startsWithData: dataUrl.startsWith('data:'),
        preview: preview + (dataUrl.length > 50 ? '...' : ''),
      }
    );
  }

  const mime = matches[1];
  const base64 = matches[2];

  // Decode base64
  let bytes: Uint8Array;
  if (typeof atob !== 'undefined') {
    // Browser environment
    const binary = atob(base64);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    // Node.js environment
    bytes = new Uint8Array(Buffer.from(base64, 'base64'));
  }

  return new Blob([bytes.buffer as ArrayBuffer], { type: mime });
}

/**
 * Convert a Blob to a base64 data URL
 *
 * @param blob - Blob object to convert
 * @returns Base64 encoded data URL
 * @throws {HypervideoError} If the blob cannot be read
 */
export async function toDataUrl(blob: Blob): Promise<string> {
  // Browser environment with FileReader
  if (typeof FileReader !== 'undefined') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => {
        const readerError = reader.error;
        reject(new HypervideoError(
          'PROCESSING_FAILED',
          `Failed to read blob: ${readerError?.message || 'Unknown FileReader error'}`,
          undefined,
          {
            errorName: readerError?.name,
            blobSize: blob.size,
            blobType: blob.type,
          }
        ));
      };
      reader.readAsDataURL(blob);
    });
  }

  // Node.js environment
  const buffer = Buffer.from(await blob.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mime = blob.type || 'application/octet-stream';
  return `data:${mime};base64,${base64}`;
}

/**
 * Extract the base64 string from a data URL
 *
 * @param dataUrl - Base64 encoded data URL
 * @returns Raw base64 string without the data URL prefix
 * @throws {HypervideoError} If the data URL format is invalid
 */
export function extractBase64(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(',');
  if (commaIndex === -1) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      'Invalid data URL format in extractBase64: missing comma separator',
      undefined,
      {
        inputLength: dataUrl.length,
        startsWithData: dataUrl.startsWith('data:'),
      }
    );
  }
  return dataUrl.substring(commaIndex + 1);
}

/**
 * Extract the MIME type from a data URL
 *
 * @param dataUrl - Base64 encoded data URL
 * @returns MIME type string (e.g., "image/png")
 * @throws {HypervideoError} If the data URL format is invalid
 */
export function extractMimeType(dataUrl: string): string {
  const matches = dataUrl.match(/^data:([^;,]+)/);
  if (!matches) {
    throw new HypervideoError(
      'INVALID_REQUEST',
      'Invalid data URL format in extractMimeType: missing MIME type',
      undefined,
      {
        inputLength: dataUrl.length,
        startsWithData: dataUrl.startsWith('data:'),
      }
    );
  }
  return matches[1];
}
