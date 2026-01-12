import ExpoModulesCore
import AVFoundation
import MetalKit
import CoreVideo

class StackedAlphaVideoView: ExpoView, MTKViewDelegate {
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

    private var sourceUri: String = ""
    private var isLocalAsset: Bool = false
    private var shouldLoop: Bool = true
    private var isPaused: Bool = false
    private var isMuted: Bool = true
    private var isSetup: Bool = false
    private var loopObserver: NSObjectProtocol?
    private var lastTexture: MTLTexture?  // Cache last frame to prevent flicker
    private var isStatusObserverAdded: Bool = false  // Track KVO observer state
    private var statusTimeoutTimer: Timer?  // Timeout for unknown status
    private var consecutiveTextureFailures: Int = 0  // Track texture creation failures

    // Explicit dimensions passed from JS
    private var explicitWidth: CGFloat = 0
    private var explicitHeight: CGFloat = 0

    // Event emitters
    let onLoad = EventDispatcher()
    let onEnd = EventDispatcher()
    let onError = EventDispatcher()

    // MARK: - Initialization

    required init(appContext: AppContext? = nil) {
        NSLog("[StackedAlphaVideo] Initializing view")
        super.init(appContext: appContext)
        // Required for proper view clipping in Expo modules
        clipsToBounds = true
        self.backgroundColor = .clear
        setupMetal()
        // Start display link early to ensure rendering loop runs
        startDisplayLink()
        NSLog("[StackedAlphaVideo] View initialized, Metal setup complete, display link started")
    }

    deinit {
        cleanup()
    }

    override func didMoveToSuperview() {
        super.didMoveToSuperview()
        if superview == nil {
            // View removed from hierarchy - stop display link to prevent memory leak
            NSLog("[StackedAlphaVideo] View removed from superview, stopping display link")
            stopDisplayLink()
        }
    }

    // MARK: - Setup

    private func setupMetal() {
        // Get the default Metal device
        guard let device = MTLCreateSystemDefaultDevice() else {
            onError(["error": "Metal is not supported on this device"])
            return
        }
        self.device = device

        // Create command queue
        guard let queue = device.makeCommandQueue() else {
            onError(["error": "Failed to create Metal command queue"])
            return
        }
        self.commandQueue = queue

        // Create texture cache for efficient CVPixelBuffer -> MTLTexture conversion
        var cache: CVMetalTextureCache?
        let status = CVMetalTextureCacheCreate(nil, nil, device, nil, &cache)
        guard status == kCVReturnSuccess, let textureCache = cache else {
            onError(["error": "Failed to create Metal texture cache"])
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
        // Compile shader from source string for reliability in Expo module context
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
            onError(["error": "Failed to compile Metal shaders: \(error.localizedDescription)"])
        }
    }

