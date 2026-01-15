---
description: Add Hypervideo transparent video player to your project
arguments:
  - name: platform
    description: Target platform (react, expo, swift)
    required: false
---

# Add Hypervideo Player

Add a cross-platform transparent video player to the project.

## Pre-flight Checks (REQUIRED - DO THIS FIRST)

Before taking ANY action:

1. **Detect project type** by checking for:
   - `next.config.js` or `next.config.ts` → React/Next.js
   - `app.json` with "expo" → Expo/React Native
   - `Package.swift` or `*.xcodeproj` → Swift/iOS

2. **Check package.json** for existing player packages:
   - `@hypervideo-dev/react` - React/Next.js player
   - `@hypervideo-dev/expo` - Expo/React Native player

3. **Search for existing player components** that import from `@hypervideo-dev/react` or `@hypervideo-dev/expo`

4. **Report findings to user:**
   - "Detected project type: [React/Next.js | Expo | Swift]"
   - "Player package: [already installed | needs installation]"
   - "Existing player component: [found at X | not found]"

5. **Confirm with user** before installing if package is not present

## Instructions

Only perform steps that are actually needed based on pre-flight checks.

### React/Next.js

Check if `@hypervideo-dev/react` exists in package.json. If NOT:
```bash
npm install @hypervideo-dev/react
```

If already installed, skip installation.

Search for existing player components. If NOT found, create one:
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

If a player component already exists, inform user of its location.

### Expo/React Native

Check if `@hypervideo-dev/expo` exists in package.json. If NOT:
```bash
npx expo install @hypervideo-dev/expo
```

If already installed, skip installation.

**Important:** This requires a development build. Check if user has run prebuild:
```bash
npx expo prebuild
npx expo run:ios
```

Search for existing player components. If NOT found, create one:
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

If a player component already exists, inform user of its location.

### Swift

For Swift projects, guide the user to add via Xcode:
- File → Add Package Dependencies → `https://github.com/hypersocialinc/hypervideo.git`

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

## Summary

After completing setup, inform user:
- What was already installed (skipped)
- What was newly installed
- Video files must be in "stacked-alpha" format (RGB on top, alpha on bottom)
- Use Hypervideo API or CLI to convert videos: `hypervideo video remove-bg input.mp4 -f stacked-alpha`
