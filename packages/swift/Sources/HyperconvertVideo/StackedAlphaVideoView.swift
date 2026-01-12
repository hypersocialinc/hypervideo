import UIKit
import AVFoundation
import MetalKit
import CoreVideo

/// A native iOS view that renders stacked-alpha videos with proper transparency using Metal.
///
/// The video format expected is "stacked alpha":
/// - Top half of the video contains RGB color data
/// - Bottom half contains alpha/mask data (grayscale)
///
/// The Metal shader samples both halves and composites them in real-time.
///
/// Example usage:
/// ```swift
/// let videoView = StackedAlphaVideoView(frame: .zero)
/// videoView.onLoad = { print("Video loaded!") }
/// videoView.onError = { error in print("Error: \(error)") }
/// videoView.sourceUri = "https://example.com/video.mp4"
/// ```
public class StackedAlphaVideoView: UIView, MTKViewDelegate {
    // MARK: - Properties

    private var metalView: MTKView!
    private var device: MTLDevice!
    private var commandQueue: MTLCommandQueue!
    private var pipelineState: MTLRenderPipelineState!
    private var vertexBuffer: MTLBuffer!
    private var textureCache: CVMetalTextureCache!

    private var player: AVPlayer?
    private var playerItem: AVPlayerItem?
    private var videoOutput: AVPlayerItemVideoOutput?
    private var displayLink: CADisplayLink?
    private var displayLinkProxy: DisplayLinkProxy?  // Weak proxy to prevent retain cycle

    private var _sourceUri: String = ""
    private var shouldLoop: Bool = true
    private var isPaused: Bool = false
    private var isMuted: Bool = true
    private var isSetup: Bool = false
    private var loopObserver: NSObjectProtocol?
    private var lastTexture: MTLTexture?  // Cache last frame to prevent flicker
    private var isStatusObserverAdded: Bool = false  // Track KVO observer state
    private var statusTimeoutTimer: Timer?  // Timeout for unknown status
    private var consecutiveTextureFailures: Int = 0  // Track texture creation failures

    // MARK: - Display Link Proxy (prevents retain cycle)

    /// Weak proxy to break the retain cycle between CADisplayLink and self
    private class DisplayLinkProxy {
        weak var target: StackedAlphaVideoView?
        init(target: StackedAlphaVideoView) { self.target = target }
        @objc func tick() { target?.displayLinkCallback() }
    }

    // MARK: - Event Callbacks

    /// Called when the video is ready to play
    public var onLoad: (() -> Void)?

    /// Called when the video playback ends (only fires if loop is false)
    public var onEnd: (() -> Void)?

    /// Called when an error occurs
    public var onError: ((String) -> Void)?

    // MARK: - Public Properties

    /// The video source URI (local file path or remote URL)
    public var sourceUri: String {
        get { _sourceUri }
        set {
            guard newValue != _sourceUri else { return }
            _sourceUri = newValue
            if !newValue.isEmpty {
                setupVideo()
            }
        }
    }

    /// Whether to loop the video
    public var loop: Bool {
        get { shouldLoop }
        set { shouldLoop = newValue }
    }

    /// Whether video playback is paused
    public var paused: Bool {
        get { isPaused }
        set {
            isPaused = newValue
            if newValue {
                player?.pause()
            } else {
                player?.play()
            }
        }
    }

    /// Whether the video is muted
    public var muted: Bool {
        get { isMuted }
        set {
            isMuted = newValue
            player?.isMuted = newValue
        }
    }

    // MARK: - Initialization

    public override init(frame: CGRect) {
        super.init(frame: frame)
        commonInit()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        commonInit()
    }

    private func commonInit() {
        clipsToBounds = true
        backgroundColor = .clear
        setupMetal()
        startDisplayLink()
    }

    deinit {
        cleanup()
    }

    public override func didMoveToSuperview() {
        super.didMoveToSuperview()
        if superview == nil {
            // View removed from hierarchy - stop display link to prevent memory leak
            stopDisplayLink()
        }
    }

