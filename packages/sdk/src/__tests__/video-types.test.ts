import { describe, it, expect } from 'vitest';
import { HypervideoError } from '../types/errors';
import { VideoEndpoints } from '../endpoints/video';
import type { VideoFormat, VideoRemoveBackgroundOptions } from '../types/video';

const config = { apiKey: 'test-key', baseUrl: 'https://api.test.dev', timeout: 30000 };

describe('VideoFormat type', () => {
  it('should include apng as a valid format', () => {
    const formats: VideoFormat[] = ['webm', 'stacked-alpha', 'webp', 'apng', 'mov'];
    expect(formats).toContain('apng');
    expect(formats).toHaveLength(5);
  });
});

describe('VideoRemoveBackgroundOptions', () => {
  it('should accept apng format', () => {
    const options: VideoRemoveBackgroundOptions = {
      url: 'https://example.com/video.mp4',
      format: 'apng',
      quality: 60,
    };
    expect(options.format).toBe('apng');
  });
});

describe('VideoEndpoints validation', () => {
  const endpoints = new VideoEndpoints(config);

  it('should reject missing file and url', async () => {
    await expect(
      endpoints.removeBackground({} as any)
    ).rejects.toThrow("Either 'file' or 'url' is required");
  });

  it('should reject both format and formats', async () => {
    await expect(
      endpoints.removeBackground({
        url: 'https://example.com/v.mp4',
        format: 'webm',
        formats: ['webm', 'apng'],
      } as any)
    ).rejects.toThrow("Cannot specify both 'format' and 'formats'");
  });

  it('should reject invalid quality', async () => {
    await expect(
      endpoints.removeBackground({ url: 'https://example.com/v.mp4', quality: 150 })
    ).rejects.toThrow('quality must be between 0 and 100');
  });

  it('should reject invalid tolerance', async () => {
    await expect(
      endpoints.removeBackground({ url: 'https://example.com/v.mp4', tolerance: -1 })
    ).rejects.toThrow('Tolerance must be an integer between 0 and 100');
  });

  it('should reject invalid fps', async () => {
    await expect(
      endpoints.removeBackground({ url: 'https://example.com/v.mp4', fps: 0 })
    ).rejects.toThrow('FPS must be an integer between 1 and 60');
  });
});
