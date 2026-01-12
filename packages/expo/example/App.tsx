import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { StackedAlphaVideo } from '@hypervideo/expo-native';

// Sample stacked-alpha video URL
const SAMPLE_VIDEO_URL = 'https://hip-gazelle-728.convex.cloud/api/storage/d50b1663-f1c9-4c3c-ae75-6037dedc172b';

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (Platform.OS !== 'ios') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>iOS Only</Text>
        <Text style={styles.subtitle}>
          @hypervideo/expo-native currently only supports iOS.
        </Text>
        <Text style={styles.subtitle}>
          Run this example on an iOS simulator or device.
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stacked Alpha Video</Text>
      <Text style={styles.subtitle}>Native Metal Renderer</Text>

      <View style={styles.videoContainer}>
        <StackedAlphaVideo
          src={SAMPLE_VIDEO_URL}
          style={styles.video}
          autoPlay
          loop
          muted
          paused={isPaused}
          onLoad={() => {
            console.log('Video loaded!');
            setIsLoaded(true);
            setError(null);
          }}
          onEnd={() => {
            console.log('Video ended!');
          }}
          onError={(err) => {
            console.error('Video error:', err);
            setError(err);
          }}
        />
      </View>

      <View style={styles.status}>
        {error ? (
          <Text style={styles.errorText}>Error: {error}</Text>
        ) : (
          <Text style={styles.statusText}>
            Status: {isLoaded ? 'Loaded' : 'Loading...'}
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        <Pressable
          style={[styles.button, isPaused && styles.buttonActive]}
          onPress={() => setIsPaused(!isPaused)}
        >
          <Text style={styles.buttonText}>
            {isPaused ? 'Play' : 'Pause'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.instructions}>
        The video should display with transparent background.
        {'\n'}Tap the button to pause/resume playback.
      </Text>

      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  videoContainer: {
    width: 300,
    height: 300,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: 300,
    height: 300,
  },
  status: {
    marginTop: 16,
  },
  statusText: {
    color: '#4ade80',
    fontSize: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: '#22c55e',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  instructions: {
    marginTop: 24,
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