    // MARK: - Metal Setup

    private func setupMetal() {
        // Get the default Metal device
        guard let device = MTLCreateSystemDefaultDevice() else {
            onError?("Metal is not supported on this device")
            return
        }
        self.device = device

        // Create command queue
        guard let queue = device.makeCommandQueue() else {
            onError?("Failed to create Metal command queue")
            return
        }
        self.commandQueue = queue

        // Create texture cache for efficient CVPixelBuffer -> MTLTexture conversion
        var cache: CVMetalTextureCache?
        let status = CVMetalTextureCacheCreate(nil, nil, device, nil, &cache)
        guard status == kCVReturnSuccess, let textureCache = cache else {
            onError?("Failed to create Metal texture cache")
            return
        }
        self.textureCache = textureCache

        // Setup MTKView
        metalView = MTKView(frame: bounds, device: device)
        metalView.delegate = self
        metalView.framebufferOnly = false
        metalView.colorPixelFormat = .bgra8Unorm
        metalView.clearColor = MTLClearColor(red: 0, green: 0, blue: 0, alpha: 0)
        metalView.isOpaque = false
        metalView.backgroundColor = .clear
        metalView.enableSetNeedsDisplay = false
        metalView.isPaused = true  // We'll drive rendering manually
        addSubview(metalView)

        // Create render pipeline
        setupRenderPipeline()

        // Create vertex buffer for full-screen quad
        setupVertexBuffer()
    }

    private func setupRenderPipeline() {
        // Compile shader from source string
        let shaderSource = """
        #include <metal_stdlib>
        using namespace metal;

        struct VertexIn {
            float2 position [[attribute(0)]];
            float2 texCoord [[attribute(1)]];
        };

        struct VertexOut {
            float4 position [[position]];
            float2 texCoord;
        };

        vertex VertexOut vertexShader(VertexIn in [[stage_in]]) {
            VertexOut out;
            out.position = float4(in.position, 0.0, 1.0);
            out.texCoord = in.texCoord;
            return out;
        }

        fragment float4 fragmentShader(
            VertexOut in [[stage_in]],
            texture2d<float> videoTexture [[texture(0)]]
        ) {
            constexpr sampler textureSampler(filter::linear, address::clamp_to_edge);

            // Sample RGB from top half of video (y: 0 to 0.5)
            float2 rgbCoord = float2(in.texCoord.x, in.texCoord.y * 0.5);
            float4 rgb = videoTexture.sample(textureSampler, rgbCoord);

            // Sample alpha from bottom half of video (y: 0.5 to 1.0)
            float2 alphaCoord = float2(in.texCoord.x, 0.5 + in.texCoord.y * 0.5);
            float alpha = videoTexture.sample(textureSampler, alphaCoord).r;

            // Premultiplied alpha output
            return float4(rgb.rgb * alpha, alpha);
        }
        """

        do {
            let library = try device.makeLibrary(source: shaderSource, options: nil)
            createPipeline(with: library)
        } catch {
            onError?("Failed to compile Metal shaders: \(error.localizedDescription)")
        }
    }

