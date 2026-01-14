# HypervideoVideo

Native iOS/Swift package for playing stacked-alpha transparent videos with Metal GPU rendering.

## What is Stacked Alpha?

Stacked alpha is a video format that stores transparency information:
- **Top half**: RGB color frames
- **Bottom half**: Grayscale alpha mask

This package uses Metal shaders to composite both halves in real-time, providing smooth transparent video playback without requiring platform-specific alpha video codecs.

## Requirements

- iOS 14.0+
- Xcode 15.0+
- Swift 5.9+

## Installation

### Swift Package Manager

Add the package to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/hypersocialinc/hypervideo.git", from: "0.1.0")
]
```

Or in Xcode: **File > Add Package Dependencies** and enter the repository URL.

## Usage

### SwiftUI

```swift
import HypervideoVideo

struct ContentView: View {
    var body: some View {
        StackedAlphaVideo(
            url: "https://example.com/mascot-stacked.mp4",
            loop: true,
            muted: true
        )
        .frame(width: 300, height: 300)
        .onVideoLoad {
            print("Video loaded!")
        }
        .onVideoError { error in
            print("Error: \(error)")
        }
    }
}
```

### UIKit

```swift
import HypervideoVideo

class ViewController: UIViewController {
    private var videoView: StackedAlphaVideoView!

    override func viewDidLoad() {
        super.viewDidLoad()

        videoView = StackedAlphaVideoView(frame: CGRect(x: 0, y: 0, width: 300, height: 300))
        videoView.center = view.center

        videoView.onLoad = {
            print("Video loaded!")
        }

        videoView.onError = { error in
            print("Error: \(error)")
        }

        videoView.onEnd = {
            print("Video ended")
        }

        // Configure playback
        videoView.loop = true
        videoView.muted = true

        // Set the video source
        videoView.sourceUri = "https://example.com/mascot-stacked.mp4"

        view.addSubview(videoView)
    }
}
```

### Local Files

```swift
// From bundle
if let path = Bundle.main.path(forResource: "mascot-stacked", ofType: "mp4") {
    videoView.sourceUri = path
}

// From documents directory
let documentsURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
let videoURL = documentsURL.appendingPathComponent("mascot-stacked.mp4")
videoView.sourceUri = videoURL.path
```

## API Reference

### StackedAlphaVideo (SwiftUI)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `url` | `String` or `URL` | required | Video source URL |
| `loop` | `Bool` | `true` | Loop playback |
| `muted` | `Bool` | `true` | Mute audio |
| `paused` | `Bool` | `false` | Pause playback |

#### Modifiers

- `.onVideoLoad(_ handler: @escaping () -> Void)` - Called when video is ready
- `.onVideoEnd(_ handler: @escaping () -> Void)` - Called when playback ends (if not looping)
- `.onVideoError(_ handler: @escaping (String) -> Void)` - Called on error

### StackedAlphaVideoView (UIKit)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `sourceUri` | `String` | `""` | Video source URI |
| `loop` | `Bool` | `true` | Loop playback |
| `muted` | `Bool` | `true` | Mute audio |
| `paused` | `Bool` | `false` | Pause playback |
| `onLoad` | `(() -> Void)?` | `nil` | Load callback |
| `onEnd` | `(() -> Void)?` | `nil` | End callback |
| `onError` | `((String) -> Void)?` | `nil` | Error callback |

## How It Works

1. **Video Loading**: The video is loaded using `AVPlayer` with a pixel buffer output
2. **Frame Extraction**: Each frame is extracted as a `CVPixelBuffer`
3. **Texture Creation**: The pixel buffer is converted to an `MTLTexture` via `CVMetalTextureCache`
4. **Metal Rendering**: A custom Metal shader samples:
   - RGB from the top half (y: 0 to 0.5)
   - Alpha from the bottom half (y: 0.5 to 1.0)
5. **Compositing**: The shader outputs premultiplied alpha for proper transparency

## Creating Stacked Alpha Videos

Use the [Hypervideo API](https://hypervideo.dev) to convert videos with transparent backgrounds to stacked-alpha format:

```bash
curl -X POST https://api.hypervideo.dev/api/v1/video/to-stacked-alpha \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -F "file=@transparent-video.webm"
```

Or use our web playground at [app.hypervideo.dev](https://app.hypervideo.dev).

## Performance

- **GPU-accelerated**: All compositing happens on the GPU via Metal
- **Efficient memory**: Uses `CVMetalTextureCache` for zero-copy texture creation
- **Smooth playback**: Display link-driven rendering at 60fps
- **Frame caching**: Prevents flicker by caching the last rendered frame

## Related Packages

- [@hypervideo-dev/react](https://www.npmjs.com/package/@hypervideo-dev/react) - React/Next.js WebGL player
- [@hypervideo-dev/expo](https://www.npmjs.com/package/@hypervideo-dev/expo) - Expo/React Native Skia player
- [@hypervideo-dev/expo-native](https://www.npmjs.com/package/@hypervideo-dev/expo-native) - Expo native Metal player

## License

MIT License - see [LICENSE](LICENSE) for details.

## Links

- [Hypervideo](https://hypervideo.dev) - Media transformation platform
- [Documentation](https://hypervideo.dev/docs)
- [GitHub](https://github.com/hypersocialinc/hypervideo)
