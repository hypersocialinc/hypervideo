import ExpoModulesCore

public class StackedAlphaVideoModule: Module {
    public func definition() -> ModuleDefinition {
        Name("StackedAlphaVideo")

        // Define the native view
        View(StackedAlphaVideoView.self) {
            // Video source URI
            Prop("sourceUri") { (view: StackedAlphaVideoView, uri: String) in
                view.setSourceUri(uri)
            }

            // Whether source is a local asset
            Prop("isLocalAsset") { (view: StackedAlphaVideoView, isLocal: Bool) in
                view.setIsLocalAsset(isLocal)
            }

            // Loop playback
            Prop("loop") { (view: StackedAlphaVideoView, loop: Bool) in
                view.setLoop(loop)
            }

            // Paused state
            Prop("paused") { (view: StackedAlphaVideoView, paused: Bool) in
                view.setPaused(paused)
            }

            // Muted state
            Prop("muted") { (view: StackedAlphaVideoView, muted: Bool) in
                view.setMuted(muted)
            }

            // Explicit dimensions (optional sizing hints for debugging)
            Prop("width") { (view: StackedAlphaVideoView, width: Double) in
                view.setViewWidth(CGFloat(width))
            }

            Prop("height") { (view: StackedAlphaVideoView, height: Double) in
                view.setViewHeight(CGFloat(height))
            }

            // Events
            Events("onLoad", "onEnd", "onError")
        }
    }
}
