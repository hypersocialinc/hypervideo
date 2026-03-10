import { request } from '../utils/fetch';
import { buildFormData } from '../utils/form-data';
import { HypervideoError } from '../types/errors';
import type { ErrorCode } from '../types/errors';
import type { ResolvedConfig } from '../types/common';
import type {
  SubmitJobOptions,
  SubmitJobResponse,
  JobResponse,
  PollOptions,
} from '../types/jobs';

/**
 * Async job endpoints for long-running video processing
 */
export class JobsEndpoints {
  constructor(private config: ResolvedConfig) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Submit an async video background removal job
   *
   * Returns immediately with a jobId. Use `get()` or `poll()` to check status.
   *
   * @param options - Job options (same as video.removeBackground + webhookUrl)
   * @returns Job ID and initial status
   *
   * @example
   * ```ts
   * const { jobId } = await client.jobs.submit({
   *   file: videoFile,
   *   formats: ['webm', 'stacked-alpha'],
   * });
   *
   * // Poll until complete
   * const result = await client.jobs.poll(jobId, {
   *   onProgress: (job) => console.log(`${job.progress}% - ${job.stage}`),
   * });
   * ```
   */
  async submit(options: SubmitJobOptions): Promise<SubmitJobResponse> {
    if (!options.file && !options.url && !options.inputStorageId) {
      throw new HypervideoError(
        'INVALID_REQUEST',
        "Either 'file', 'url', or 'inputStorageId' is required for jobs.submit",
      );
    }

    const formData = buildFormData(options);

    return request<SubmitJobResponse>(
      `${this.config.baseUrl}/api/v1/jobs/video/remove-background`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Get the current status of a job
   *
   * @param jobId - Job identifier from submit()
   * @returns Current job state including progress, stage, and result when complete
   */
  async get(jobId: string): Promise<JobResponse> {
    return request<JobResponse>(
      `${this.config.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: this.headers,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Poll a job until it completes or fails
   *
   * @param jobId - Job identifier from submit()
   * @param options - Polling configuration
   * @returns Completed job response
   * @throws {HypervideoError} If job fails or polling times out
   *
   * @example
   * ```ts
   * const job = await client.jobs.poll(jobId, {
   *   interval: 2000,
   *   timeout: 300000,
   *   onProgress: (job) => {
   *     console.log(`Status: ${job.status}, Progress: ${job.progress}%`);
   *   },
   * });
   *
   * if (job.result) {
   *   console.log('Output URL:', job.result.outputUrl);
   * }
   * ```
   */
  async poll(jobId: string, options?: PollOptions): Promise<JobResponse> {
    const interval = options?.interval ?? 2000;
    const timeout = options?.timeout ?? 300000;
    const startTime = Date.now();

    while (true) {
      const job = await this.get(jobId);

      if (options?.onProgress) {
        options.onProgress(job);
      }

      if (job.status === 'completed') {
        return job;
      }

      if (job.status === 'failed') {
        throw new HypervideoError(
          (job.error?.code as ErrorCode) ?? 'JOB_FAILED',
          job.error?.message ?? 'Job processing failed',
          undefined,
          { jobId, status: job.status }
        );
      }

      if (Date.now() - startTime > timeout) {
        throw new HypervideoError(
          'JOB_TIMEOUT',
          `Job ${jobId} did not complete within ${timeout}ms`,
          undefined,
          { jobId, timeout }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}
