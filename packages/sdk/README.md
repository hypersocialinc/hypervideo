# @hypervideo-dev/sdk

Official TypeScript SDK for the [Hypervideo API](https://api.hypervideo.dev/docs) - media transformation made simple.

## Features

- **Image transformations**: Resize, thumbnail, background removal, emoticon generation
- **Video transformations**: Background removal with multi-format output
- **Isomorphic**: Works in Node.js and browser environments
- **Type-safe**: Full TypeScript support with comprehensive types
- **Zero dependencies**: Uses native `fetch`, `FormData`, and `Blob`

## Installation

```bash
npm install @hypervideo-dev/sdk
# or
pnpm add @hypervideo-dev/sdk
# or
yarn add @hypervideo-dev/sdk
```

## Quick Start

```typescript
import { Hypervideo } from '@hypervideo-dev/sdk';

const client = new Hypervideo({
  apiKey: 'your-api-key',
});

// Remove background from an image
const result = await client.image.removeBackground({
  file: imageFile,
  tolerance: 20,
});

// Convert result to displayable blob
const blob = Hypervideo.dataUrlToBlob(result.url);
const objectUrl = URL.createObjectURL(blob);
```

## API Reference

### Client Configuration

```typescript
const client = new Hypervideo({
  apiKey: 'your-api-key',           // Required
  baseUrl: 'https://custom.api',    // Optional, defaults to production
  timeout: 60000,                    // Optional, defaults to 30000ms
});
```

### Image Operations

#### Resize

```typescript
const result = await client.image.resize({
  file: imageFile,        // File, Blob, Buffer, or ArrayBuffer
  // OR
  url: 'https://...',     // URL to fetch
  width: 800,
  height: 600,
  fit: 'cover',           // 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
  quality: 85,            // 1-100
  format: 'webp',         // 'jpeg' | 'png' | 'webp'
});
```

#### Thumbnail

```typescript
const result = await client.image.thumbnail({
  file: imageFile,
  size: 'medium',         // 'small' (150px) | 'medium' (300px) | 'large' (600px)
  // OR custom dimensions:
  width: 400,
  height: 400,
  quality: 60,
});
```

#### Emoticon Pack

Generate multi-size PNG + WebP variants:

```typescript
// Get JSON with all sizes
const result = await client.image.emoticon({
  file: squareImage,
  sizes: [32, 64, 128],   // Optional, defaults to [16,24,32,48,64,96,128,256]
});

// Download as ZIP
const zipBlob = await client.image.emoticonZip({
  file: squareImage,
});
```

#### Remove Background

```typescript
// Auto-detect background color from edges
const result = await client.image.removeBackground({
  file: imageFile,
  tolerance: 20,          // 0-100, higher = more aggressive
  smoothEdges: true,
});

// Manual chromakey (green screen)
const result = await client.image.removeBackground({
  file: greenScreenImage,
  chromaKey: { r: 0, g: 255, b: 0 },
});
```

#### Detect Background Color

```typescript
const result = await client.image.detectBackgroundColor({
  file: imageFile,
});
console.log(result.hex);  // "#E92FBC"
```

### Video Operations

#### Remove Background

```typescript
// Single format
const result = await client.video.removeBackground({
  file: videoFile,
  format: 'webm',
  tolerance: 20,
  fps: 24,
});

// Multiple formats (recommended)
const result = await client.video.removeBackground({
  file: videoFile,
  formats: ['webm', 'stacked-alpha', 'webp'],
});

// Access all outputs
for (const output of result.outputs) {
  console.log(output.format, output.size);
}
```

**Output Formats:**
- `webm`: VP9 codec, ~1.5MB for 6s video, Chrome/Firefox/Edge (default)
- `stacked-alpha`: H.264 stacked RGB+Alpha, ~1MB for 6s video, requires WebGL player (default)
- `webp`: Animated WebP, ~3-8MB for 6s video, Safari compatible
- `mov`: ProRes 4444, ~60MB for 6s video, universal support

**Default formats:** `['webm', 'stacked-alpha']`

### Stacked Alpha Playback

The `stacked-alpha` format requires a WebGL player for transparency rendering:

```bash
npm install @hypervideo-dev/react
```

```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

<StackedAlphaVideo
  src={stackedAlphaUrl}
  width={384}
  height={384}
  autoPlay
  loop
  muted
/>
```

### Utility Functions

```typescript
// Convert data URL to Blob
const blob = Hypervideo.dataUrlToBlob(result.url);

// Convert Blob to data URL
const dataUrl = await Hypervideo.toDataUrl(blob);

// Extract base64 string
const base64 = Hypervideo.extractBase64(dataUrl);

// Extract MIME type
const mime = Hypervideo.extractMimeType(dataUrl);
```

## Error Handling

```typescript
import { Hypervideo, HypervideoError } from '@hypervideo-dev/sdk';

try {
  const result = await client.image.removeBackground({ file });
} catch (error) {
  if (error instanceof HypervideoError) {
    console.error(`Error ${error.code}: ${error.message}`);

    if (error.isAuthError()) {
      // Handle authentication errors
    }

    if (error.isTimeoutError()) {
      // Handle timeout
    }
  }
}
```

## Node.js Example

```typescript
import { Hypervideo } from '@hypervideo-dev/sdk';
import { readFile, writeFile } from 'fs/promises';

const client = new Hypervideo({
  apiKey: process.env.HYPERVIDEO_API_KEY!,
});

async function processImage() {
  // Read input file
  const buffer = await readFile('./input.png');

  // Process
  const result = await client.image.resize({
    file: buffer,
    width: 1920,
    height: 1080,
    format: 'webp',
  });

  // Save output
  const blob = Hypervideo.dataUrlToBlob(result.url);
  const outputBuffer = Buffer.from(await blob.arrayBuffer());
  await writeFile('./output.webp', outputBuffer);
}
```

## Browser Example (React)

```tsx
import { Hypervideo, HypervideoError } from '@hypervideo-dev/sdk';
import { useState } from 'react';

const client = new Hypervideo({
  apiKey: process.env.NEXT_PUBLIC_HYPERVIDEO_KEY!,
});

function ImageProcessor() {
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleUpload(file: File) {
    setLoading(true);
    try {
      const result = await client.image.removeBackground({ file });
      const blob = Hypervideo.dataUrlToBlob(result.url);
      const objectUrl = URL.createObjectURL(blob);
      setResult(objectUrl);
    } catch (error) {
      if (error instanceof HypervideoError) {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
      />
      {loading && <p>Processing...</p>}
      {result && <img src={result} alt="Result" />}
    </div>
  );
}
```

## API Documentation

Interactive API documentation with "Try it out" functionality is available at:
- **Production**: https://api.hypervideo.dev/docs
- **OpenAPI Spec**: https://api.hypervideo.dev/docs.json

## License

MIT
