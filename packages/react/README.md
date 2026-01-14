# @hypervideo-dev/react

WebGL-based transparent video player using the **stacked alpha** technique. Play transparent videos in any browser without format-specific codec support.

## How It Works

The stacked alpha technique stores both color and alpha in a single video file:
- **Top half**: RGB color frames
- **Bottom half**: Grayscale alpha mask (white = opaque, black = transparent)

A WebGL shader samples both halves and composites them in real-time, producing transparent video output.

**Benefits:**
- Works in all browsers (Chrome, Firefox, Safari, Edge)
- Single file instead of dual HEVC + WebM formats
- ~60% smaller file size compared to dual-format approach
- No Mac required for encoding

## Installation

```bash
npm install @hypervideo-dev/react
# or
pnpm add @hypervideo-dev/react
```

## Usage

### Basic Component

```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

function MascotDisplay() {
  return (
    <StackedAlphaVideo
      src="/mascot-stacked.mp4"
      width={384}
      height={384}
      autoPlay
      loop
      muted
      className="absolute bottom-0 right-0"
    />
  );
}
```

### With Custom Controls (Hook)

```tsx
import { useStackedAlpha } from '@hypervideo-dev/react';

function CustomVideoPlayer({ src }) {
  const {
    canvasRef,
    videoRef,
    isReady,
    isPlaying,
    play,
    pause,
    currentTime,
    duration,
  } = useStackedAlpha(src, { autoPlay: false });

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="w-full" />
      <video ref={videoRef} style={{ display: 'none' }} />

      {isReady && (
        <div className="controls">
          <button onClick={isPlaying ? pause : play}>
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <span>{Math.round(currentTime)}s / {Math.round(duration)}s</span>
        </div>
      )}
    </div>
  );
}
```

## API Reference

### Exports

```tsx
import {
  // Core component and hook
  StackedAlphaVideo,
  useStackedAlpha,

  // Performance optimization
  StackedAlphaProvider,
  useStackedAlphaContext,
  useVideoPreloader,

  // Advanced: shader sources and cache utilities
  vertexShaderSource,
  fragmentShaderSource,
  getOrCreateResources,
  setupVertexAttributes,
  clearCache,
} from '@hypervideo-dev/react';
```

## Props

### StackedAlphaVideo

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | required | Video source URL |
| `width` | `number` | auto | Display width in pixels |
| `height` | `number` | auto | Display height in pixels |
| `autoPlay` | `boolean` | `true` | Auto-play on load |
| `loop` | `boolean` | `true` | Loop playback |
| `muted` | `boolean` | `true` | Mute audio |
| `playsInline` | `boolean` | `true` | iOS inline playback |
| `className` | `string` | - | CSS class for canvas |
| `style` | `CSSProperties` | - | Inline styles |
| `onPlay` | `() => void` | - | Play callback |
| `onEnded` | `() => void` | - | End callback |
| `onError` | `(error: Error) => void` | - | Error callback |
| `onCanPlay` | `() => void` | - | Ready callback |
| `videoElement` | `HTMLVideoElement` | - | Preloaded video element (for instant playback) |

## Performance Optimization

For apps with multiple transparent videos or frequent video switching (like mascot players with different emotes), use these optimization features for instant playback.

### StackedAlphaProvider (Shader Caching)

Wrap your app or video container with `StackedAlphaProvider` to cache compiled WebGL shaders across all video instances:

```tsx
import { StackedAlphaProvider, StackedAlphaVideo } from '@hypervideo-dev/react';

function App() {
  return (
    <StackedAlphaProvider>
      {/* All StackedAlphaVideo components share cached shaders */}
      <StackedAlphaVideo src="/happy.mp4" />
      <StackedAlphaVideo src="/sad.mp4" />
      <StackedAlphaVideo src="/thinking.mp4" />
    </StackedAlphaProvider>
  );
}
```

**Performance impact:**
- First video: ~100-150ms WebGL initialization
- Subsequent videos: ~5ms (reuses cached shaders)

### useVideoPreloader (Video Preloading)

Preload videos before they're needed for instant playback:

