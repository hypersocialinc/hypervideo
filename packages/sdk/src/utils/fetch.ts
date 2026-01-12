import { HypervideoError } from '../types/errors';
import type { ApiResponse } from '../types/common';
import type { ErrorCode } from '../types/errors';

/**
 * Options for making requests
 */
export interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Isomorphic fetch wrapper with timeout and error handling
 *
 * @typeParam T - Expected response data type
 * @param url - Full URL to request
 * @param options - Fetch options with optional timeout
 * @returns Promise resolving to parsed response data
 * @throws {HypervideoError} On timeout, network error, or API error
 */
export async function request<T>(
  url: string,
  options: RequestOptions
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Extract endpoint for error context
  const endpoint = url.split('/api/')[1] || url;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    // Handle non-JSON responses (like ZIP files)
    const contentType = response.headers.get('content-type') || '';
    if (
      contentType.includes('application/zip') ||
      contentType.includes('application/octet-stream')
    ) {
      if (!response.ok) {
        throw new HypervideoError(
          'PROCESSING_FAILED',
          `Request to ${endpoint} failed with status ${response.status}`,
          response.status,
          { endpoint, contentType }
        );
      }
      return response.blob() as Promise<T>;
    }

    // Parse JSON response
    let data: ApiResponse<T>;
    try {
      data = await response.json();
    } catch (parseError) {
      const errorMessage = parseError instanceof Error
        ? parseError.message
        : 'Unknown parse error';
      throw new HypervideoError(
        'NETWORK_ERROR',
        `Failed to parse response as JSON: ${errorMessage}`,
        response.status,
        {
          endpoint,
          contentType,
          parseError: errorMessage,
        }
      );
    }

    // Handle HTTP errors
    if (!response.ok) {
      throw new HypervideoError(
        (data.error?.code as ErrorCode) || 'UNKNOWN_ERROR',
        data.error?.message || response.statusText,
        response.status,
        data.error?.details
      );
    }

    // Handle API-level errors (discriminated union - if not success, data is undefined)
    if (!data.success) {
      throw new HypervideoError(
        (data.error?.code as ErrorCode) || 'PROCESSING_FAILED',
        data.error?.message || 'Request failed',
        response.status,
        data.error?.details
      );
    }

    return data.data;
  } catch (error) {
    if (error instanceof HypervideoError) {
      throw error;
    }

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      const isVideoEndpoint = endpoint.includes('video');
      const suggestion = isVideoEndpoint
        ? ' Video processing may require a longer timeout (default: 120s).'
        : '';
      throw new HypervideoError(
        'TIMEOUT',
        `Request to ${endpoint} timed out after ${timeout}ms.${suggestion}`,
        undefined,
        { endpoint, timeout }
      );
    }

    // Handle network errors
    if (error instanceof Error) {
      throw new HypervideoError(
        'NETWORK_ERROR',
        error.message,
        undefined,
        {
          endpoint,
          originalError: error.message,
          errorName: error.name,
          // Include Node.js error codes if available
          errorCode: (error as NodeJS.ErrnoException).code,
        }
      );
    }

    throw new HypervideoError(
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      undefined,
      { endpoint }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
