import { requireNativeViewManager } from "expo-modules-core";
import * as React from "react";
import { ViewStyle, StyleProp, Image } from "react-native";

export interface StackedAlphaVideoProps {
  /**
   * Video source - URI string, object with uri, or local asset (require())
   * Supports both `src` (string) and `source` (object/number) for API compatibility
   */
  source?: { uri: string } | number;

  /**
   * Video source as a string URL (alternative to `source` for API compatibility with @hypervideo/expo)
   */
  src?: string;

  /**
   * Style for the video container
   */
  style?: StyleProp<ViewStyle>;

  /**
   * Explicit width for the video view (optional sizing hint for debugging)
   */
  width?: number;

  /**
   * Explicit height for the video view (optional sizing hint for debugging)
   */
  height?: number;

  /**
   * Whether to loop the video
   * @default true
   */
  loop?: boolean;

  /**
   * Whether to automatically play the video when loaded
   * @default true
   */
  autoPlay?: boolean;

  /**
   * Whether video playback is paused
   * @default false
   */
  paused?: boolean;

  /**
   * Whether the video is muted
   * @default true (stacked-alpha videos typically have no audio)
   */
  muted?: boolean;

  /**
   * Called when the video is ready to play
   */
  onLoad?: () => void;

  /**
   * Called when the video playback ends (only fires if loop is false)
   */
  onEnd?: () => void;

  /**
   * Called when an error occurs
   */
  onError?: (error: string) => void;
}

interface NativeProps {
  sourceUri: string;
  isLocalAsset: boolean;
  loop: boolean;
  paused: boolean;
  muted: boolean;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  onLoad?: () => void;
  onEnd?: () => void;
  onError?: (event: { nativeEvent: { error: string } }) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NativeView = requireNativeViewManager("StackedAlphaVideo") as React.ComponentType<any>;

/**
 * A native iOS view component that renders stacked-alpha videos with proper transparency.
 * Uses Metal shaders for GPU-accelerated alpha compositing.
 *
 * The video format expected is "stacked alpha":
 * - Top half of the video contains RGB color data
 * - Bottom half contains alpha/mask data (grayscale)
 *
 * The Metal shader samples both halves and composites them in real-time.
 *
 * @example
 * // Using src prop (string URL) - compatible with @hypervideo/expo
 * <StackedAlphaVideo src="https://example.com/video.mp4" autoPlay loop muted />
 *
 * @example
 * // Using source prop (object or require)
 * <StackedAlphaVideo source={{ uri: "https://example.com/video.mp4" }} />
 * <StackedAlphaVideo source={require('./video.mp4')} />
 */
export default function StackedAlphaVideo({
  source,
  src,
  style,
  width,
  height,
  loop = true,
  autoPlay = true,
  paused = false,
  muted = true,
  onLoad,
  onEnd,
  onError,
}: StackedAlphaVideoProps) {
  // Resolve source to URI - supports both `src` (string) and `source` (object/number)
  const { sourceUri, isLocalAsset, resolveError } = React.useMemo(() => {
    // Prefer `src` prop if provided (string URL)
    if (src) {
      if (typeof src !== "string" || !src.trim()) {
        return {
          sourceUri: "",
          isLocalAsset: false,
          resolveError: "Invalid src prop: must be a non-empty string URL",
        };
      }
      return { sourceUri: src, isLocalAsset: false, resolveError: null };
    }

    // Fall back to `source` prop
    if (source === undefined || source === null) {
      return {
        sourceUri: "",
        isLocalAsset: false,
        resolveError: "No video source provided. Use either 'src' or 'source' prop.",
      };
    }

    if (typeof source === "number") {
      // Local asset via require() - resolve to actual file URI
      try {
        const resolved = Image.resolveAssetSource(source);
        if (!resolved || !resolved.uri) {
          return {
            sourceUri: "",
            isLocalAsset: true,
            resolveError:
              "Failed to resolve local asset. Check that the require() path is correct.",
          };
        }
        return { sourceUri: resolved.uri, isLocalAsset: true, resolveError: null };
      } catch (e) {
        return {
          sourceUri: "",
          isLocalAsset: true,
          resolveError: `Failed to resolve local asset: ${e instanceof Error ? e.message : "Unknown error"}`,
        };
      }
    }

    if (!source.uri || typeof source.uri !== "string") {
      return {
        sourceUri: "",
        isLocalAsset: false,
        resolveError: "Invalid source.uri: must be a non-empty string",
      };
    }

    return { sourceUri: source.uri, isLocalAsset: false, resolveError: null };
  }, [source, src]);

  // Report resolution errors
  React.useEffect(() => {
    if (resolveError) {
      onError?.(resolveError);
    }
  }, [resolveError, onError]);

  // Compute effective paused state from both autoPlay and paused props
  const effectivePaused = paused || !autoPlay;

  const handleError = React.useCallback(
    (event: { nativeEvent: { error: string } }) => {
      onError?.(event.nativeEvent.error);
    },
    [onError]
  );

  const handleLoad = React.useCallback(() => {
    onLoad?.();
  }, [onLoad]);

  const handleEnd = React.useCallback(() => {
    onEnd?.();
  }, [onEnd]);

  // Don't render if there's a resolution error
  if (resolveError) {
    return null;
  }

  return (
    <NativeView
      sourceUri={sourceUri}
      isLocalAsset={isLocalAsset}
      loop={loop}
      paused={effectivePaused}
      muted={muted}
      width={width}
      height={height}
      style={style}
      onLoad={handleLoad}
      onEnd={handleEnd}
      onError={handleError}
    />
  );
}
