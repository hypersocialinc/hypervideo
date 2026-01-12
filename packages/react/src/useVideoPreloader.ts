'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type PreloadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PreloadedVideo {
  url: string;
  element: HTMLVideoElement;
  status: PreloadStatus;
  error?: Error;
}

export interface UseVideoPreloaderOptions {
  /**
   * Whether to start preloading immediately on mount.
   * @default true
   */
  autoPreload?: boolean;

  /**
   * Whether video elements should loop.
   * @default true
   */
  loop?: boolean;

  /**
   * Whether video elements should be muted.
   * @default true
   */
  muted?: boolean;
}

export interface UseVideoPreloaderReturn {
  /**
   * Map of all preloaded videos keyed by URL.
   */
  videos: Map<string, PreloadedVideo>;

  /**
   * Check if a specific video is ready to play.
   */
  isReady: (url: string) => boolean;

  /**
   * Check if all videos are ready to play.
   */
  allReady: boolean;

  /**
   * Get the preloaded video element for a URL.
   * Returns null if not found or not ready.
   */
  getVideo: (url: string) => HTMLVideoElement | null;

  /**
   * Get the preload status for a specific URL.
   */
  getStatus: (url: string) => PreloadStatus;

  /**
   * Manually trigger preloading for a specific URL.
   */
  preload: (url: string) => void;

  /**
   * Preload all URLs that haven't been preloaded yet.
   */
  preloadAll: () => void;
}

/**
 * useVideoPreloader - Preload stacked alpha videos for instant playback
 *
 * This hook creates hidden video elements that load in the background,
 * allowing for instant playback when the video needs to be displayed.
 *
 * @example
 * ```tsx
 * function MascotPlayer() {
 *   const { isReady, getVideo, allReady } = useVideoPreloader([
 *     '/happy.mp4',
 *     '/sad.mp4',
 *     '/thinking.mp4'
 *   ]);
 *
 *   const [currentEmote, setCurrentEmote] = useState('/happy.mp4');
 *
 *   return (
 *     <div>
 *       {!allReady && <LoadingSpinner />}
 *       {isReady(currentEmote) && (
 *         <StackedAlphaVideo
 *           src={currentEmote}
 *           videoElement={getVideo(currentEmote)}
 *         />
 *       )}
 *       <button onClick={() => setCurrentEmote('/sad.mp4')}>Sad</button>
 *       <button onClick={() => setCurrentEmote('/happy.mp4')}>Happy</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useVideoPreloader(
  urls: string[],
  options: UseVideoPreloaderOptions = {}
): UseVideoPreloaderReturn {
  const { autoPreload = true, loop = true, muted = true } = options;

  const [videos, setVideos] = useState<Map<string, PreloadedVideo>>(new Map());
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Create video element and start preloading
  const preloadVideo = useCallback(
    (url: string) => {
      // Skip if already preloading/preloaded
      if (videoElementsRef.current.has(url)) {
        return;
      }

      const video = document.createElement('video');
      video.style.display = 'none';
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.loop = loop;
      video.muted = muted;
      video.playsInline = true;

      // Store element in ref immediately
      videoElementsRef.current.set(url, video);

      // Set initial loading state
      setVideos((prev) => {
        const next = new Map(prev);
        next.set(url, { url, element: video, status: 'loading' });
        return next;
      });

      // Handle successful load
      const handleCanPlayThrough = () => {
        setVideos((prev) => {
          const next = new Map(prev);
          next.set(url, { url, element: video, status: 'ready' });
          return next;
        });
      };

      // Handle errors
      const handleError = () => {
        const error = new Error(video.error?.message || 'Failed to load video');
        setVideos((prev) => {
          const next = new Map(prev);
          next.set(url, { url, element: video, status: 'error', error });
          return next;
        });
      };

      video.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
      video.addEventListener('error', handleError, { once: true });

      // Append to DOM and start loading
      document.body.appendChild(video);
      video.src = url;
    },
    [loop, muted]
  );

  // Preload all URLs
  const preloadAll = useCallback(() => {
    urls.forEach((url) => preloadVideo(url));
  }, [urls, preloadVideo]);

  // Auto-preload on mount if enabled
  useEffect(() => {
    if (autoPreload) {
      preloadAll();
    }

    // Cleanup on unmount
    return () => {
      videoElementsRef.current.forEach((video) => {
        video.pause();
        video.src = '';
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      });
      videoElementsRef.current.clear();
    };
  }, [autoPreload, preloadAll]);

  // Check if a specific video is ready
  const isReady = useCallback(
    (url: string): boolean => {
      const video = videos.get(url);
      return video?.status === 'ready';
    },
    [videos]
  );

  // Check if all videos are ready
  const allReady = urls.every((url) => videos.get(url)?.status === 'ready');

  // Get preloaded video element
  const getVideo = useCallback(
    (url: string): HTMLVideoElement | null => {
      const video = videos.get(url);
      if (video?.status === 'ready') {
        return video.element;
      }
      return null;
    },
    [videos]
  );

  // Get status for a specific URL
  const getStatus = useCallback(
    (url: string): PreloadStatus => {
      return videos.get(url)?.status ?? 'idle';
    },
    [videos]
  );

  return {
    videos,
    isReady,
    allReady,
    getVideo,
    getStatus,
    preload: preloadVideo,
    preloadAll,
  };
}

export default useVideoPreloader;
