# @hypervideo/expo-native Example

This is a minimal Expo app for testing the native iOS Metal-based stacked-alpha video player.

## Setup

```bash
# Install dependencies (use npm, not pnpm, to avoid monorepo resolution issues)
npm install

# Run on iOS simulator (requires Xcode)
npx expo run:ios
```

> **Note**: This example app uses `npm` instead of `pnpm` to avoid dependency resolution issues with the monorepo's hoisted packages. The native iOS build requires expo-modules-core 3.x which is installed locally.

## What it tests

- Remote video URL loading
- Transparent video rendering with Metal shader
- Play/pause controls
- onLoad/onError callbacks

## Notes

- **iOS only** - This native module only supports iOS
- Requires `npx expo run:ios` (not `expo start`) because it includes native code
- The video should display with a transparent background over the dark container
