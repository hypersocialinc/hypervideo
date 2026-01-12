import SwiftUI
import HypervideoVideo

struct ContentView: View {
    @State private var isLoaded = false
    @State private var errorMessage: String?

    // Use bundled sample video - stacked-alpha MP4 format
    private var videoURL: String {
        Bundle.main.url(forResource: "sample-stacked", withExtension: "mp4")?.absoluteString ?? ""
    }

    var body: some View {
        ZStack {
            // Gradient background to show transparency
            LinearGradient(
                colors: [.purple, .blue, Color(red: 0, green: 1, blue: 1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 20) {
                Text("HypervideoVideo Test")
                    .font(.title)
                    .fontWeight(.bold)
                    .foregroundColor(.white)

                // Video player
                StackedAlphaVideo(
                    url: videoURL,
                    loop: true,
                    muted: true
                )
                .onVideoLoad {
                    isLoaded = true
                    print("Video loaded!")
                }
                .onVideoError { error in
                    errorMessage = error
                    print("Error: \(error)")
                }
                .frame(width: 300, height: 300)

                // Status
                if isLoaded {
                    Label("Video Loaded", systemImage: "checkmark.circle.fill")
                        .foregroundColor(.green)
                } else if let error = errorMessage {
                    Label(error, systemImage: "xmark.circle.fill")
                        .foregroundColor(.red)
                        .font(.caption)
                } else {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                }
            }
            .padding()
        }
    }
}

#Preview {
    ContentView()
}
