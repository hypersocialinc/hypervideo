# Safari Performance Optimization Plan

## Problem Statement

The Hypervideo stacked-alpha player has poor performance on Safari, with CPU usage reaching 74%+ even for moderate resolution videos. This is caused by:

1. **Excessive texture uploads**: Using `requestAnimationFrame` (60fps) while video is only 24fps
2. **Safari's slow `texSubImage2D`**: Known WebKit issue where video-to-texture uploads are slower than Chrome/Firefox
3. **Unnecessary renders**: Rendering every RAF tick even when video frame hasn't changed

## Research Findings

### Browser Support for `requestVideoFrameCallback`
- Safari 15.4+ (March 2022) supports it
- Chrome 83+, Firefox 96+, Edge 83+
- [MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [Can I Use](https://caniuse.com/mdn-api_htmlvideoelement_requestvideoframecallback)

### Three.js Implementation
Three.js solved this exact problem in their [VideoTexture.js](https://github.com/mrdoob/three.js/blob/master/src/textures/VideoTexture.js):
- Uses `requestVideoFrameCallback` when available
- Falls back to checking `video.readyState` on RAF
- Only sets `needsUpdate = true` when new frame available

### Safari-Specific WebGL Issues
- [WebKit Bug 231031](https://bugs.webkit.org/show_bug.cgi?id=231031): Video texture performance regression
- [WebKit Bug 135387](https://bugs.webkit.org/show_bug.cgi?id=135387): Video upload to texture too slow
- Safari's Metal-based WebGL implementation has different performance characteristics

## Solution: Optimize Render Loop

### Phase 1: Use `requestVideoFrameCallback` (Primary Fix)

**Current behavior**: Renders at 60fps regardless of video framerate
**New behavior**: Renders only when video has a new frame (e.g., 24fps)

**Impact**: 60% reduction in texture uploads for 24fps video (60 → 24 uploads/sec)

```typescript
// packages/react/src/StackedAlphaVideo.tsx

// NEW: Track video frame callback ID
const videoFrameCallbackRef = useRef<number | null>(null);
const hasVideoFrameCallbackRef = useRef(false);

// In useEffect/init:
if ('requestVideoFrameCallback' in video) {
  hasVideoFrameCallbackRef.current = true;

  const onVideoFrame = (now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
    renderFrame();
    videoFrameCallbackRef.current = video.requestVideoFrameCallback(onVideoFrame);
  };

  videoFrameCallbackRef.current = video.requestVideoFrameCallback(onVideoFrame);
} else {
  // Fallback to RAF for older browsers
  hasVideoFrameCallbackRef.current = false;
}

// Cleanup in useEffect return:
if (videoFrameCallbackRef.current !== null) {
  video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
}
```

### Phase 2: Optimize Fallback RAF Loop

For browsers without `requestVideoFrameCallback`, throttle to video framerate:

```typescript
// Track last rendered frame
const lastPresentedFrameRef = useRef<number>(-1);

const render = useCallback(() => {
  const video = videoRef.current;
  if (!video || video.paused || video.ended) return;

  // Only render if we have new frame data
  // Use currentTime as proxy for frame change
  const currentFrame = Math.floor(video.currentTime * 24); // Assume 24fps

  if (currentFrame !== lastPresentedFrameRef.current) {
    lastPresentedFrameRef.current = currentFrame;
    renderFrame();
  }

  rafRef.current = requestAnimationFrame(render);
}, [renderFrame]);
```

### Phase 3: Add Performance Monitoring (Optional)

Add debug mode to measure actual performance:

```typescript
interface PerformanceMetrics {
  framesRendered: number;
  textureUploads: number;
  avgFrameTime: number;
  droppedFrames: number;
}

// Track via requestVideoFrameCallback metadata
const onVideoFrame = (now: DOMHighResTimeStamp, metadata: VideoFrameCallbackMetadata) => {
  const droppedFrames = metadata.presentedFrames - lastPresentedFrames - 1;
  // ... log metrics
};
```

## Implementation Steps

### Step 1: Update StackedAlphaVideo.tsx
- [ ] Add `requestVideoFrameCallback` detection
- [ ] Implement RVFC-based render loop
- [ ] Keep RAF fallback for older browsers
- [ ] Add cleanup for RVFC on unmount
- [ ] Test on Safari, Chrome, Firefox

### Step 2: Update Types
- [ ] Add `VideoFrameCallbackMetadata` type definition
- [ ] Add props for debug/performance monitoring mode

### Step 3: Update Documentation
- [ ] Document Safari performance characteristics
- [ ] Add browser support table
- [ ] Document debug mode usage

### Step 4: Update Skill Documentation
- [ ] Add Safari performance guidance to skill
- [ ] Warn about large video resolutions
- [ ] Recommend video encoding settings

## Files to Modify

1. `packages/react/src/StackedAlphaVideo.tsx` - Main component
2. `packages/react/src/types.ts` - Add VideoFrameCallbackMetadata type
3. `packages/react/README.md` - Update documentation
4. `plugins/hypervideo/skills/hypervideo.md` - Add performance guidance

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Texture uploads/sec (24fps video) | 60 | 24 | **60% reduction** |
| CPU usage (Safari, 768x1536) | 74% | ~30% | **~60% reduction** |
| CPU usage (Safari, 384x768) | 62% | ~25% | **~60% reduction** |

## Testing Plan

1. **Safari macOS**: Primary target - measure CPU in Web Inspector
2. **Safari iOS**: Test on iPhone/iPad
3. **Chrome**: Verify no regression
4. **Firefox**: Verify no regression
5. **Edge**: Verify no regression
6. **Older Safari (< 15.4)**: Verify fallback works

## Rollback Plan

If issues arise, the fallback RAF loop ensures backward compatibility. The optimization is additive - browsers without `requestVideoFrameCallback` continue to work as before.

## References

- [MDN: requestVideoFrameCallback](https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback)
- [Three.js VideoTexture](https://github.com/mrdoob/three.js/blob/master/src/textures/VideoTexture.js)
- [WebKit Bug 231031](https://bugs.webkit.org/show_bug.cgi?id=231031)
- [Safari WebGL Performance Discussion](https://discourse.threejs.org/t/safari-webgl-issues-with-video-playback-and-requestanimationframe-performance/15452)
