import { HypervideoError } from '../types/errors';
import type { FileInput } from '../types/common';

/**
 * Check if a value is a Node.js Buffer
 * @internal
 */
function isBuffer(value: unknown): value is Buffer {
  return typeof Buffer !== 'undefined' && Buffer.isBuffer(value);
}

/**
 * Detect MIME type from buffer magic bytes
 * @internal
 */
function detectMimeType(buffer: Buffer | Uint8Array): string {
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // GIF: 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return 'image/gif';
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return 'image/webp';
  }
  // MP4: ... 66 74 79 70 (ftyp at offset 4)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return 'video/mp4';
  }
  // WebM: 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return 'video/webm';
  }
  // MOV: ... 66 74 79 70 71 74 (ftypqt)
  if (buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70 &&
      buffer[8] === 0x71 && buffer[9] === 0x74) {
    return 'video/quicktime';
  }
  // Default fallback
  return 'application/octet-stream';
}

/**
 * Convert a FileInput to a Blob for FormData
 *
 * @param input - File, Blob, Buffer, or ArrayBuffer
 * @returns Blob suitable for FormData
 * @throws {HypervideoError} If the input type is not supported
 * @internal
 */
function fileInputToBlob(input: FileInput): Blob {
  if (input instanceof Blob || input instanceof File) {
    return input;
  }

  if (isBuffer(input)) {
    const mimeType = detectMimeType(input);
    return new Blob([new Uint8Array(input)], { type: mimeType });
  }

  if (input instanceof ArrayBuffer) {
    const mimeType = detectMimeType(new Uint8Array(input));
    return new Blob([input], { type: mimeType });
  }

  const receivedType = typeof input;
  const constructorName = (input as { constructor?: { name?: string } })?.constructor?.name;
  throw new HypervideoError(
    'INVALID_REQUEST',
    `Invalid file input type: received ${receivedType}${constructorName ? ` (${constructorName})` : ''}. Expected File, Blob, Buffer, or ArrayBuffer.`,
    undefined,
    { receivedType, constructorName }
  );
}

/**
 * Build FormData from options object
 *
 * Handles:
 * - File uploads (file -> Blob)
 * - Objects (chromaKey -> JSON)
 * - Arrays (formats, sizes -> JSON)
 * - Primitives (string, number, boolean)
 *
 * @param options - Options object to convert
 * @returns FormData ready for fetch
 * @throws {HypervideoError} If file input type is invalid
 */
export function buildFormData<T extends object>(options: T): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (key === 'file') {
      const blob = fileInputToBlob(value as FileInput);
      formData.append('file', blob);
    } else if (key === 'chromaKey') {
      formData.append(key, JSON.stringify(value));
    } else if (Array.isArray(value)) {
      // Standardize all arrays to JSON format
      formData.append(key, JSON.stringify(value));
    } else if (typeof value === 'boolean') {
      formData.append(key, value.toString());
    } else if (typeof value === 'number') {
      formData.append(key, value.toString());
    } else if (typeof value === 'string') {
      formData.append(key, value);
    }
  }

  return formData;
}