```tsx
import {
  StackedAlphaProvider,
  StackedAlphaVideo,
  useVideoPreloader
} from '@hypervideo-dev/react';

function MascotPlayer() {
  const [currentEmote, setCurrentEmote] = useState('/happy.mp4');

  // Preload all emote videos on mount
  const { isReady, getVideo, allReady } = useVideoPreloader([
    '/happy.mp4',
    '/sad.mp4',
    '/thinking.mp4',
    '/excited.mp4',
  ]);

  return (
    <StackedAlphaProvider>
      {/* Show loading state while preloading */}
      {!allReady && <LoadingSpinner />}

      {/* Use preloaded video element for instant playback */}
      {isReady(currentEmote) && (
        <StackedAlphaVideo
          src={currentEmote}
          videoElement={getVideo(currentEmote)} // Instant playback!
          width={384}
          height={384}
        />
      )}

      {/* Switch emotes instantly */}
      <div className="buttons">
        <button onClick={() => setCurrentEmote('/happy.mp4')}>Happy</button>
        <button onClick={() => setCurrentEmote('/sad.mp4')}>Sad</button>
        <button onClick={() => setCurrentEmote('/thinking.mp4')}>Thinking</button>
      </div>
    </StackedAlphaProvider>
  );
}
```

### useVideoPreloader Options

```tsx
const {
  videos,      // Map of all preloaded videos
  isReady,     // Check if specific video is ready
  allReady,    // Check if all videos are ready
  getVideo,    // Get preloaded video element
  getStatus,   // Get status: 'idle' | 'loading' | 'ready' | 'error'
  preload,     // Manually trigger preload for a URL
  preloadAll,  // Preload all URLs
} = useVideoPreloader(urls, {
  autoPreload: true,  // Start preloading on mount (default: true)
  loop: true,         // Video loop setting (default: true)
  muted: true,        // Video muted setting (default: true)
});
```

### Preload on Hover Pattern

For grids or lists, preload videos when users hover:

```tsx
import { useState, useEffect, useRef } from 'react';

function VideoCard({ src, onClick }) {
  const [isHovered, setIsHovered] = useState(false);
  const preloadRef = useRef<HTMLVideoElement | null>(null);

  // Start preloading on hover
  useEffect(() => {
    if (!isHovered || !src || preloadRef.current) return;

    const video = document.createElement('video');
    video.style.display = 'none';
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.muted = true;
    video.src = src;
    document.body.appendChild(video);
    preloadRef.current = video;

    return () => {
      if (preloadRef.current?.parentNode) {
        preloadRef.current.parentNode.removeChild(preloadRef.current);
      }
    };
  }, [isHovered, src]);

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* Card content */}
    </div>
  );
}
```

### Performance Comparison

| Scenario | Without Optimization | With Optimization |
|----------|---------------------|-------------------|
| First video load | 3-4s | 2-3s |
| Second video (same page) | 3-4s | 0.5-1s |
| With preloading | 3-4s | **<100ms** |
| Modal reopen (cached) | 0.5-1s | **<50ms** |

## Browser Support

The player uses WebGL for rendering, which is supported in all modern browsers:

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | Full | Recommended |
| Firefox | Full | |
| Safari | Full | Requires `playsInline` for iOS |
| Edge | Full | |
| IE11 | Partial | WebGL may have limited support |

**Requirements:**
- WebGL-enabled browser
- Hardware graphics acceleration enabled
- For iOS: `playsInline` prop is required (enabled by default)

## CORS Configuration

When loading videos from a different domain (CDN, cloud storage), you must configure CORS properly:

### Server-Side
Your video server must include the appropriate CORS headers:

```
Access-Control-Allow-Origin: https://your-domain.com
```

Or for development:
```
Access-Control-Allow-Origin: *
```

### Client-Side
The component automatically sets `crossOrigin="anonymous"` on the video element. This is required for WebGL to read pixels from cross-origin videos.

**If you get a CORS error:**
1. Verify your server sends the `Access-Control-Allow-Origin` header
2. Check that the header value matches your domain (or is `*`)
3. Ensure no caching is returning old responses without CORS headers

### Common CDN Configurations

**AWS S3 + CloudFront:**
```json
{
  "CORSRules": [{
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedOrigins": ["https://your-domain.com"],
    "MaxAgeSeconds": 3000
  }]
}
```

**Convex Storage:** CORS is automatically configured.

## Error Handling

Handle errors gracefully with the `onError` callback:

```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

function VideoWithFallback({ src, fallbackImage }) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <img src={fallbackImage} alt="Fallback" />;
  }

  return (
    <StackedAlphaVideo
      src={src}
      onError={(error) => {
        console.error('Video failed:', error.message);
        setHasError(true);
      }}
      onCanPlay={() => console.log('Video ready')}
    />
  );
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "WebGL not supported" | Browser lacks WebGL | Show fallback content |
| "Shader compilation failed" | GPU driver issue | Update graphics drivers |
| CORS/cross-origin error | Missing CORS headers | Configure server headers |
| Autoplay blocked | Browser policy | Add `muted` prop or user interaction |

## Creating Stacked Alpha Videos

Use FFmpeg to convert a video with solid background to stacked alpha format:

```bash
ffmpeg -y -i input.mp4 \
  -filter_complex "
    [0:v]split[rgb][forAlpha];
    [forAlpha]chromakey=0x00FF00:0.12:0.05,format=rgba,alphaextract[alpha];
    [rgb][alpha]vstack
  " \
  -c:v libx264 -crf 23 -pix_fmt yuv420p \
  output_stacked.mp4
