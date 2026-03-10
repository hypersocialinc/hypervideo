import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HypervideoError } from '../types/errors';
import { JobsEndpoints } from '../endpoints/jobs';
import type { JobResponse } from '../types/jobs';

const config = { apiKey: 'test-key', baseUrl: 'https://api.test.dev', timeout: 30000 };

function mockFetch(responses: Array<{ ok: boolean; status: number; json: () => Promise<unknown> }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const response = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ...response,
      headers: new Headers({ 'content-type': 'application/json' }),
    };
  });
}

describe('JobsEndpoints', () => {
  let jobs: JobsEndpoints;

  beforeEach(() => {
    jobs = new JobsEndpoints(config);
    vi.restoreAllMocks();
  });

  describe('submit', () => {
    it('should reject when no input provided', async () => {
      await expect(jobs.submit({})).rejects.toThrow(
        "Either 'file', 'url', or 'inputStorageId' is required"
      );
    });

    it('should accept url input', async () => {
      const fetchMock = mockFetch([{
        ok: true,
        status: 202,
        json: async () => ({ success: true, data: { jobId: 'job-123', status: 'queued' } }),
      }]);
      vi.stubGlobal('fetch', fetchMock);

      const result = await jobs.submit({ url: 'https://example.com/video.mp4', format: 'apng' });
      expect(result.jobId).toBe('job-123');
      expect(result.status).toBe('queued');

      // Verify it called the correct endpoint
      expect(fetchMock).toHaveBeenCalledOnce();
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toBe('https://api.test.dev/api/v1/jobs/video/remove-background');
    });

    it('should accept inputStorageId', async () => {
      const fetchMock = mockFetch([{
        ok: true,
        status: 202,
        json: async () => ({ success: true, data: { jobId: 'job-456', status: 'queued' } }),
      }]);
      vi.stubGlobal('fetch', fetchMock);

      const result = await jobs.submit({ inputStorageId: 'storage-abc' });
      expect(result.jobId).toBe('job-456');
    });
  });

  describe('get', () => {
    it('should fetch job status', async () => {
      const jobResponse: JobResponse = {
        jobId: 'job-123',
        type: 'video',
        status: 'processing',
        progress: 50,
        stage: 'processing-video',
        createdAt: 1710000000,
        startedAt: 1710000010,
        completedAt: null,
        error: null,
        result: null,
      };

      vi.stubGlobal('fetch', mockFetch([{
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: jobResponse }),
      }]));

      const result = await jobs.get('job-123');
      expect(result.status).toBe('processing');
      expect(result.progress).toBe(50);
      expect(result.stage).toBe('processing-video');
    });

    it('should encode jobId in URL', async () => {
      const fetchMock = mockFetch([{
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: {
            jobId: 'job/special', type: 'video', status: 'queued',
            progress: null, stage: null, createdAt: 0,
            startedAt: null, completedAt: null, error: null, result: null,
          },
        }),
      }]);
      vi.stubGlobal('fetch', fetchMock);

      await jobs.get('job/special');
      const calledUrl = fetchMock.mock.calls[0][0];
      expect(calledUrl).toContain('job%2Fspecial');
    });
  });

  describe('poll', () => {
    it('should return immediately when job is completed', async () => {
      const completedJob: JobResponse = {
        jobId: 'job-123',
        type: 'video',
        status: 'completed',
        progress: 100,
        stage: null,
        createdAt: 1710000000,
        startedAt: 1710000010,
        completedAt: 1710000020,
        error: null,
        result: {
          outputUrl: 'https://storage.example.com/output.webm',
          outputFormat: 'webm',
          outputSize: 1500000,
          width: 768,
          height: 768,
          processingTimeMs: 10000,
          outputs: [{ format: 'webm', url: 'https://storage.example.com/output.webm', size: 1500000 }],
        },
      };

      vi.stubGlobal('fetch', mockFetch([{
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: completedJob }),
      }]));

      const result = await jobs.poll('job-123');
      expect(result.status).toBe('completed');
      expect(result.result?.outputUrl).toBe('https://storage.example.com/output.webm');
    });

    it('should throw on failed job', async () => {
      const failedJob: JobResponse = {
        jobId: 'job-123',
        type: 'video',
        status: 'failed',
        progress: 25,
        stage: null,
        createdAt: 1710000000,
        startedAt: 1710000010,
        completedAt: 1710000015,
        error: { code: 'PROCESSING_FAILED', message: 'Video too large' },
        result: null,
      };

      vi.stubGlobal('fetch', mockFetch([{
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: failedJob }),
      }]));

      await expect(jobs.poll('job-123')).rejects.toThrow('Video too large');
      await expect(jobs.poll('job-123')).rejects.toThrow(HypervideoError);
    });

    it('should poll multiple times until completed', async () => {
      const processingJob: JobResponse = {
        jobId: 'job-123', type: 'video', status: 'processing',
        progress: 50, stage: 'processing-video',
        createdAt: 0, startedAt: 0, completedAt: null, error: null, result: null,
      };
      const completedJob: JobResponse = {
        jobId: 'job-123', type: 'video', status: 'completed',
        progress: 100, stage: null,
        createdAt: 0, startedAt: 0, completedAt: 1,
        error: null,
        result: {
          outputUrl: 'https://out.test/v.webm', outputFormat: 'webm', outputSize: 100,
          width: 100, height: 100, processingTimeMs: 5000,
          outputs: [{ format: 'webm', url: 'https://out.test/v.webm', size: 100 }],
        },
      };

      const fetchMock = mockFetch([
        { ok: true, status: 200, json: async () => ({ success: true, data: processingJob }) },
        { ok: true, status: 200, json: async () => ({ success: true, data: completedJob }) },
      ]);
      vi.stubGlobal('fetch', fetchMock);

      const progressCalls: JobResponse[] = [];
      const result = await jobs.poll('job-123', {
        interval: 10, // fast for tests
        onProgress: (job) => progressCalls.push(job),
      });

      expect(result.status).toBe('completed');
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(progressCalls).toHaveLength(2);
      expect(progressCalls[0].status).toBe('processing');
      expect(progressCalls[1].status).toBe('completed');
    });

    it('should timeout when job takes too long', async () => {
      const processingJob: JobResponse = {
        jobId: 'job-123', type: 'video', status: 'processing',
        progress: 10, stage: 'loading-input',
        createdAt: 0, startedAt: 0, completedAt: null, error: null, result: null,
      };

      vi.stubGlobal('fetch', mockFetch([
        { ok: true, status: 200, json: async () => ({ success: true, data: processingJob }) },
      ]));

      await expect(
        jobs.poll('job-123', { interval: 10, timeout: 50 })
      ).rejects.toThrow('did not complete within');
    });
  });
});
