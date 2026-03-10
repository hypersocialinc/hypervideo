import type { RGBWithHex } from './common';
import type { VideoFormat } from './video';

/**
 * Job status lifecycle: queued → processing → completed | failed
 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Processing stage within a running job
 */
export type JobStage = 'loading-input' | 'processing-video' | 'uploading-outputs';

/**
 * Options for submitting an async video background removal job
 */
export type SubmitJobOptions = {
  /** Video file to process */
  file?: File | Blob | Buffer | ArrayBuffer;
  /** Video URL to process (alternative to file) */
  url?: string;
  /** Pre-uploaded Convex storage ID (alternative to file/url) */
  inputStorageId?: string;
  /** Background removal sensitivity 0-100 (default: 30) */
  tolerance?: number;
  /** Frames per second for processing 1-60 (default: 24) */
  fps?: number;
  /** Single output format */
  format?: VideoFormat;
  /** Multiple output formats */
  formats?: VideoFormat[];
  /** Manual chromakey color */
  chromaKey?: { r: number; g: number; b: number };
  /** Quality 0-100 (default: 60) */
  quality?: number;
  /** Webhook URL for completion notification */
  webhookUrl?: string;
};

/**
 * Response from submitting a job (HTTP 202)
 */
export interface SubmitJobResponse {
  /** Unique job identifier */
  jobId: string;
  /** Initial status (always 'queued') */
  status: 'queued';
}

/**
 * Individual output format in a completed job
 */
export interface JobOutput {
  /** Output format */
  format: VideoFormat;
  /** Signed download URL */
  url: string;
  /** File size in bytes */
  size: number;
}

/**
 * Completed job result
 */
export interface JobResult {
  /** Signed URL for primary output */
  outputUrl: string;
  /** Primary output format */
  outputFormat: VideoFormat;
  /** Primary output size in bytes */
  outputSize: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Detected background color */
  detectedBackgroundColor?: RGBWithHex;
  /** All format outputs */
  outputs: JobOutput[];
}

/**
 * Full job status response from GET /api/v1/jobs/:jobId
 */
export interface JobResponse {
  /** Unique job identifier */
  jobId: string;
  /** Job type */
  type: 'video';
  /** Current status */
  status: JobStatus;
  /** Progress percentage 0-100 */
  progress: number | null;
  /** Current processing stage */
  stage: JobStage | null;
  /** Job creation timestamp */
  createdAt: number;
  /** Processing start timestamp */
  startedAt: number | null;
  /** Completion timestamp */
  completedAt: number | null;
  /** Error details (only when status === 'failed') */
  error: { code: string; message: string } | null;
  /** Result data (only when status === 'completed') */
  result: JobResult | null;
}

/**
 * Options for polling a job until completion
 */
export interface PollOptions {
  /** Polling interval in milliseconds (default: 2000) */
  interval?: number;
  /** Maximum time to wait in milliseconds (default: 300000 = 5 min) */
  timeout?: number;
  /** Callback invoked on each poll with current job state */
  onProgress?: (job: JobResponse) => void;
}