    private func createPipeline(with library: MTLLibrary) {
        guard let vertexFunction = library.makeFunction(name: "vertexShader"),
              let fragmentFunction = library.makeFunction(name: "fragmentShader") else {
            onError?("Failed to find shader functions")
            return
        }

        let pipelineDescriptor = MTLRenderPipelineDescriptor()
        pipelineDescriptor.vertexFunction = vertexFunction
        pipelineDescriptor.fragmentFunction = fragmentFunction
        pipelineDescriptor.colorAttachments[0].pixelFormat = metalView.colorPixelFormat

        // Enable alpha blending
        pipelineDescriptor.colorAttachments[0].isBlendingEnabled = true
        pipelineDescriptor.colorAttachments[0].sourceRGBBlendFactor = .one
        pipelineDescriptor.colorAttachments[0].destinationRGBBlendFactor = .oneMinusSourceAlpha
        pipelineDescriptor.colorAttachments[0].sourceAlphaBlendFactor = .one
        pipelineDescriptor.colorAttachments[0].destinationAlphaBlendFactor = .oneMinusSourceAlpha

        // Vertex descriptor
        let vertexDescriptor = MTLVertexDescriptor()
        // Position attribute
        vertexDescriptor.attributes[0].format = .float2
        vertexDescriptor.attributes[0].offset = 0
        vertexDescriptor.attributes[0].bufferIndex = 0
        // Texture coordinate attribute
        vertexDescriptor.attributes[1].format = .float2
        vertexDescriptor.attributes[1].offset = MemoryLayout<Float>.size * 2
        vertexDescriptor.attributes[1].bufferIndex = 0
        // Layout
        vertexDescriptor.layouts[0].stride = MemoryLayout<Float>.size * 4
        pipelineDescriptor.vertexDescriptor = vertexDescriptor

        do {
            pipelineState = try device.makeRenderPipelineState(descriptor: pipelineDescriptor)
        } catch {
            onError?("Failed to create pipeline state: \(error.localizedDescription)")
        }
    }

    private func setupVertexBuffer() {
        // Full-screen quad vertices (position + texCoord)
        // Position: clip space (-1 to 1), TexCoord: (0 to 1)
        let vertices: [Float] = [
            // Position     TexCoord
            -1.0, -1.0,     0.0, 1.0,   // Bottom-left
             1.0, -1.0,     1.0, 1.0,   // Bottom-right
            -1.0,  1.0,     0.0, 0.0,   // Top-left
             1.0,  1.0,     1.0, 0.0,   // Top-right
        ]

        vertexBuffer = device.makeBuffer(bytes: vertices,
                                         length: vertices.count * MemoryLayout<Float>.size,
                                         options: .storageModeShared)
    }

    // MARK: - Video Setup

    private func setupVideo() {
        guard !_sourceUri.isEmpty else { return }

        // Clean up previous player
        cleanupPlayer()

        // Create URL - handle both file:// URLs and plain paths
        let url: URL
        if _sourceUri.hasPrefix("file://") {
            guard let fileURL = URL(string: _sourceUri) else {
                onError?("Invalid file URL")
                return
            }
            url = fileURL
        } else if _sourceUri.hasPrefix("/") {
            url = URL(fileURLWithPath: _sourceUri)
        } else if _sourceUri.hasPrefix("http://") || _sourceUri.hasPrefix("https://") {
            guard let remoteURL = URL(string: _sourceUri) else {
                onError?("Invalid video URL")
                return
            }
            url = remoteURL
        } else {
            guard let fallbackURL = URL(string: _sourceUri) else {
                onError?("Invalid video URL format")
                return
            }
            url = fallbackURL
        }

        // Verify file exists if it's a file URL
        if url.isFileURL {
            let fileManager = FileManager.default
            if !fileManager.fileExists(atPath: url.path) {
                onError?("Video file not found: \(url.path)")
                return
            }
        }

        // Create player item
        let asset = AVAsset(url: url)
        playerItem = AVPlayerItem(asset: asset)

        // Setup video output for pixel buffer access
        let outputSettings: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
        let output = AVPlayerItemVideoOutput(pixelBufferAttributes: outputSettings)
        videoOutput = output

        guard let item = playerItem else {
            onError?("Failed to create player item")
            return
        }
        item.add(output)

        // Create player
        player = AVPlayer(playerItem: item)
        player?.isMuted = isMuted

        // Observe end of playback
        loopObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: item,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            if self.shouldLoop {
                self.player?.seek(to: .zero)
                self.player?.play()
            } else {
                self.player?.pause()
                self.invokeOnEnd()
            }
        }

        // Observe when ready to play
        item.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        isStatusObserverAdded = true

        // Start display link for rendering
        startDisplayLink()

