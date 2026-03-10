import { describe, it, expect } from 'vitest';
import { Hypervideo } from '../client';
import { HypervideoError } from '../types/errors';

describe('Hypervideo client', () => {
  it('should expose image, video, and jobs endpoints', () => {
    const client = new Hypervideo({ apiKey: 'test-key' });
    expect(client.image).toBeDefined();
    expect(client.video).toBeDefined();
    expect(client.jobs).toBeDefined();
  });

  it('should throw when apiKey is missing', () => {
    expect(() => new Hypervideo({ apiKey: '' })).toThrow(HypervideoError);
    expect(() => new Hypervideo({ apiKey: '' })).toThrow('apiKey is required');
  });
});
