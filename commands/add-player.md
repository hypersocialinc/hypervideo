---
description: Add Hypervideo transparent video player to your project
arguments:
  - name: platform
    description: Target platform (react, expo, swift)
    required: false
---

# Add Hypervideo Player

Add a cross-platform transparent video player to the project.

## Instructions

1. First, detect the project type by checking for:
   - `next.config.js` or `next.config.ts` → React/Next.js
   - `app.json` with "expo" → Expo/React Native
   - `Package.swift` or `*.xcodeproj` → Swift/iOS

2. Based on platform (or argument if provided):

### React/Next.js
```bash
npm install @hypervideo-dev/react
```

Create or update a component:
```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/react';

export function TransparentVideo({ src }: { src: string }) {
  return (
    <StackedAlphaVideo
      src={src}
      width={400}
      height={400}
      autoPlay
      loop
      muted
    />
  );
}
```

### Expo/React Native
```bash
npx expo install @hypervideo-dev/expo
```

**Important:** This requires a development build. Run:
```bash
npx expo prebuild
npx expo run:ios
```

Create component:
```tsx
import { StackedAlphaVideo } from '@hypervideo-dev/expo';

export function TransparentVideo({ source }: { source: string }) {
  return (
    <StackedAlphaVideo
      source={{ uri: source }}
      width={400}
      height={400}
      autoPlay
      loop
    />
  );
}
```

### Swift
Add to Xcode: File → Add Package Dependencies → `https://github.com/hypersocialinc/hypervideo.git`

```swift
import HypervideoVideo

struct TransparentVideoView: View {
    let url: String

    var body: some View {
        StackedAlphaVideo(url: url, loop: true)
            .frame(width: 400, height: 400)
    }
}
```

3. After installation, inform user:
   - Video files must be in "stacked-alpha" format (RGB on top, alpha on bottom)
   - Use Hypervideo API or CLI to convert videos: `hypervideo video remove-bg input.mp4 -f stacked-alpha`