    private func createPipeline(with library: MTLLibrary) {
        guard let vertexFunction = library.makeFunction(name: "vertexShader"),
              let fragmentFunction = library.makeFunction(name: "fragmentShader") else {
            onError(["error": "Failed to find shader functions"])
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
            onError(["error": "Failed to create pipeline state: \(error.localizedDescription)"])
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
        guard !sourceUri.isEmpty else {
            NSLog("[StackedAlphaVideo] setupVideo called but sourceUri is empty")
            return
        }

        NSLog("[StackedAlphaVideo] setupVideo starting with URI: %@, isLocalAsset: %d", sourceUri, isLocalAsset)

        // Clean up previous player
        cleanupPlayer()

        // Create URL - handle both file:// URLs and plain paths
        let url: URL
        if sourceUri.hasPrefix("file://") {
            // Already a file URL
            NSLog("[StackedAlphaVideo] URI is a file:// URL")
            guard let fileURL = URL(string: sourceUri) else {
                NSLog("[StackedAlphaVideo] Failed to create URL from file:// string: %@", sourceUri)
                onError(["error": "Invalid file URL"])
                return
            }
            url = fileURL
        } else if sourceUri.hasPrefix("/") {
            // Plain file path without file:// prefix
            NSLog("[StackedAlphaVideo] URI is a plain path, converting to file URL")
            url = URL(fileURLWithPath: sourceUri)
        } else if sourceUri.hasPrefix("http://") || sourceUri.hasPrefix("https://") {
            // Remote URL
            NSLog("[StackedAlphaVideo] URI is a remote URL")
            guard let remoteURL = URL(string: sourceUri) else {
                NSLog("[StackedAlphaVideo] Failed to create URL from remote string: %@", sourceUri)
                onError(["error": "Invalid video URL"])
                return
            }
            url = remoteURL
        } else {
            // Unknown format - try URL(string:) as fallback
            NSLog("[StackedAlphaVideo] URI format unknown, trying URL(string:)")
            guard let fallbackURL = URL(string: sourceUri) else {
                NSLog("[StackedAlphaVideo] Failed to create URL from string: %@", sourceUri)
                onError(["error": "Invalid video URL format"])
                return
            }
            url = fallbackURL
        }
        NSLog("[StackedAlphaVideo] Created URL: %@, isFileURL: %d", url.absoluteString, url.isFileURL)

        // Verify file exists if it's a file URL
        if url.isFileURL {
            let fileManager = FileManager.default
            if fileManager.fileExists(atPath: url.path) {
                NSLog("[StackedAlphaVideo] File exists at path: %@", url.path)
            } else {
                NSLog("[StackedAlphaVideo] WARNING: File does NOT exist at path: %@", url.path)
                onError(["error": "Video file not found: \(url.path)"])
                return
            }
        }

        // Create player item
        let asset = AVAsset(url: url)
        playerItem = AVPlayerItem(asset: asset)
        NSLog("[StackedAlphaVideo] Created AVPlayerItem")

        // Setup video output for pixel buffer access
        let outputSettings: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferMetalCompatibilityKey as String: true
        ]
        videoOutput = AVPlayerItemVideoOutput(pixelBufferAttributes: outputSettings)
        playerItem?.add(videoOutput!)

        // Create player - always use AVPlayer (not AVQueuePlayer/AVPlayerLooper)
        // because AVPlayerLooper creates copies of the template item and our
        // videoOutput wouldn't be attached to the copies
        NSLog("[StackedAlphaVideo] Creating AVPlayer")
        player = AVPlayer(playerItem: playerItem!)
        player?.isMuted = isMuted

        // Observe end of playback
        loopObserver = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak self] _ in
            guard let self = self else { return }
            if self.shouldLoop {
                // Seek to beginning and continue playing
                NSLog("[StackedAlphaVideo] Video ended, looping back to start")
                self.player?.seek(to: .zero)
                self.player?.play()
            } else {
                NSLog("[StackedAlphaVideo] Video ended (not looping)")
                self.player?.pause()
                self.onEnd()
            }
        }
        NSLog("[StackedAlphaVideo] Player created: %@, muted: %d", player?.description ?? "nil", isMuted)

        // Observe when ready to play
        playerItem?.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        isStatusObserverAdded = true
        NSLog("[StackedAlphaVideo] Added status observer to playerItem")

        // Start display link for rendering
        startDisplayLink()
        NSLog("[StackedAlphaVideo] Display link started")

        // Start playback if not paused
        if !isPaused {
            player?.play()
            NSLog("[StackedAlphaVideo] Called player.play(), rate: %f", player?.rate ?? 0)
        } else {
            NSLog("[StackedAlphaVideo] Player is paused, not starting playback")
        }

        isSetup = true
    }

    override func observeValue(forKeyPath keyPath: String?, of object: Any?,
                               change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "status" {
            if let status = playerItem?.status {
                // Cancel any existing timeout timer
                statusTimeoutTimer?.invalidate()
                statusTimeoutTimer = nil

                NSLog("[StackedAlphaVideo] Player status changed: %d", status.rawValue)
                switch status {
                case .readyToPlay:
                    // Validate video has actual video tracks
                    if let item = playerItem {
                        let videoTracks = item.asset.tracks(withMediaType: .video)
                        if videoTracks.isEmpty {
                            NSLog("[StackedAlphaVideo] Warning: No video tracks found in asset")
                            onError(["error": "No video tracks found. This may be an audio-only file."])
                            return
                        }
                        NSLog("[StackedAlphaVideo] Video ready with %d video track(s)", videoTracks.count)
                    }
                    NSLog("[StackedAlphaVideo] Video ready to play!")
                    onLoad()
                case .failed:
                    let errorMsg = playerItem?.error?.localizedDescription ?? "Unknown error"
                    NSLog("[StackedAlphaVideo] Video failed to load: %@", errorMsg)
                    onError(["error": errorMsg])
                case .unknown:
                    NSLog("[StackedAlphaVideo] Video status unknown, starting 30s timeout timer")
                    // Start a timeout timer - if status doesn't change within 30 seconds, emit error
                    statusTimeoutTimer = Timer.scheduledTimer(withTimeInterval: 30.0, repeats: false) { [weak self] _ in
                        guard let self = self, self.playerItem?.status == .unknown else { return }
                        NSLog("[StackedAlphaVideo] Video loading timeout - status remained unknown for 30s")
                        self.onError(["error": "Video loading timeout. Please check your network connection or video URL."])
                    }
                @unknown default:
                    NSLog("[StackedAlphaVideo] Video status unhandled: %d", status.rawValue)
                }
            }
        }
    }

    // MARK: - Display Link

    private func startDisplayLink() {
        stopDisplayLink()

        displayLink = CADisplayLink(target: self, selector: #selector(displayLinkCallback))
        displayLink?.preferredFrameRateRange = CAFrameRateRange(minimum: 30, maximum: 60, __preferred: 60)
        displayLink?.add(to: .main, forMode: .common)
    }

    private func stopDisplayLink() {
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func displayLinkCallback() {
        metalView.draw()
    }

    // MARK: - MTKViewDelegate

    func mtkView(_ view: MTKView, drawableSizeWillChange size: CGSize) {
        // Handle size changes if needed
    }

    private var frameCount = 0

    func draw(in view: MTKView) {
        frameCount += 1

        guard let pipelineState = pipelineState else {
            if frameCount % 60 == 0 { NSLog("[StackedAlphaVideo] draw: no pipelineState") }
            return
        }

        guard let videoOutput = videoOutput, let player = player else {
            if frameCount % 60 == 0 { NSLog("[StackedAlphaVideo] draw: no video output or player") }
            return
        }

        // Only render when player is active (playing or paused with content)
        guard player.rate != 0 || isPaused else {
            if frameCount % 60 == 0 { NSLog("[StackedAlphaVideo] draw: player not active (rate: %f, isPaused: %d)", player.rate, isPaused) }
            return
        }

        // Get current video time and check for new frame
        let currentTime = videoOutput.itemTime(forHostTime: CACurrentMediaTime())

        if frameCount % 60 == 0 {
            NSLog("[StackedAlphaVideo] draw: checking for frame at time %f, hasNew: %d", currentTime.seconds, videoOutput.hasNewPixelBuffer(forItemTime: currentTime))
        }

        // Try to get video frame - cache last frame to prevent flicker
        if videoOutput.hasNewPixelBuffer(forItemTime: currentTime),
           let pixelBuffer = videoOutput.copyPixelBuffer(forItemTime: currentTime, itemTimeForDisplay: nil) {
            if let newTexture = createTexture(from: pixelBuffer) {
                lastTexture = newTexture  // Cache the new frame
                if frameCount == 1 {
                    NSLog("[StackedAlphaVideo] Got first video frame!")
                }
            }
        }

        // Use cached texture (either newly created or from previous frame)
        guard let texture = lastTexture else {
            if frameCount % 60 == 0 { NSLog("[StackedAlphaVideo] draw: no cached texture yet") }
            return
        }

        // Get rendering resources
        guard let drawable = view.currentDrawable,
              let renderPassDescriptor = view.currentRenderPassDescriptor,
              let commandBuffer = commandQueue.makeCommandBuffer(),
              let renderEncoder = commandBuffer.makeRenderCommandEncoder(descriptor: renderPassDescriptor) else {
            if frameCount % 60 == 0 { NSLog("[StackedAlphaVideo] draw: can't get drawable/encoder (view size: %f x %f)", view.bounds.width, view.bounds.height) }
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

        if frameCount == 1 {
            NSLog("[StackedAlphaVideo] First draw call! View bounds: %f x %f, hasTexture: %d", view.bounds.width, view.bounds.height, texture != nil)
        }
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
            // Log error with details about the failure
            let errorDescription = cvReturnCodeDescription(status)
            if consecutiveTextureFailures <= 3 || consecutiveTextureFailures % 60 == 0 {
                NSLog("[StackedAlphaVideo] ERROR: Failed to create texture from pixel buffer. Status: %d (%@), size: %dx%d, consecutive failures: %d",
                      status, errorDescription, width, height, consecutiveTextureFailures)
            }
            // Emit error event if we've had many consecutive failures
            if consecutiveTextureFailures == 120 {
                onError(["error": "Metal texture creation failed repeatedly (\(errorDescription)). Video may not render correctly."])
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

    override func layoutSubviews() {
        super.layoutSubviews()
        metalView.frame = bounds
        NSLog("[StackedAlphaVideo] layoutSubviews: bounds = (%f, %f, %f, %f)", bounds.origin.x, bounds.origin.y, bounds.width, bounds.height)
    }

    // MARK: - Props

    func setSourceUri(_ uri: String) {
        NSLog("[StackedAlphaVideo] setSourceUri called with: %@", uri)
        guard uri != sourceUri else {
            NSLog("[StackedAlphaVideo] URI unchanged, skipping")
            return
        }
        sourceUri = uri
        if !uri.isEmpty {
            NSLog("[StackedAlphaVideo] Setting up video...")
            setupVideo()
        } else {
            NSLog("[StackedAlphaVideo] URI is empty, not setting up video")
        }
    }

    func setIsLocalAsset(_ isLocal: Bool) {
        isLocalAsset = isLocal
    }

    func setLoop(_ loop: Bool) {
        shouldLoop = loop
        // Loop behavior is handled dynamically via the AVPlayerItemDidPlayToEndTime notification
    }

    func setMuted(_ muted: Bool) {
        isMuted = muted
        player?.isMuted = muted
    }

    func setPaused(_ paused: Bool) {
        isPaused = paused
        if paused {
            player?.pause()
        } else {
            player?.play()
        }
    }

    func setViewWidth(_ width: CGFloat) {
        NSLog("[StackedAlphaVideo] setViewWidth: %f", width)
        explicitWidth = width
        updateFrameIfNeeded()
    }

    func setViewHeight(_ height: CGFloat) {
        NSLog("[StackedAlphaVideo] setViewHeight: %f", height)
        explicitHeight = height
        updateFrameIfNeeded()
    }

    private func updateFrameIfNeeded() {
        // NOTE: Don't set frame directly - React Native handles sizing via style prop
        // Just log the explicit dimensions for debugging
        if explicitWidth > 0 && explicitHeight > 0 {
            NSLog("[StackedAlphaVideo] Explicit dimensions set: %f x %f (current bounds: %f x %f)", explicitWidth, explicitHeight, bounds.width, bounds.height)
        }
        // Trigger layout update to ensure metalView matches bounds
        setNeedsLayout()
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

        // Remove KVO observer - ensure we're on main thread for thread safety
        if isStatusObserverAdded, let item = playerItem {
            if Thread.isMainThread {
                item.removeObserver(self, forKeyPath: "status")
                isStatusObserverAdded = false
            } else {
                // If called from background thread (e.g., deinit), dispatch to main
                let shouldRemove = isStatusObserverAdded
                isStatusObserverAdded = false  // Mark as removed to prevent double-removal
                if shouldRemove {
                    DispatchQueue.main.async { [weak item] in
                        // Note: item may already be deallocated, but removeObserver on nil is safe
                        item?.removeObserver(self, forKeyPath: "status")
                    }
                }
            }
        }

        player = nil
        playerItem = nil
        videoOutput = nil
        lastTexture = nil  // Clear cached texture
        consecutiveTextureFailures = 0
        isSetup = false
    }

    private func cleanup() {
        // Ensure cleanup runs on main thread
        if Thread.isMainThread {
            cleanupPlayer()
        } else {
            DispatchQueue.main.sync { [weak self] in
                self?.cleanupPlayer()
            }
        }
        // Note: Metal resources are managed by ARC and will be released
        // when this view is deallocated (on the main thread where they were created)
    }
}
