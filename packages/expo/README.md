# @hypervideo/expo-native

Native iOS Metal-based stacked-alpha video player for Expo/React Native.

## Requirements

- **Expo SDK**: 54.0.0+
- **React Native**: 0.76.0+
- **expo-modules-core**: 3.0.0+
- **iOS**: 15.0+
- **Development Build**: Required (not compatible with Expo Go)

## Why Native?

The standard `@hypervideo/expo` package uses Skia for cross-platform video rendering. However, under heavy usage (e.g., continuous voice sessions with frequent video playback), you may encounter `EXC_BREAKPOINT` crashes caused by `JsiSkImage` destructors running on the Hermes GC thread instead of the main/GPU thread.

This native package bypasses JSI entirely by using a pure Metal implementation, eliminating these GC-related crashes.

## Platform Support

- **iOS**: Full support with Metal GPU acceleration
- **Android**: Not yet supported (PRs welcome!)

## Installation

```bash
npm install @hypervideo/expo-native
# or
yarn add @hypervideo/expo-native
# or
pnpm add @hypervideo/expo-native
```

After installing, rebuild your iOS app:

```bash
npx expo run:ios
```

> **Note**: This package requires a development build. It will not work with Expo Go since it contains native iOS code.

## Usage

```tsx
import { StackedAlphaVideo } from '@hypervideo/expo-native';

function MyComponent() {
  return (
    <StackedAlphaVideo
      src="https://example.com/stacked-alpha-video.mp4"
      style={{ width: 300, height: 300 }}
      autoPlay
      loop
      muted
      onLoad={() => console.log('Video ready')}
      onEnd={() => console.log('Video ended')}
      onError={(error) => console.error('Video error:', error)}
    />
  );
}

// Alternative: Using source prop (object or require)
<StackedAlphaVideo
  source={{ uri: 'https://example.com/video.mp4' }}
  // or: source={require('./video.mp4')}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Video source URL (string) - compatible with `@hypervideo/expo` |
| `source` | `{ uri: string } \| number` | - | Video source URL or local asset via `require()` |
| `style` | `ViewStyle` | - | Style for the video container (controls sizing) |
| `width` | `number` | - | Optional dimension hint (debugging only) |
| `height` | `number` | - | Optional dimension hint (debugging only) |
| `loop` | `boolean` | `true` | Whether to loop the video |
| `autoPlay` | `boolean` | `true` | Whether to auto-play when loaded |
| `paused` | `boolean` | `false` | Whether playback is paused |
| `muted` | `boolean` | `true` | Whether audio is muted |
| `onLoad` | `() => void` | - | Called when video is ready |
| `onEnd` | `() => void` | - | Called when video ends (if loop=false) |
| `onError` | `(error: string) => void` | - | Called on error |

> **Note**: Either `src` or `source` must be provided. If both are provided, `src` takes precedence.

## Video Format

This component expects **stacked-alpha** format videos:

- Top half: RGB color frames
- Bottom half: Grayscale alpha/mask

The Metal shader samples both halves and composites them in real-time for transparent video playback.

## When to Use This vs @hypervideo/expo

| Use Case | Recommended Package |
|----------|---------------------|
| Cross-platform (iOS + Android) | `@hypervideo/expo` |
| Heavy iOS usage with Skia crashes | `@hypervideo/expo-native` |
| Maximum iOS performance | `@hypervideo/expo-native` |
| Android-only project | `@hypervideo/expo` |

## Example App

An example app is included in the `example/` directory for local testing:

```bash
cd packages/expo-native/example

# Install dependencies (use npm, not pnpm, to avoid monorepo hoisting issues)
npm install

# Run on iOS simulator
npx expo run:ios
```

## License

MIT
