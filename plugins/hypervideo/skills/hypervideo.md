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

// Remove background from video
const video = await client.video.removeBackground({
  file: videoFile,
  formats: ['webm', 'stacked-alpha'],
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
Remove background from video. Returns WebM or stacked-alpha MP4.

Parameters:
- `file` or `url`: Video input
- `tolerance` (0-100): Background removal sensitivity
- `formats`: Array of output formats (`webm`, `stacked-alpha`, `mov`)
- `chromaKey`: Manual color for green/blue screen

### POST /api/v1/image/detect-background-color
Detect the dominant background color from image edges.

---

## Output Formats

| Format | Codec | Use Case |
|--------|-------|----------|
| **webm** | VP9 with alpha | Chrome, Firefox, Edge |
| **stacked-alpha** | H.264 MP4 | Works everywhere with Hypervideo players |
| **mov** | ProRes 4444 | Safari/iOS native, Final Cut Pro |

**Recommendation:** Use `stacked-alpha` format with `@hypervideo-dev/react` or `@hypervideo-dev/expo` for maximum compatibility.

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
