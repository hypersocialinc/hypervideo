# @hypervideo-dev/expo - Claude Context

## Package Overview

Native iOS Metal-based stacked-alpha video player that bypasses JSI/Skia to avoid GC-related crashes. This is an Expo Module with native Swift/Metal code.

## Architecture

```
src/
├── index.ts              # Package exports
├── StackedAlphaVideo.tsx # React component wrapper
└── StackedAlphaVideoView.ts # Native view type definitions

ios/
├── StackedAlphaVideoModule.swift  # Expo Module definition
└── StackedAlphaVideoView.swift    # Metal-based video renderer (~550 lines)
```

## Key Technical Details

### Metal Shader (Inline)
The Metal shader is embedded as a string in `StackedAlphaVideoView.swift` (lines 551-588) and compiled at runtime via `device.makeLibrary(source:)`. This approach is more reliable in Expo module context than loading from a `.metal` file.

### Stacked Alpha Format
- **Top half**: RGB color frames (y: 0 to 0.5)
- **Bottom half**: Grayscale alpha mask (y: 0.5 to 1.0)
- Shader samples both and outputs premultiplied alpha

### Native View Props
Props flow from React → Expo Module → Swift view via the `Prop` macro:
- `sourceUri: String` - Video URL
- `isLocalAsset: Bool` - Whether source is a local require()
- `loop: Bool` - Loop playback
- `paused: Bool` - Pause/resume
- `width/height: Double` - Explicit dimensions

### Events
- `onLoad` - Fires when video is ready to play
- `onError` - Fires with error string on failure

## Development Setup

### Running the Example App

```bash
cd packages/expo-native/example

# IMPORTANT: Use npm, not pnpm (avoids monorepo hoisting issues)
npm install

# Run on iOS simulator
npx expo run:ios
```

### Metro Configuration
The example app has a custom `metro.config.js` that:
1. Watches the parent package for hot reloading
2. Resolves `@hypervideo-dev/expo` to local source via custom resolver

### Expo MCP Debugging
Enable Expo's MCP server for debugging:
```bash
cd packages/expo-native/example
EXPO_UNSTABLE_MCP_SERVER=1 npx expo start
```

## Common Issues & Solutions

### "Unimplemented component: ViewManagerAdapter_StackedAlphaVideo"
**Cause**: Native module not linked properly.
**Fix**: Rebuild iOS app with `npx expo run:ios`

### "Unable to resolve @hypervideo-dev/expo"
**Cause**: Metro can't resolve local `file:..` dependency.
**Fix**: Ensure `metro.config.js` exists with custom resolver (see example app)

### "Cannot find native module 'Expo___'"
**Cause**: App connecting to wrong Metro bundler (e.g., another app's bundler).
**Fix**: Kill all Metro processes and restart on correct port:
```bash
lsof -ti:8081 | xargs kill -9
npx expo start --clear
```

### expo-modules-core Version Mismatch
**Cause**: pnpm hoisting older expo-modules-core from monorepo root.
**Fix**:
- Package requires `expo-modules-core >=3.0.0`
- Example app uses npm (not pnpm) to avoid hoisting issues

### Video Error: "Server with hostname could not be found"
**Cause**: Video URL is not accessible from device/simulator.
**Fix**: Verify URL is reachable via `curl -I <url>`

## Testing Checklist

- [ ] Remote URL video loads and plays
- [ ] Local asset via `require()` works
- [ ] Pause/play toggle works
- [ ] Loop works correctly
- [ ] onLoad callback fires
- [ ] onError callback fires on bad URL
- [ ] No crashes on view unmount
- [ ] Transparent background renders correctly

## Package.json Notes

Key fields for Metro/React Native resolution:
```json
{
  "main": "./src/index.ts",
  "react-native": "./src/index.ts",
  "exports": {
    ".": {
      "react-native": "./src/index.ts",
      ...
    }
  }
}
```

## Files to Modify

When making changes:
- **TypeScript API**: `src/StackedAlphaVideo.tsx`
- **Native rendering**: `ios/StackedAlphaVideoView.swift`
- **Module definition**: `ios/StackedAlphaVideoModule.swift`
- **Package config**: `package.json`, `expo-module.config.json`