        // Start playback if not paused
        if !isPaused {
            player?.play()
        }

        isSetup = true
    }

    public override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                                       change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "status" {
            // KVO can be called from any thread, ensure we handle on main thread
            let handleStatus = { [weak self] in
                guard let self = self else { return }
                guard let status = self.playerItem?.status else { return }

                // Cancel any existing timeout timer
                self.statusTimeoutTimer?.invalidate()
                self.statusTimeoutTimer = nil

                switch status {
                case .readyToPlay:
                    // Validate video has actual video tracks
                    if let item = self.playerItem {
                        let videoTracks = item.asset.tracks(withMediaType: .video)
                        if videoTracks.isEmpty {
                            self.invokeOnError("No video tracks found. This may be an audio-only file.")
                            return
                        }
                    }
                    self.invokeOnLoad()
                case .failed:
                    let errorMsg = self.playerItem?.error?.localizedDescription ?? "Unknown error"
                    self.invokeOnError(errorMsg)
                case .unknown:
                    // Start a timeout timer on main thread's run loop
                    self.statusTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: false) { [weak self] _ in
                        guard let self = self, self.playerItem?.status == .unknown else { return }
                        self.invokeOnError("Video loading timeout. Please check your network connection or video URL.")
                    }
                @unknown default:
                    break
                }
            }

            if Thread.isMainThread {
                handleStatus()
            } else {
                DispatchQueue.main.async(execute: handleStatus)
            }
        }
    }

    // MARK: - Thread-Safe Callback Helpers

    /// Invoke onLoad callback on main thread
    private func invokeOnLoad() {
        if Thread.isMainThread {
            onLoad?()
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.onLoad?()
            }
        }
    }

    /// Invoke onError callback on main thread
    private func invokeOnError(_ message: String) {
        if Thread.isMainThread {
            onError?(message)
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.onError?(message)
            }
        }
    }

    /// Invoke onEnd callback on main thread
    private func invokeOnEnd() {
        if Thread.isMainThread {
            onEnd?()
        } else {
            DispatchQueue.main.async { [weak self] in
                self?.onEnd?()
            }
        }
    }

    // MARK: - Display Link

    private func startDisplayLink() {
        stopDisplayLink()

        // Use weak proxy to prevent retain cycle (CADisplayLink retains its target strongly)
        displayLinkProxy = DisplayLinkProxy(target: self)
        guard let proxy = displayLinkProxy else { return }
        displayLink = CADisplayLink(target: proxy, selector: #selector(DisplayLinkProxy.tick))
        if #available(iOS 15.0, *) {
            displayLink?.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, __preferred: 60)
        } else {
            // Fallback for iOS 14 - use preferredFramesPerSecond
            displayLink?.preferredFramesPerSecond = 60
        }
        displayLink?.add(to: .main, forMode: .common)
    }

    private func stopDisplayLink() {
        displayLink?.invalidate()
        displayLink = nil
        displayLinkProxy = nil
    }

    @objc private func displayLinkCallback() {
        metalView.draw()
    }

    // MARK: - MTKViewDelegate

    public func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        // Handle size changes if needed
    }

    private var frameCount = 0

    public func draw(in view: MTKView) {
        frameCount += 1

        guard let pipelineState = pipelineState else { return }
        guard let videoOutput = videoOutput, let player = player else { return }

        // Only render when player is active (playing or paused with content)
        guard player.rate != 0 || isPaused else { return }

        // Get current video time and check for new frame
        let currentTime = videoOutput.itemTime(forHostTime: CACurrentMediaTime())

        // Try to get video frame - cache last frame to prevent flicker
        if videoOutput.hasNewPixelBuffer(forItemTime: currentTime),
           let pixelBuffer = videoOutput.copyPixelBuffer(forItemTime: currentTime, itemTimeForDisplay: nil) {
            if let newTexture = createTexture(from: pixelBuffer) {
                lastTexture = newTexture  // Cache the new frame
            }
        }

        // Use cached texture (either newly created or from previous frame)
        guard let texture = lastTexture else { return }

        // Get rendering resources
        guard let drawable = view.currentDrawable,
              let renderPassDescriptor = view.currentRenderPassDescriptor,
              let commandBuffer = commandQueue.makeCommandBuffer(),
              let renderEncoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) else {
            return
        }

        // Render with cached texture
        renderEncoder.setRenderPipelineState(pipelineState)
        renderEncoder.setVertexBuffer(vertexBuffer, offset: 0, index: 0)
        renderEncoder.setFragmentTexture(texture, index: 0)
        renderEncoder.drawPrimitives(type: .triangleStrip, vertexStart: 0, vertexCount: 4)
        renderEncoder.endEncoding()

        commandBuffer.present(drawable)
        commandBuffer.commit()
    }

    private func createTexture(from pixelBuffer: CVPixelBuffer) -> MTLTexture? {
        let width = CVPixelBufferGetWidth(pixelBuffer)
        let height = CVPixelBufferGetHeight(pixelBuffer)

        var cvTexture: CVMetalTexture?
        let status = CVMetalTextureCacheCreateTextureFromImage(
            nil,
            textureCache,
            pixelBuffer,
            nil,
            .bgra8Unorm,
            width,
            height,
            0,
            &cvTexture
        )

        guard status == kCVReturnSuccess, let cvTexture = cvTexture else {
            consecutiveTextureFailures += 1
            let errorDescription = cvReturnCodeDescription(status)
            // Emit error event if we've had many consecutive failures
            if consecutiveTextureFailures == 120 {
                onError?("Metal texture creation failed repeatedly (\(errorDescription)). Video may not render correctly.")
            }
            return nil
        }

        // Reset failure counter on success
        consecutiveTextureFailures = 0
        return CVMetalTextureGetTexture(cvTexture)
    }

    private func cvReturnCodeDescription(_ status: CVReturn) -> String {
        switch status {
        case kCVReturnSuccess: return "Success"
        case kCVReturnInvalidArgument: return "Invalid argument"
        case kCVReturnAllocationFailed: return "Allocation failed (GPU memory)"
        case kCVReturnInvalidPixelFormat: return "Invalid pixel format"
        case kCVReturnInvalidSize: return "Invalid size"
        case kCVReturnPixelBufferNotMetalCompatible: return "Pixel buffer not Metal compatible"
        default: return "Unknown error (\(status))"
        }
    }

    // MARK: - Layout

    public override func layoutSubviews() {
        super.layoutSubviews()
        metalView.frame = bounds
    }

    // MARK: - Cleanup

    private func cleanupPlayer() {
        player?.pause()
        stopDisplayLink()

        // Cancel status timeout timer
        statusTimeoutTimer?.invalidate()
        statusTimeoutTimer = nil

        if let observer = loopObserver {
            NotificationCenter.default.removeObserver(observer)
            loopObserver = nil
        }

        // Remove KVO observer synchronously - must complete before playerItem is nilled
        // Using sync dispatch to prevent race condition where playerItem becomes nil before observer removal
        if isStatusObserverAdded, let item = playerItem {
            if Thread.isMainThread {
                item.removeObserver(self, forKeyPath: "status")
            } else {
                // Use sync to guarantee observer is removed before we proceed
                DispatchQueue.main.sync {
                    item.removeObserver(self, forKeyPath: "status")
                }
            }
            isStatusObserverAdded = false
        }

        player = nil
        playerItem = nil
        videoOutput = nil
        lastTexture = nil
        consecutiveTextureFailures = 0
        isSetup = false
    }

    private func cleanup() {
        if Thread.isMainThread {
            cleanupPlayer()
        } else {
            // Use sync to ensure cleanup completes during deinit
            // This is safe because cleanupPlayer doesn't dispatch back to main
            DispatchQueue.main.sync { [self] in
                self.cleanupPlayer()
            }
        }
    }
}
