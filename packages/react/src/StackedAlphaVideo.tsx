'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { useStackedAlphaContext } from './StackedAlphaProvider';
import { getOrCreateResources, setupVertexAttributes } from './shaderCache';

export interface StackedAlphaVideoProps {
  /** Video source URL (stacked alpha format: color on top, alpha on bottom) */
  src: string;
  /** Display width in pixels (defaults to video width) */
  width?: number;
  /** Display height in pixels (defaults to half video height) */
  height?: number;
  /** Auto-play video on load */
  autoPlay?: boolean;
  /** Loop video playback */
  loop?: boolean;
  /** Mute video audio */
  muted?: boolean;
  /** Enable inline playback on iOS */
  playsInline?: boolean;
  /** CSS class for the canvas element */
  className?: string;
  /** Inline styles for the canvas element */
  style?: React.CSSProperties;
  /** Callback when video starts playing */
  onPlay?: () => void;
  /** Callback when video ends */
  onEnded?: () => void;
  /** Callback on error */
  onError?: (error: Error) => void;
  /** Callback when video is ready to play */
  onCanPlay?: () => void;
  /**
   * Optional preloaded video element from useVideoPreloader.
   * When provided, uses this element instead of creating a new one,
   * enabling instant playback without network delay.
   */
  videoElement?: HTMLVideoElement;
}

/**
 * StackedAlphaVideo - Renders transparent video using WebGL
 *
 * Uses the stacked alpha technique where a single video contains:
 * - Top half: RGB color frames
 * - Bottom half: Grayscale alpha mask
 *
 * A WebGL shader composites them in real-time for transparent playback.
 *
 * @example
 * ```tsx
 * <StackedAlphaVideo
 *   src="/mascot-stacked.mp4"
 *   width={384}
 *   height={384}
 *   autoPlay
 *   loop
 *   muted
 * />
 * ```
 */
export function StackedAlphaVideo({
  src,
  width,
  height,
  autoPlay = true,
  loop = true,
  muted = true,
  playsInline = true,
  className,
  style,
  onPlay,
  onEnded,
  onError,
  onCanPlay,
  videoElement,
}: StackedAlphaVideoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  // Use provided videoElement or fall back to internal ref
  const videoRef = videoElement ? { current: videoElement } : internalVideoRef;
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const rafRef = useRef<number | null>(null);
  const textureInitializedRef = useRef(false);
  const lastTextureSizeRef = useRef<{ width: number; height: number } | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Use shader cache from context if available
  const context = useStackedAlphaContext();

  const compileShader = useCallback(
    (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        onError?.(new Error(`Shader compilation failed: ${error}`));
        return null;
      }

      return shader;
    },
    [onError]
  );

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return false;

    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
    });

    if (!gl) {
      onError?.(new Error('WebGL not supported'));
      return false;
    }

    glRef.current = gl;

    // Try to use cached resources first (from context or global cache)
    const cachedResources = context?.getResources(gl) ?? getOrCreateResources(gl);

    if (cachedResources) {
      // Use cached shaders and buffers
      programRef.current = cachedResources.program;
      setupVertexAttributes(gl, cachedResources);
    } else {
      // Fallback: compile shaders manually (shouldn't happen, but just in case)
      const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      if (!vs || !fs) return false;

      const program = gl.createProgram();
      if (!program) return false;

      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        onError?.(new Error('Shader program linking failed'));
        return false;
      }

      gl.useProgram(program);
      programRef.current = program;

      // Set up geometry (full-screen quad)
      const positions = new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1,
      ]);

      const texCoords = new Float32Array([
        0, 1, 1, 1, 0, 0,
        0, 0, 1, 1, 1, 0,
      ]);

      const posBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
      const posLoc = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

      const texBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, texBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
      const texLoc = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Create texture (always per-component since it holds video data)
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    // Set static GL state once (PERF: avoid setting every frame)
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    return true;
  }, [compileShader, onError, context]);

  // Render a single frame (used for first frame display)
  const renderFrame = useCallback(() => {
    const gl = glRef.current;
    const video = videoRef.current;
    const texture = textureRef.current;

    if (!gl || !video || !texture) return;

    // Need video data to render (readyState >= 2 means HAVE_CURRENT_DATA)
    if (video.readyState < 2) return;

    // Clear canvas (blend mode already set in initWebGL)
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Upload video frame to texture
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // PERF: Use texSubImage2D for in-place updates after initial allocation
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const lastSize = lastTextureSizeRef.current;

    if (!textureInitializedRef.current ||
        !lastSize ||
        lastSize.width !== videoWidth ||
        lastSize.height !== videoHeight) {
      // First time or size changed: allocate texture with texImage2D
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      textureInitializedRef.current = true;
      lastTextureSizeRef.current = { width: videoWidth, height: videoHeight };
    } else {
      // Subsequent frames: update in-place with texSubImage2D (faster)
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }, []);

  const render = useCallback(() => {
    const video = videoRef.current;

    // Only continue animation loop if video is playing
    if (!video || video.paused || video.ended) {
      return;
    }

    renderFrame();

    // Continue loop
    rafRef.current = requestAnimationFrame(render);
  }, [renderFrame]);

  const handleLoadedData = useCallback(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const gl = glRef.current;

    if (!canvas || !video || !gl) return;

    // Set canvas size to half the video height (since it's stacked)
    const outputWidth = width || video.videoWidth;
    const outputHeight = height || video.videoHeight / 2;

    // PERF: Only resize canvas if dimensions actually changed
    // (setting canvas.width/height clears GL state and reallocates framebuffer)
    if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      gl.viewport(0, 0, outputWidth, outputHeight);

      // Re-set GL state after canvas resize clears it
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    }

    // Render first frame immediately so there's no blank canvas
    renderFrame();

    setIsReady(true);
    onCanPlay?.();

    // Try to auto-play now that video has loaded data
    // This is more reliable than calling play() immediately after mount
    if (autoPlay && video.paused) {
      video.play().catch(() => {
        // Autoplay blocked - user interaction needed
      });
    }
  }, [width, height, onCanPlay, renderFrame, autoPlay]);

  const handlePlay = useCallback(() => {
    onPlay?.();
    render();
  }, [onPlay, render]);

  const handleEnded = useCallback(() => {
    onEnded?.();
  }, [onEnded]);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    onError?.(new Error(video?.error?.message || 'Video playback error'));
  }, [onError]);

  // Initialize WebGL on mount
  useEffect(() => {
    if (!initWebGL()) return;

    const video = videoRef.current;
    if (!video) return;

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [initWebGL, handleLoadedData, handlePlay, handleEnded, handleError]);

  // Update video source (setting src triggers load automatically)
  useEffect(() => {
    const video = videoRef.current;
    if (video && video.src !== src) {
      video.src = src;
      // Note: Don't call video.load() - setting src already triggers load
    }
  }, [src]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: width ? `${width}px` : undefined,
          height: height ? `${height}px` : undefined,
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          ...style,
        }}
      />
      {/* Only render internal video element if not using external preloaded video */}
      {!videoElement && (
        <video
          ref={internalVideoRef}
          src={src}
          crossOrigin="anonymous"
          preload="auto"
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline={playsInline}
          style={{ display: 'none' }}
        />
      )}
    </>
  );
}

export default StackedAlphaVideo;
