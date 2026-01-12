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
