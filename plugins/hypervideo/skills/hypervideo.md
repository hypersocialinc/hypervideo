---
description: This skill should be used when the user asks about "transparent video", "remove background from video", "Hypervideo", "stacked alpha", "@hypervideo-dev", or needs help with video background removal APIs or cross-platform transparent video playback.
---

# Hypervideo - Transparent Video Platform

**Generate and play transparent videos, everywhere.**

Hypervideo provides:
1. **Background Removal API** - Remove backgrounds from images and videos
2. **Cross-Platform Players** - Play transparent videos on any platform (Web, iOS, React Native)

## Quick Links
- API Docs: https://api.hypervideo.dev/docs
- Playground: https://app.hypervideo.dev
- GitHub: https://github.com/hypersocialinc/hypervideo

---

## When to Use CLI vs SDK

### Use CLI (`@hypervideo-dev/cli`) when:
- Converting local video/image files in the project
- Processing files in `public/`, `assets/`, or similar directories
- Build-time or development-time asset preparation
- Batch converting multiple files
- Any task where local processing is sufficient

**Example:** "convert the videos in public/ to stacked-alpha"
→ `hypervideo video remove-bg input.mp4 -f stacked-alpha -o output.mp4`

### Use SDK (`@hypervideo-dev/sdk`) when:
- Building application features that process user uploads
- Creating API endpoints for dynamic/runtime processing
- Integrating video processing into user-facing workflows

**Example:** "let users upload videos and remove backgrounds"
→ SDK in a server action, API route, or Convex action

---

## SDKs & Tools

### @hypervideo-dev/sdk
TypeScript SDK for the Hypervideo API.

```bash
npm install @hypervideo-dev/sdk
```

```typescript
import { Hypervideo } from '@hypervideo-dev/sdk';

const client = new Hypervideo({ apiKey: 'hc_...' });

// Remove background from image
const image = await client.image.removeBackground({
  file: imageFile,
  tolerance: 20,
});

// Remove background from video (webp = smallest, stacked-alpha = fastest playback)
const video = await client.video.removeBackground({
  file: videoFile,
  format: 'webp',      // or 'stacked-alpha', 'webm'
  quality: 60,         // for webp (lower = smaller)
});
```

---

### @hypervideo-dev/cli
Command-line tool for video processing.

```bash
npm install -g @hypervideo-dev/cli

# Remove background from video
hypervideo video remove-bg input.mp4 -o output.webm

# Remove background from image
hypervideo image remove-bg input.png -o output.png

# Set API key
hypervideo config set apiKey hc_your_key
```

---

## Players

Cross-platform transparent video players for React, Expo, and native iOS/macOS.

### @hypervideo-dev/react
WebGL player for React/Next.js apps.

```bash
npm install @hypervideo-dev/react
```

```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

<StackedAlphaVideo
  src="/mascot-stacked.mp4"
  width={384}
  height={384}
  autoPlay
  loop
  muted
/>
```

**How it works:** The stacked-alpha format stores RGB in the top half and alpha mask in the bottom half. A WebGL shader composites them in real-time.

---

### @hypervideo-dev/expo
Native Metal player for Expo/React Native (iOS only).

```bash
npm install @hypervideo-dev/expo
```

```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/expo';

<StackedAlphaVideo
  source={{ uri: 'https://example.com/mascot-stacked.mp4' }}
  width={384}
  height={384}
  autoPlay
  loop
/>
```

**Note:** Requires development build (not compatible with Expo Go). iOS only.

---

### Swift Package (iOS/macOS)
Native Swift Package with Metal rendering.

```swift
// Xcode: File → Add Package Dependencies
// URL: https://github.com/hypersocialinc/hypervideo.git

import HypervideoVideo

StackedAlphaVideo(
    url: "https://example.com/mascot-stacked.mp4",
    loop: true
)
```

---

## API Endpoints

Base URL: `https://api.hypervideo.dev`

Authentication: `Authorization: Bearer YOUR_API_KEY`

### POST /api/v1/image/remove-background
Remove background from image. Returns PNG with transparency.

Parameters:
- `file` or `url`: Image input
- `tolerance` (0-100): Background removal sensitivity (default: 20)
- `chromaKey`: Manual color `{ r, g, b }` for green/blue screen

