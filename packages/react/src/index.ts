// Core component and hook
export { StackedAlphaVideo, type StackedAlphaVideoProps } from './StackedAlphaVideo';
export {
  useStackedAlpha,
  type UseStackedAlphaOptions,
  type UseStackedAlphaReturn,
} from './useStackedAlpha';

// Provider for shader caching (optional, improves performance for multiple videos)
export {
  StackedAlphaProvider,
  useStackedAlphaContext,
  type StackedAlphaProviderProps,
} from './StackedAlphaProvider';

// Video preloader hook (optional, enables instant playback)
export {
  useVideoPreloader,
  type UseVideoPreloaderOptions,
  type UseVideoPreloaderReturn,
  type PreloadedVideo,
  type PreloadStatus,
} from './useVideoPreloader';

// Shader sources (for advanced use cases)
export { vertexShaderSource, fragmentShaderSource } from './shaders';

// Shader cache utilities (for advanced use cases)
export {
  getOrCreateResources,
  setupVertexAttributes,
  clearCache,
  type CachedResources,
} from './shaderCache';
