'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { vertexShaderSource, fragmentShaderSource } from './shaders';

export interface UseStackedAlphaOptions {
  /** Auto-play video when ready */
  autoPlay?: boolean;
  /** Loop video playback */
  loop?: boolean;
  /** Mute video audio */
  muted?: boolean;
}

export interface UseStackedAlphaReturn {
  /** Ref to attach to your canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement>;
  /** Ref to the hidden video element (auto-managed) */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** Whether the video is ready to play */
  isReady: boolean;
  /** Whether the video is currently playing */
  isPlaying: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Play the video */
  play: () => Promise<void>;
  /** Pause the video */
  pause: () => void;
  /** Seek to a specific time in seconds */
  seek: (time: number) => void;
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
}

/**
 * useStackedAlpha - Hook for custom stacked alpha video implementations
 *
 * Use this hook when you need more control over the video playback
 * or want to integrate with custom UI controls.
 *
 * @example
 * ```tsx
 * function CustomPlayer({ src }) {
 *   const {
 *     canvasRef,
 *     videoRef,
 *     isReady,
 *     isPlaying,
 *     play,
 *     pause,
 *     currentTime,
 *     duration,
 *   } = useStackedAlpha(src, { autoPlay: false });
 *
 *   return (
 *     <div>
 *       <canvas ref={canvasRef} />
 *       <video ref={videoRef} style={{ display: 'none' }} />
 *       <button onClick={isPlaying ? pause : play}>
 *         {isPlaying ? 'Pause' : 'Play'}
 *       </button>
 *       <span>{currentTime} / {duration}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStackedAlpha(
  src: string,
  options: UseStackedAlphaOptions = {}
): UseStackedAlphaReturn {
  const { autoPlay = true, loop = true, muted = true } = options;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const rafRef = useRef<number | null>(null);
  const textureInitializedRef = useRef(false);
  const lastTextureSizeRef = useRef<{ width: number; height: number } | null>(null);
  const lastTimeUpdateRef = useRef(0);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const compileShader = useCallback(
    (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
      const shader = gl.createShader(type);
      if (!shader) return null;

      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const errorMsg = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        setError(new Error(`Shader compilation failed: ${errorMsg}`));
        return null;
      }

      return shader;
    },
    []
  );

  const initWebGL = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl', {
      premultipliedAlpha: false,
      alpha: true,
    });

    if (!gl) {
      setError(new Error('WebGL not supported'));
      return false;
    }

    glRef.current = gl;

    // Compile shaders
    const vs = compileShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    if (!vs || !fs) return false;

    // Create program
    const program = gl.createProgram();
    if (!program) return false;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setError(new Error('Shader program linking failed'));
      return false;
    }

    gl.useProgram(program);

    // Set up geometry
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

    // Create texture
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
  }, [compileShader]);

  const render = useCallback(() => {
    const gl = glRef.current;
    const video = videoRef.current;
    const texture = textureRef.current;

    // Don't schedule RAF when not ready or not playing (PERF: saves battery)
    if (!gl || !video || !texture || video.paused || video.ended) {
      return;
    }

    // Throttle currentTime updates to ~10/sec (PERF: reduces React reconciliation)
    const now = Date.now();
    if (now - lastTimeUpdateRef.current > 100) {
      setCurrentTime(video.currentTime);
      lastTimeUpdateRef.current = now;
    }

    // Clear and render (blend state already set in initWebGL)
    gl.clear(gl.COLOR_BUFFER_BIT);

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

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    rafRef.current = requestAnimationFrame(render);
  }, []);

  const play = useCallback(async () => {
    const video = videoRef.current;
    if (video) {
      await video.play();
    }
  }, []);

  const pause = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
    }
  }, []);

  // Initialize
  useEffect(() => {
    // Create hidden video element if not already attached
    let video = videoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.style.display = 'none';
      document.body.appendChild(video);
      (videoRef as React.MutableRefObject<HTMLVideoElement>).current = video;
    }

    video.src = src;
    video.loop = loop;
    video.muted = muted;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';

    const handleLoadedData = () => {
      const canvas = canvasRef.current;
      const gl = glRef.current;
      if (!canvas || !gl || !video) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight / 2;
      gl.viewport(0, 0, canvas.width, canvas.height);

      setDuration(video.duration);
      setIsReady(true);
    };

    const handlePlay = () => {
      setIsPlaying(true);
      render();
    };

    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setError(new Error(video?.error?.message || 'Video playback error'));
    };

    if (!initWebGL()) return;

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Note: Don't call video.load() - setting src already triggers load

    if (autoPlay) {
      video.play().catch(() => {});
    }

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [src, autoPlay, loop, muted, initWebGL, render]);

  return {
    canvasRef,
    videoRef,
    isReady,
    isPlaying,
    error,
    play,
    pause,
    seek,
    currentTime,
    duration,
  };
}

export default useStackedAlpha;
