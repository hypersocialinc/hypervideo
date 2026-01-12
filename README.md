# Hypervideo

Generate and play transparent videos, everywhere.

[![npm version](https://img.shields.io/npm/v/@hypervideo-dev/sdk.svg)](https://www.npmjs.com/package/@hypervideo-dev/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [`@hypervideo-dev/sdk`](./packages/sdk) | TypeScript SDK for the Hypervideo API | [![npm](https://img.shields.io/npm/v/@hypervideo-dev/sdk.svg)](https://www.npmjs.com/package/@hypervideo-dev/sdk) |
| [`@hypervideo-dev/react`](./packages/react) | React components including WebGL transparent video player | [![npm](https://img.shields.io/npm/v/@hypervideo-dev/react.svg)](https://www.npmjs.com/package/@hypervideo-dev/react) |
| [`@hypervideo-dev/cli`](./packages/cli) | Command-line interface for video processing | [![npm](https://img.shields.io/npm/v/@hypervideo-dev/cli.svg)](https://www.npmjs.com/package/@hypervideo-dev/cli) |
| [`@hypervideo-dev/expo`](./packages/expo) | Expo/React Native components with Skia | [![npm](https://img.shields.io/npm/v/@hypervideo-dev/expo.svg)](https://www.npmjs.com/package/@hypervideo-dev/expo) |

## Quick Start

### Install

```bash
npm install @hypervideo-dev/sdk @hypervideo-dev/react
```

### Use the SDK

```typescript
import { Hypervideo } from '@hypervideo-dev/sdk';

const client = new Hypervideo({ apiKey: 'your-api-key' });

// Remove background from video
const result = await client.video.removeBackground({
  file: videoFile,
  format: 'webm'
});
```

### Play Transparent Video (React)

```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

function App() {
  return (
    <StackedAlphaVideo
      src="/mascot-stacked.mp4"
      width={384}
      height={384}
      autoPlay
      loop
      muted
    />
  );
}
```

## Documentation

Visit [hypervideo.dev/docs](https://hypervideo.dev/docs) for full documentation.

## License

MIT
