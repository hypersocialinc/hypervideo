// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Image Processing Types
export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessedImage {
  url: string;
  size: number;
  width?: number;
  height?: number;
  format?: string;
}

// Background Removal Types
export interface BackgroundRemovalOptions {
  tolerance?: number;
  edgeSampleSize?: number;
  smoothEdges?: boolean;
}

export interface BackgroundColor {
  r: number;
  g: number;
  b: number;
}

export interface BackgroundRemovalResponse {
  url: string;
  format: string;
  width: number;
  height: number;
  size: number;
  processingTime: number;
  detectedBackgroundColor: BackgroundColor;
}

// Image Generation Types
export type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | '9:16';

export interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: AspectRatio;
  tolerance?: number;
  edgeSampleSize?: number;
  smoothEdges?: boolean;
}

export interface ImageGenerationResponse {
  original: ProcessedImage & { width: number; height: number };
  processed: ProcessedImage;
  prompt: {
    user: string;
    enhanced: string;
  };
  settings: {
    tolerance: number;
    edgeSampleSize: number;
    smoothEdges: boolean;
    aspectRatio: AspectRatio;
  };
  timing: {
    generation: number;
    processing: number;
    total: number;
  };
}

// Image Resize Types
export interface ResizeOptions {
  width?: number;
  height?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  position?: string;
}

// Thumbnail Types
export interface ThumbnailOptions {
  size: number;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}

// Emoji Types
export interface EmojiOptions {
  size?: number;
  format?: 'png' | 'webp';
}

// Video Processing Types
export type VideoFormat = 'webm' | 'stacked-alpha' | 'webp' | 'apng' | 'mov';

export type VideoProcessingMethod = 'chromakey' | 'ai';

export interface VideoRemoveBackgroundOptions {
  tolerance?: number;
  fps?: number;
  format?: VideoFormat;
  formats?: VideoFormat[];
  chromaKey?: BackgroundColor;
  quality?: number;
}

export interface VideoOutput {
  format: VideoFormat;
  url: string;
  size: number;
}

export interface VideoRemoveBackgroundResponse {
  url: string;
  format: VideoFormat;
  size: number;
  width: number;
  height: number;
  duration: number;
  frameCount: number;
  fps: number;
  processingTime: number;
  processingMethod?: VideoProcessingMethod;
  outputs?: VideoOutput[];
  detectedBackgroundColor?: BackgroundColor & { hex: string };
}

// Async Job Types
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type JobStage = 'loading-input' | 'processing-video' | 'uploading-outputs';

export interface JobResult {
  outputUrl: string;
  outputFormat: VideoFormat;
  outputSize: number;
  width: number;
  height: number;
  processingTimeMs: number;
  detectedBackgroundColor?: BackgroundColor & { hex: string };
  outputs: Array<{ format: VideoFormat; url: string; size: number }>;
}

export interface JobResponse {
  jobId: string;
  type: 'video';
  status: JobStatus;
  progress: number | null;
  stage: JobStage | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: { code: string; message: string } | null;
  result: JobResult | null;
}
