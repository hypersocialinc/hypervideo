import SwiftUI

/// A SwiftUI view that renders stacked-alpha videos with proper transparency.
///
/// The video format expected is "stacked alpha":
/// - Top half of the video contains RGB color data
/// - Bottom half contains alpha/mask data (grayscale)
///
/// Example usage:
/// ```swift
/// StackedAlphaVideo(
///     url: "https://example.com/mascot-stacked.mp4",
///     loop: true,
///     muted: true
/// )
/// .frame(width: 300, height: 300)
/// .onVideoLoad { print("Video loaded!") }
/// .onVideoError { error in print("Error: \(error)") }
/// ```
@available(iOS 14.0, *)
public struct StackedAlphaVideo: UIViewRepresentable {
    private let url: String
    private let loop: Bool
    private let muted: Bool
    private let paused: Bool
    private var onLoad: (() -> Void)?
    private var onEnd: (() -> Void)?
    private var onError: ((String) -> Void)?

    /// Creates a stacked-alpha video view.
    /// - Parameters:
    ///   - url: The video URL (local file path or remote URL)
    ///   - loop: Whether to loop the video (default: true)
    ///   - muted: Whether the video is muted (default: true)
    ///   - paused: Whether playback is paused (default: false)
    public init(
        url: String,
        loop: Bool = true,
        muted: Bool = true,
        paused: Bool = false
    ) {
        self.url = url
        self.loop = loop
        self.muted = muted
        self.paused = paused
    }

    /// Creates a stacked-alpha video view from a URL.
    /// - Parameters:
    ///   - url: The video URL
    ///   - loop: Whether to loop the video (default: true)
    ///   - muted: Whether the video is muted (default: true)
    ///   - paused: Whether playback is paused (default: false)
    public init(
        url: URL,
        loop: Bool = true,
        muted: Bool = true,
        paused: Bool = false
    ) {
        self.url = url.absoluteString
        self.loop = loop
        self.muted = muted
        self.paused = paused
    }

    public func makeUIView(context: Context) -> StackedAlphaVideoView {
        let view = StackedAlphaVideoView(frame: .zero)
        view.loop = loop
        view.muted = muted
        view.paused = paused
        view.onLoad = onLoad
        view.onEnd = onEnd
        view.onError = onError
        view.sourceUri = url
        return view
    }

    public func updateUIView(_ uiView: StackedAlphaVideoView, context: Context) {
        uiView.loop = loop
        uiView.muted = muted
        uiView.paused = paused
        uiView.onLoad = onLoad
        uiView.onEnd = onEnd
        uiView.onError = onError

        // Only update source if changed
        if uiView.sourceUri != url {
            uiView.sourceUri = url
        }
    }

    // MARK: - Modifiers

    /// Sets a callback to be called when the video is ready to play.
    public func onVideoLoad(_ handler: @escaping () -> Void) -> StackedAlphaVideo {
        var copy = self
        copy.onLoad = handler
        return copy
    }

    /// Sets a callback to be called when the video playback ends (only if loop is false).
    public func onVideoEnd(_ handler: @escaping () -> Void) -> StackedAlphaVideo {
        var copy = self
        copy.onEnd = handler
        return copy
    }

    /// Sets a callback to be called when an error occurs.
    public func onVideoError(_ handler: @escaping (String) -> Void) -> StackedAlphaVideo {
        var copy = self
        copy.onError = handler
        return copy
    }
}

// MARK: - Preview

@available(iOS 14.0, *)
struct StackedAlphaVideo_Previews: PreviewProvider {
    static var previews: some View {
        StackedAlphaVideo(
            url: "https://hip-gazelle-728.convex.cloud/api/storage/d50b1663-f1c9-4c3c-ae75-6037dedc172b"
        )
        .frame(width: 300, height: 300)
        .background(Color.gray)
    }
}
