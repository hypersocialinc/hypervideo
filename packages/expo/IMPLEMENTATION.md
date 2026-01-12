# @hypervideo/expo-native Implementation Guide

## Overview

This package provides a **native iOS Metal-based stacked-alpha video player** that replaces the Skia-based implementation when you need to avoid GC-related crashes.

## Problem Solved

The existing `@hypervideo/expo` uses Skia for cross-platform video rendering. Under heavy usage (continuous voice sessions, frequent video playback), we encountered `EXC_BREAKPOINT` crashes:

```
Thread 8 (Hermes GC):
#0 JsiSkImage::~JsiSkImage() - destructor called on GC thread instead of main/GPU thread
```

**Root Cause**: Skia's `JsiSkImage` destructor must run on the main thread for GPU resource cleanup, but Hermes GC can trigger it on its own thread.

**Solution**: Pure native Metal implementation that bypasses JSI entirely.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Native                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │         StackedAlphaVideo.tsx                    │    │
│  │  - Props: source, width, height, loop, paused   │    │
│  │  - Converts source to { uri, isLocalAsset }     │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │      StackedAlphaVideoModule.swift               │    │
│  │  - Expo Module definition                        │    │
│  │  - Registers native view                         │    │
│  └─────────────────────────────────────────────────┘    │
│                          │                               │
│                          ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │       StackedAlphaVideoView.swift                │    │
│  │  - AVPlayer for video playback                  │    │
│  │  - CVPixelBuffer extraction from video frames   │    │
│  │  - Metal texture creation from pixel buffer     │    │
│  │  - Inline Metal shader for alpha compositing    │    │
│  │  - Renders via MTKView                          │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

## Key Files

### 1. `src/StackedAlphaVideo.tsx`
React Native wrapper component that:
- Accepts `source` as `{ uri: string }` or `number` (require())
- Passes props to native view via Expo Modules
- Handles `onLoad` and `onError` callbacks

### 2. `ios/StackedAlphaVideoModule.swift`
Expo Module definition:
```swift
public class StackedAlphaVideoModule: Module {
  public func definition() -> ModuleDefinition {
    Name("StackedAlphaVideo")
    View(StackedAlphaVideoView.self) { /* props */ }
  }
}
```

### 3. `ios/StackedAlphaVideoView.swift`
The core native implementation:

**Key components:**
- `AVPlayer` with notification-based looping for video playback
- `AVPlayerItemVideoOutput` to extract `CVPixelBuffer` frames
- `CADisplayLink` for frame-synced rendering
- `MTKView` for Metal rendering
- **Inline Metal shader** for alpha compositing (compiled at runtime)

**Metal shader (embedded in Swift):**
```metal
// Sample RGB from top half of video (y: 0 to 0.5)
float2 rgbCoord = float2(in.texCoord.x, in.texCoord.y * 0.5);
float4 rgb = videoTexture.sample(textureSampler, rgbCoord);

// Sample alpha from bottom half of video (y: 0.5 to 1.0)
float2 alphaCoord = float2(in.texCoord.x, 0.5 + in.texCoord.y * 0.5);
float alpha = videoTexture.sample(textureSampler, alphaCoord).r;

// Premultiplied alpha output (rgb * alpha allows proper blending)
return float4(rgb.rgb * alpha, alpha);
```

**Critical implementation details:**
- Shader is compiled from inline string via `device.makeLibrary(source:)` - this avoids issues with Metal library bundling in dynamic frameworks; pre-compiled .metallib files require specific build configuration that may conflict with Expo's CocoaPods integration
- Handles remote URLs with proper `AVURLAsset` options
- Waits for `readyToPlay` status before starting playback (with 30s timeout for stuck states)
- Validates video has actual video tracks before firing onLoad
- Proper KVO observer cleanup on main thread to prevent crashes
- Cleans up Metal resources properly on view removal via `didMoveToSuperview`
- Tracks and reports consecutive texture creation failures

## Video Format

Expected input: **Stacked-alpha MP4**
```
┌─────────────────┐
│                 │  ← Top half: RGB color frames
│   Color (RGB)   │
│                 │
├─────────────────┤
│                 │  ← Bottom half: Grayscale alpha mask
│   Alpha (Gray)  │
│                 │
└─────────────────┘
```

The shader samples both halves and composites them for transparent video playback.

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string` | - | Video URL (string) - compatible with @hypervideo/expo |
| `source` | `{ uri: string } \| number` | - | Video URL or local require() |
| `style` | `ViewStyle` | - | Container style (controls sizing) |
| `width` | `number` | - | Optional dimension hint (debugging only) |
| `height` | `number` | - | Optional dimension hint (debugging only) |
| `loop` | `boolean` | `true` | Loop video playback |
| `autoPlay` | `boolean` | `true` | Auto-play when loaded |
| `paused` | `boolean` | `false` | Pause/resume playback |
| `muted` | `boolean` | `true` | Mute audio |
| `onLoad` | `() => void` | - | Called when video is ready |
| `onEnd` | `() => void` | - | Called when video ends (if loop=false) |
| `onError` | `(error: string) => void` | - | Called on error |

> **Note**: Either `src` or `source` must be provided. If both are provided, `src` takes precedence.

## Review Checklist

### TypeScript/React
- [ ] `StackedAlphaVideo.tsx` exports match `index.ts`
- [ ] Props interface is complete and documented
- [ ] No runtime dependencies beyond peer deps

### Native iOS
- [ ] `expo-module.config.json` has correct module name
- [ ] `StackedAlphaVideo.podspec` references correct files
- [ ] All Swift files compile without warnings
- [ ] Metal shader compiles and renders correctly
- [ ] Memory cleanup on view removal (no leaks)
- [ ] Handles both local and remote video URLs

### Package Config
- [ ] `package.json` has correct peer dependencies
- [ ] Exports are configured for CJS/ESM
- [ ] Files array includes all necessary files

## Testing

```tsx
import { StackedAlphaVideo } from '@hypervideo/expo-native';

// Remote URL
<StackedAlphaVideo
  source={{ uri: 'https://example.com/stacked-alpha.mp4' }}
  width={300}
  height={300}
  loop={true}
  onLoad={() => console.log('Ready')}
  onError={(e) => console.error(e)}
/>

// Local asset
<StackedAlphaVideo
  source={require('./assets/animation.mp4')}
  width={200}
  height={200}
/>
```

## Known Limitations

1. **iOS only** - No Android implementation yet
2. **No seek support** - Playback is forward-only with looping
3. **No audio** - Designed for silent animated overlays
4. **Requires rebuild** - Native module needs `npx expo run:ios`

## Migration from @hypervideo/expo

```diff
- import { StackedAlphaVideo } from '@hypervideo/expo';
+ import { StackedAlphaVideo } from '@hypervideo/expo-native';

// Props are identical, no other changes needed
```

## Future Improvements

- [ ] Android implementation (ExoPlayer + OpenGL)
- [ ] Seek/scrub support
- [ ] Playback speed control
- [ ] Audio track support
- [ ] Preloading/caching