### POST /api/v1/video/remove-background
Remove background from video with smart processing.

**Smart Processing:**
- `webp` format → Uses AI (smallest files, ~1.5MB)
- Other formats → Uses chromakey (fastest, ~10s)
- Manual `chromaKey` → Forces chromakey (for green/blue screen)

Parameters:
- `file` or `url`: Video input
- `format`: Single output format (`webp`, `webm`, `stacked-alpha`, `mov`)
- `formats`: Array of output formats
- `tolerance` (0-100): Background removal sensitivity (chromakey)
- `quality` (0-100): WebP quality (default: 60, lower = smaller)
- `chromaKey`: Manual color `{ r, g, b }` for green/blue screen

### POST /api/v1/image/detect-background-color
Detect the dominant background color from image edges.

---

## Output Formats

| Format | Size | Speed | Use Case |
|--------|------|-------|----------|
| **webp** | ~1.5MB | ~60s | Smallest files, all browsers, `<img>` tag |
| **webm** | ~2MB | ~10s | Chrome, Firefox, Edge |
| **stacked-alpha** | ~8MB | ~10s | Universal with Hypervideo WebGL players |
| **mov** | ~60MB | ~10s | Safari/iOS native, Final Cut Pro |

**Recommendations:**
- Use `webp` for smallest file size (uses AI processing)
- Use `stacked-alpha` with `@hypervideo-dev/react` or `@hypervideo-dev/expo` for smooth 60fps playback

---

## Common Patterns

### Next.js App with Transparent Video
```tsx
// app/page.tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

export default function Home() {
  return (
    <div className="relative">
      <StackedAlphaVideo
        src="/mascot-stacked.mp4"
        width={400}
        height={400}
        autoPlay
        loop
        muted
        className="absolute bottom-0 right-0"
      />
    </div>
  );
}
```

### Process Video Server-Side
```typescript
// app/api/process/route.ts
import { Hypervideo } from '@hypervideo-dev/sdk';

if (!process.env.HYPERVIDEO_API_KEY) {
  throw new Error('HYPERVIDEO_API_KEY environment variable is required');
}

const client = new Hypervideo({ apiKey: process.env.HYPERVIDEO_API_KEY });

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('video') as File;

    if (!file) {
      return Response.json({ error: 'No video file provided' }, { status: 400 });
    }

    const result = await client.video.removeBackground({
      file,
      formats: ['stacked-alpha'],
    });

    return Response.json(result);
  } catch (error) {
    console.error('Video processing error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Processing failed' },
      { status: 500 }
    );
  }
}
```

---

## Safari Performance Optimization

Safari has known performance issues with WebGL video textures. The `@hypervideo-dev/react` player includes several optimizations:

### Built-in Optimizations
- **requestVideoFrameCallback**: Only renders when a new video frame is available (24fps video = 24 renders/sec instead of 60)
- **IntersectionObserver**: Automatically pauses video and stops rendering when scrolled off-screen
- **WebGL2 with fallback**: Uses WebGL2 when available for better performance

### Video Size Recommendations

For optimal Safari performance, use appropriately sized videos:

| Display Size | Recommended Video | Expected CPU |
|--------------|-------------------|--------------|
| < 200px | 192x384 stacked | ~20-30% |
| 200-400px | 384x768 stacked | ~40-50% |
| 400-600px | 576x1152 stacked | ~50-60% |
| > 600px | 768x1536 stacked | ~60-70% |

### Creating Optimized Videos

Use ffmpeg to resize stacked-alpha videos:

```bash
# Resize to 384x768 (for 384x384 display)
ffmpeg -i input-stacked.mp4 -vf "scale=384:768" -c:v libx264 -preset slow -crf 18 output-384.mp4

# Resize to 192x384 (for small thumbnails)
ffmpeg -i input-stacked.mp4 -vf "scale=192:384" -c:v libx264 -preset slow -crf 18 output-192.mp4
```

### Best Practices

1. **Size videos for display**: Don't use 768px video for a 200px display
2. **Multiple sizes**: Create 2-3 size variants for responsive designs
3. **Scroll behavior**: The player automatically pauses off-screen videos - no action needed
4. **Preloading**: Use `useVideoPreloader` hook for instant playback without network delay