```

Replace `0x00FF00` with your background color in hex format.

## Copy-Paste Component

If you prefer not to add a dependency, copy the component directly:

```tsx
// StackedAlphaVideo.tsx - Copy this entire file
'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';

const vertexShader = \`
  attribute vec4 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = a_position;
    v_texCoord = a_texCoord;
  }
\`;

const fragmentShader = \`
  precision mediump float;
  uniform sampler2D u_frame;
  varying vec2 v_texCoord;
  void main() {
    vec2 colorCoord = vec2(v_texCoord.x, v_texCoord.y * 0.5);
    vec2 alphaCoord = vec2(v_texCoord.x, 0.5 + v_texCoord.y * 0.5);
    vec4 color = texture2D(u_frame, colorCoord);
    float alpha = texture2D(u_frame, alphaCoord).r;
    gl_FragColor = vec4(color.rgb, alpha);
  }
\`;

interface Props {
  src: string;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
}

export function StackedAlphaVideo({
  src,
  width,
  height,
  autoPlay = true,
  loop = true,
  muted = true,
  className,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
    if (!gl) return;
    glRef.current = gl;

    // Compile shaders
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vertexShader);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fragmentShader);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Geometry
    const positions = new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]);
    const texCoords = new Float32Array([0,1, 1,1, 0,0, 0,0, 1,1, 1,0]);

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

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;

    let raf: number;
    const render = () => {
      if (!video.paused && !video.ended) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      raf = requestAnimationFrame(render);
    };

    video.addEventListener('loadeddata', () => {
      canvas.width = width || video.videoWidth;
      canvas.height = height || video.videoHeight / 2;
      gl.viewport(0, 0, canvas.width, canvas.height);
      video.play().catch(() => {});
    });

    video.addEventListener('play', render);

    return () => cancelAnimationFrame(raf);
  }, [src, width, height]);

  return (
    <>
      <canvas ref={canvasRef} className={className} style={{ width, height }} />
      <video ref={videoRef} src={src} autoPlay={autoPlay} loop={loop} muted={muted} playsInline style={{ display: 'none' }} />
    </>
  );
}
```

## Troubleshooting

### Video not playing

1. **Check autoplay policy**: Most browsers block autoplay with sound. Ensure `muted={true}` is set.
2. **User interaction required**: On some browsers, the first play must come from a user gesture.
3. **Video format**: Ensure the video is properly encoded (H.264 recommended for broad compatibility).

```tsx
// Trigger play on user click if autoplay fails
<button onClick={() => videoRef.current?.play()}>
  Play Video
</button>
```

### Video appears stretched or wrong size

The canvas automatically sizes to half the video height (since the video is stacked). If you need specific dimensions:

```tsx
<StackedAlphaVideo
  src="/video.mp4"
  width={400}   // Explicit width
  height={400}  // Explicit height (output size, not source size)
  style={{ objectFit: 'contain' }}
/>
```

### Transparency not working

1. **Check video format**: Ensure your video uses the stacked alpha format (color on top, alpha mask on bottom).
2. **Background visibility**: The canvas renders with a transparent background - ensure your container doesn't have a solid background that hides the transparency.

### Canvas appears blank

1. **WebGL context**: Check browser console for WebGL errors.
2. **Video loaded**: Wait for `onCanPlay` callback before expecting rendering.
3. **Cross-origin issues**: Check for CORS errors in the console.

```tsx
<StackedAlphaVideo
  src={videoUrl}
  onCanPlay={() => console.log('Ready!')}
  onError={(e) => console.error('Error:', e)}
/>
```

### Performance issues

For best performance:
- Use hardware-accelerated video codecs (H.264)
- Keep video resolution reasonable (720p-1080p)
- Use `StackedAlphaProvider` to cache shaders across multiple videos
- Use `useVideoPreloader` for instant emote/video switching
- See [Performance Optimization](#performance-optimization) section for detailed guidance

## Related Links

- [npm package](https://www.npmjs.com/package/@hypervideo-dev/react)
- [Hypermedia Playground](https://hypermedia.hypersocial.com) - Create stacked alpha videos

## License

MIT
