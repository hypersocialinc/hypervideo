// Common types
export type {
  RGB,
  RGBWithHex,
  ApiError,
  ApiResponse,
  HypervideoConfig,
  ResolvedConfig,
  FileInput,
  MediaInput,
  // Branded types
  Quality,
  Tolerance,
  Fps,
  PositiveDimension,
  RGBValue,
} from './common';

// Validation utilities
export {
  validateQuality,
  validateTolerance,
  validateFps,
  validateDimension,
  validateRGBValue,
  validateRGB,
} from './common';

// Error types
export { HypervideoError } from './errors';
export type { ErrorCode } from './errors';

// Image types
export type {
  ImageFit,
  ImageFormat,
  ThumbnailSize,
  NonEmptyArray,
  ResizeOptions,
  ResizeResponse,
  ThumbnailOptions,
  ThumbnailResponse,
  EmoticonOptions,
  EmoticonVariant,
  EmoticonSize,
  EmoticonResponse,
  RemoveBackgroundOptions,
  RemoveBackgroundResponse,
  DetectBackgroundColorOptions,
  DetectBackgroundColorResponse,
} from './image';

// Video types
export type {
  VideoFormat,
  VideoFormatArray,
  VideoRemoveBackgroundOptions,
  VideoOutput,
  VideoRemoveBackgroundResponse,
} from './video';
