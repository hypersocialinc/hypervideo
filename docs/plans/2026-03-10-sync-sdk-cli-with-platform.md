# Sync SDK, CLI, Types & Plugin with Platform API

**Goal:** Bring the public `hyper-video` packages (SDK, CLI, types, plugin) up to date with the platform API — adding APNG format support, async job queue, updated defaults, and `size` parameter.

**Architecture:** The SDK gets new types + a `jobs` endpoint class. The CLI gets APNG format + optional async mode with polling. The types package gets video types. The plugin skill/commands get updated docs. All changes are additive — no breaking changes.

**Tech Stack:** TypeScript, pnpm monorepo, Commander.js (CLI), Claude Code plugin (Markdown)

**Repos:**
- Platform (API): `/Users/selcukatli/.hyperspaces/workspaces/hyper-video-platform-skills-and-platform`
- Public packages: `/Users/selcukatli/Projects/hyper-video`

---

## Task 1: Add `apng` to VideoFormat type in SDK

**Files:**
- Modify: `packages/sdk/src/types/video.ts:10`

**Step 1: Add `apng` to the VideoFormat union**

In `packages/sdk/src/types/video.ts`, change the type and its JSDoc:

```typescript
/**
 * Video output format
 * - webm: VP9 codec with alpha, small file, Chrome/Firefox/Edge
 * - stacked-alpha: H.264 with stacked RGB+Alpha, requires WebGL player, universal support
 * - webp: Animated WebP with alpha, very small, Safari compatible
 * - apng: Animated PNG with alpha, all browsers including iOS Safari, works in <img> tag
 * - mov: ProRes 4444 codec, large file, all browsers
 */
export type VideoFormat = 'webm' | 'stacked-alpha' | 'webp' | 'apng' | 'mov';
```

**Step 2: Build to verify no type errors**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/sdk build`
Expected: Clean build, no errors.

**Step 3: Commit**

```bash
git add packages/sdk/src/types/video.ts
git commit -m "feat(sdk): add apng to VideoFormat type"
```

---

## Task 2: Add `size` parameter and update default tolerance in SDK

**Files:**
- Modify: `packages/sdk/src/types/video.ts:32-45`
- Modify: `packages/sdk/src/endpoints/video.ts:87-133`

**Step 1: Add `size` to VideoRemoveBackgroundOptions**

In `packages/sdk/src/types/video.ts`, add the `size` field to `VideoRemoveBackgroundOptions`:

```typescript
export type VideoRemoveBackgroundOptions = MediaInput & {
  /** Background removal sensitivity 0-100 (default: 30). Used for chromakey processing. */
  tolerance?: number;
  /** Frames per second for processing 1-60 (default: 24) */
  fps?: number;
  /** Output size in pixels (64-2048). Resizes output to size×size. */
  size?: number;
  /** Single output format */
  format?: VideoFormat;
  /** Multiple output formats (at least one required if specified) */
  formats?: VideoFormatArray;
  /** Manual chromakey color (e.g., green screen). Forces chromakey processing. */
  chromaKey?: RGB;
  /** Quality 0-100 (default: 60, lower = smaller file). Used for webp/apng formats. */
  quality?: number;
};
```

Note: tolerance default changed from 20 → 30 in JSDoc, and quality JSDoc updated to mention apng.

**Step 2: Add `size` validation in video endpoint**

In `packages/sdk/src/endpoints/video.ts`, add size validation after the quality check (after line 108):

```typescript
    if (options.size !== undefined) {
      if (!Number.isInteger(options.size) || options.size < 64 || options.size > 2048) {
        throw new HypervideoError(
          'INVALID_SIZE',
          'size must be an integer between 64 and 2048',
          undefined,
          { size: options.size }
        );
      }
    }
```

**Step 3: Update JSDoc defaults in endpoint**

In `packages/sdk/src/endpoints/video.ts`, update the `removeBackground` method JSDoc example to show tolerance 30:

```typescript
   * // Default formats (webm + stacked-alpha, fast chromakey)
   * const result = await client.video.removeBackground({
   *   file: videoFile,
   *   tolerance: 30,
   * });
```

**Step 4: Build to verify**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/sdk build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add packages/sdk/src/types/video.ts packages/sdk/src/endpoints/video.ts
git commit -m "feat(sdk): add size parameter, update default tolerance to 30"
```

---

## Task 3: Add `processingMethod` to response types in SDK

**Files:**
- Modify: `packages/sdk/src/types/video.ts:56-79`

**Step 1: Add processingMethod to VideoRemoveBackgroundResponse**

The API now returns `processingMethod: 'chromakey' | 'ai'` in responses. Add it:

```typescript
export interface VideoRemoveBackgroundResponse {
  /** Base64 data URL of primary output (first format) */
  url: string;
  /** Format of primary output */
  format: VideoFormat;
  /** Primary output file size in bytes */
  size: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Duration in seconds */
  duration: number;
  /** Total number of frames processed */
  frameCount: number;
  /** Frames per second */
  fps: number;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Processing method used ('chromakey' or 'ai') */
  processingMethod?: 'chromakey' | 'ai';
  /** All outputs (present when multiple formats requested) */
  outputs?: VideoOutput[];
  /** Detected background color (auto-detect mode) */
  detectedBackgroundColor?: RGBWithHex;
}
```

**Step 2: Build to verify**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/sdk build`
Expected: Clean build.

**Step 3: Commit**

```bash
git add packages/sdk/src/types/video.ts
git commit -m "feat(sdk): add processingMethod to video response type"
```

---

## Task 4: Add async job types to SDK

**Files:**
- Create: `packages/sdk/src/types/jobs.ts`
- Modify: `packages/sdk/src/types/index.ts` (to re-export)

**Step 1: Check current types index**

Read `packages/sdk/src/types/index.ts` to see existing re-exports.

**Step 2: Create job types**

Create `packages/sdk/src/types/jobs.ts`:

```typescript
import type { RGBWithHex } from './common';
import type { VideoFormat } from './video';

/**
 * Job status lifecycle: queued → processing → completed | failed
 */
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Processing stage within a running job
 */
export type JobStage = 'loading-input' | 'processing-video' | 'uploading-outputs';

/**
 * Options for submitting an async video background removal job
 */
export type SubmitJobOptions = {
  /** Video file to process */
  file?: File | Blob | Buffer | ArrayBuffer;
  /** Video URL to process (alternative to file) */
  url?: string;
  /** Pre-uploaded Convex storage ID (alternative to file/url) */
  inputStorageId?: string;
  /** Background removal sensitivity 0-100 (default: 30) */
  tolerance?: number;
  /** Frames per second for processing 1-60 (default: 24) */
  fps?: number;
  /** Output size in pixels (64-2048) */
  size?: number;
  /** Single output format */
  format?: VideoFormat;
  /** Multiple output formats */
  formats?: VideoFormat[];
  /** Manual chromakey color */
  chromaKey?: { r: number; g: number; b: number };
  /** Quality 0-100 (default: 60) */
  quality?: number;
  /** Webhook URL for completion notification */
  webhookUrl?: string;
};

/**
 * Response from submitting a job (HTTP 202)
 */
export interface SubmitJobResponse {
  /** Unique job identifier */
  jobId: string;
  /** Initial status (always 'queued') */
  status: 'queued';
}

/**
 * Individual output format in a completed job
 */
export interface JobOutput {
  /** Output format */
  format: VideoFormat;
  /** Signed download URL */
  url: string;
  /** File size in bytes */
  size: number;
}

/**
 * Completed job result
 */
export interface JobResult {
  /** Signed URL for primary output */
  outputUrl: string;
  /** Primary output format */
  outputFormat: VideoFormat;
  /** Primary output size in bytes */
  outputSize: number;
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Detected background color */
  detectedBackgroundColor?: RGBWithHex;
  /** All format outputs */
  outputs: JobOutput[];
}

/**
 * Full job status response from GET /api/v1/jobs/:jobId
 */
export interface JobResponse {
  /** Unique job identifier */
  jobId: string;
  /** Job type */
  type: 'video';
  /** Current status */
  status: JobStatus;
  /** Progress percentage 0-100 */
  progress: number | null;
  /** Current processing stage */
  stage: JobStage | null;
  /** Job creation timestamp */
  createdAt: number;
  /** Processing start timestamp */
  startedAt: number | null;
  /** Completion timestamp */
  completedAt: number | null;
  /** Error details (only when status === 'failed') */
  error: { code: string; message: string } | null;
  /** Result data (only when status === 'completed') */
  result: JobResult | null;
}

/**
 * Options for polling a job until completion
 */
export interface PollOptions {
  /** Polling interval in milliseconds (default: 2000) */
  interval?: number;
  /** Maximum time to wait in milliseconds (default: 300000 = 5 min) */
  timeout?: number;
  /** Callback invoked on each poll with current job state */
  onProgress?: (job: JobResponse) => void;
}
```

**Step 3: Re-export from types index**

Add to `packages/sdk/src/types/index.ts`:

```typescript
export * from './jobs';
```

**Step 4: Build to verify**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/sdk build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add packages/sdk/src/types/jobs.ts packages/sdk/src/types/index.ts
git commit -m "feat(sdk): add async job types"
```

---

## Task 5: Add JobsEndpoint class to SDK

**Files:**
- Create: `packages/sdk/src/endpoints/jobs.ts`
- Modify: `packages/sdk/src/client.ts`

**Step 1: Create jobs endpoint**

Create `packages/sdk/src/endpoints/jobs.ts`:

```typescript
import { request } from '../utils/fetch';
import { buildFormData } from '../utils/form-data';
import { HypervideoError } from '../types/errors';
import type { ResolvedConfig } from '../types/common';
import type {
  SubmitJobOptions,
  SubmitJobResponse,
  JobResponse,
  PollOptions,
} from '../types/jobs';

/**
 * Async job endpoints for long-running video processing
 */
export class JobsEndpoints {
  constructor(private config: ResolvedConfig) {}

  private get headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
    };
  }

  /**
   * Submit an async video background removal job
   *
   * Returns immediately with a jobId. Use `get()` or `poll()` to check status.
   *
   * @param options - Job options (same as video.removeBackground + webhookUrl)
   * @returns Job ID and initial status
   *
   * @example
   * ```ts
   * const { jobId } = await client.jobs.submit({
   *   file: videoFile,
   *   formats: ['webm', 'stacked-alpha'],
   * });
   *
   * // Poll until complete
   * const result = await client.jobs.poll(jobId, {
   *   onProgress: (job) => console.log(`${job.progress}% - ${job.stage}`),
   * });
   * ```
   */
  async submit(options: SubmitJobOptions): Promise<SubmitJobResponse> {
    if (!options.file && !options.url && !options.inputStorageId) {
      throw new HypervideoError(
        'INVALID_REQUEST',
        "Either 'file', 'url', or 'inputStorageId' is required for jobs.submit",
      );
    }

    const formData = buildFormData(options);

    return request<SubmitJobResponse>(
      `${this.config.baseUrl}/api/v1/jobs/video/remove-background`,
      {
        method: 'POST',
        headers: this.headers,
        body: formData,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Get the current status of a job
   *
   * @param jobId - Job identifier from submit()
   * @returns Current job state including progress, stage, and result when complete
   */
  async get(jobId: string): Promise<JobResponse> {
    return request<JobResponse>(
      `${this.config.baseUrl}/api/v1/jobs/${encodeURIComponent(jobId)}`,
      {
        method: 'GET',
        headers: this.headers,
        timeout: this.config.timeout,
      }
    );
  }

  /**
   * Poll a job until it completes or fails
   *
   * @param jobId - Job identifier from submit()
   * @param options - Polling configuration
   * @returns Completed job response
   * @throws {HypervideoError} If job fails or polling times out
   *
   * @example
   * ```ts
   * const job = await client.jobs.poll(jobId, {
   *   interval: 2000,
   *   timeout: 300000,
   *   onProgress: (job) => {
   *     console.log(`Status: ${job.status}, Progress: ${job.progress}%`);
   *   },
   * });
   *
   * if (job.result) {
   *   console.log('Output URL:', job.result.outputUrl);
   * }
   * ```
   */
  async poll(jobId: string, options?: PollOptions): Promise<JobResponse> {
    const interval = options?.interval ?? 2000;
    const timeout = options?.timeout ?? 300000;
    const startTime = Date.now();

    while (true) {
      const job = await this.get(jobId);

      if (options?.onProgress) {
        options.onProgress(job);
      }

      if (job.status === 'completed') {
        return job;
      }

      if (job.status === 'failed') {
        throw new HypervideoError(
          job.error?.code ?? 'JOB_FAILED',
          job.error?.message ?? 'Job processing failed',
          undefined,
          { jobId, status: job.status }
        );
      }

      if (Date.now() - startTime > timeout) {
        throw new HypervideoError(
          'JOB_TIMEOUT',
          `Job ${jobId} did not complete within ${timeout}ms`,
          undefined,
          { jobId, timeout }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}
```

**Step 2: Wire jobs into Hypervideo client**

In `packages/sdk/src/client.ts`, add the jobs endpoint:

Add import at top:
```typescript
import { JobsEndpoints } from './endpoints/jobs';
```

Add property to class (after `video`):
```typescript
  /**
   * Async job endpoints for long-running video processing
   */
  public readonly jobs: JobsEndpoints;
```

Add initialization in constructor (after `this.video = ...`):
```typescript
    this.jobs = new JobsEndpoints(this.config);
```

**Step 3: Build to verify**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/sdk build`
Expected: Clean build.

**Step 4: Commit**

```bash
git add packages/sdk/src/endpoints/jobs.ts packages/sdk/src/client.ts
git commit -m "feat(sdk): add async jobs endpoint with submit, get, and poll"
```

---

## Task 6: Add APNG format to CLI

**Files:**
- Modify: `packages/cli/src/commands/video-bg-remove.ts`

**Step 1: Add apng to validFormats and getExtension**

In `packages/cli/src/commands/video-bg-remove.ts`:

Update line 7:
```typescript
const validFormats: VideoFormat[] = ['webm', 'mov', 'stacked-alpha', 'webp', 'apng'];
```

Add case to `getExtension` function:
```typescript
function getExtension(format: VideoFormat): string {
  switch (format) {
    case 'webm':
      return '.webm';
    case 'mov':
      return '.mov';
    case 'stacked-alpha':
      return '.mp4';
    case 'webp':
      return '.webp';
    case 'apng':
      return '.apng';
    default:
      return '.webm';
  }
}
```

**Step 2: Update default tolerance from 20 → 30**

Change line 33:
```typescript
    .option('-t, --tolerance <number>', 'Background detection tolerance (0-100)', '30')
```

**Step 3: Update quality help text to mention apng**

Change line 35:
```typescript
    .option('-q, --quality <number>', 'Quality 0-100 (default: 60, lower = smaller). Used for webp/apng.')
```

**Step 4: Build to verify**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/cli build`
Expected: Clean build.

**Step 5: Commit**

```bash
git add packages/cli/src/commands/video-bg-remove.ts
git commit -m "feat(cli): add apng format, update default tolerance to 30"
```

---

## Task 7: Add video types to shared types package

**Files:**
- Modify: `packages/types/src/index.ts`

**Step 1: Add video and job types**

Append to `packages/types/src/index.ts`:

```typescript
// Video Processing Types
export type VideoFormat = 'webm' | 'stacked-alpha' | 'webp' | 'apng' | 'mov';

export type VideoProcessingMethod = 'chromakey' | 'ai';

export interface VideoRemoveBackgroundOptions {
  tolerance?: number;
  fps?: number;
  size?: number;
  format?: VideoFormat;
  formats?: VideoFormat[];
  chromaKey?: BackgroundColor;
  quality?: number;
}

export interface VideoOutput {
  format: VideoFormat;
  url: string;
  size: number;
}

export interface VideoRemoveBackgroundResponse {
  url: string;
  format: VideoFormat;
  size: number;
  width: number;
  height: number;
  duration: number;
  frameCount: number;
  fps: number;
  processingTime: number;
  processingMethod?: VideoProcessingMethod;
  outputs?: VideoOutput[];
  detectedBackgroundColor?: BackgroundColor & { hex: string };
}

// Async Job Types
export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export type JobStage = 'loading-input' | 'processing-video' | 'uploading-outputs';

export interface JobResult {
  outputUrl: string;
  outputFormat: VideoFormat;
  outputSize: number;
  width: number;
  height: number;
  processingTimeMs: number;
  detectedBackgroundColor?: BackgroundColor & { hex: string };
  outputs: Array<{ format: VideoFormat; url: string; size: number }>;
}

export interface JobResponse {
  jobId: string;
  type: 'video';
  status: JobStatus;
  progress: number | null;
  stage: JobStage | null;
  createdAt: number;
  startedAt: number | null;
  completedAt: number | null;
  error: { code: string; message: string } | null;
  result: JobResult | null;
}
```

**Step 2: Build to verify**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/types build 2>/dev/null || echo "no build script, types-only package"`

**Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "feat(types): add video, job, and processing types"
```

---

## Task 8: Update plugin skill documentation

**Files:**
- Modify: `plugins/hypervideo/skills/hypervideo.md`

**Step 1: Update the API Endpoints section**

In `plugins/hypervideo/skills/hypervideo.md`, update the video endpoint parameters to include `apng`:

Replace the format line in the video endpoint section:
```
- `format`: Single output format (`webp`, `webm`, `stacked-alpha`, `apng`, `mov`)
```

Update Smart Processing section:
```markdown
**Smart Processing:**
- `webp`/`apng` format → Uses AI (smallest files, ~1.5MB)
- `stacked-alpha` → Uses AI (FAL Bria video model, ~15s)
- `webm`/`mov` → Uses chromakey (fastest, ~10s)
- Manual `chromaKey` → Forces chromakey (for green/blue screen)
```

**Step 2: Add APNG to Output Formats table**

```markdown
| Format | Size | Speed | Use Case |
|--------|------|-------|----------|
| **webp** | ~1.5MB | ~60s | Smallest files, all browsers, `<img>` tag |
| **apng** | ~3-5MB | ~60s | All browsers, iOS Safari native, `<img>` tag |
| **webm** | ~2MB | ~10s | Chrome, Firefox, Edge |
| **stacked-alpha** | ~8MB | ~10s | Universal with Hypervideo WebGL players |
| **mov** | ~60MB | ~10s | Safari/iOS native, Final Cut Pro |
```

**Step 3: Add Async Jobs section**

Add a new section after the API Endpoints section:

```markdown
## Async Jobs (Queue)

For long-running or large video processing, use the async job API:

### SDK
```typescript
// Submit a job (returns immediately)
const { jobId } = await client.jobs.submit({
  file: videoFile,
  formats: ['webm', 'stacked-alpha'],
});

// Poll until complete
const job = await client.jobs.poll(jobId, {
  onProgress: (j) => console.log(`${j.progress}% - ${j.stage}`),
});

console.log(job.result.outputUrl);
```

### API Endpoints
- `POST /api/v1/jobs/video/remove-background` — Submit job, returns `{ jobId, status: 'queued' }` (HTTP 202)
- `GET /api/v1/jobs/:jobId` — Poll job status, returns progress/stage/result

Job stages: `loading-input` → `processing-video` → `uploading-outputs` → `completed`
```

**Step 4: Commit**

```bash
git add plugins/hypervideo/skills/hypervideo.md
git commit -m "docs(plugin): add apng format and async jobs to skill docs"
```

---

## Task 9: Update plugin remove-bg command

**Files:**
- Modify: `plugins/hypervideo/commands/remove-bg.md`

**Step 1: Add APNG to format table**

Update the format table in `plugins/hypervideo/commands/remove-bg.md`:

```markdown
| Format | Size | Speed | Browser Support |
|--------|------|-------|-----------------|
| `webp` | Smallest (~1.5MB) | ~60s | All browsers |
| `apng` | Small (~3-5MB) | ~60s | All browsers, native `<img>` tag |
| `webm` | Small (~2MB) | ~10s | Chrome/Firefox/Edge |
| `stacked-alpha` | Small (~1MB) | ~10s | All (with WebGL player) |
| `mov` | Large (~60MB) | ~10s | All browsers |
```

**Step 2: Update format option line**

```markdown
- `-f, --format <format>`: Output format (webp, webm, stacked-alpha, apng, mov)
```

**Step 3: Update recommendations**

```markdown
4. **Format recommendations:**
   - Use `webp` for smallest file size (uses AI processing internally)
   - Use `apng` for universal browser support including iOS Safari `<img>` tag
   - Use `stacked-alpha` for fastest processing + universal playback
   - Use `webm` for fast processing + native browser support
```

**Step 4: Commit**

```bash
git add plugins/hypervideo/commands/remove-bg.md
git commit -m "docs(plugin): add apng to remove-bg command docs"
```

---

## Task 10: Build all packages and verify

**Step 1: Build everything**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm build`
Expected: All packages build successfully.

**Step 2: Verify no TypeScript errors**

Run: `cd /Users/selcukatli/Projects/hyper-video && pnpm --filter @hypervideo-dev/sdk exec tsc --noEmit`
Expected: No errors.

**Step 3: Commit any remaining changes**

If there are lockfile or generated file changes:
```bash
git add -A
git commit -m "chore: rebuild all packages"
```

---

## Summary of Changes

| Package | What Changed |
|---------|-------------|
| **SDK types** | Added `apng` to `VideoFormat`, `size` param, `processingMethod` in response, new `jobs.ts` types |
| **SDK client** | Added `JobsEndpoints` class with `submit()`, `get()`, `poll()` methods |
| **CLI** | Added `apng` format, updated default tolerance 20→30 |
| **Types package** | Added video types, job types, processing method type |
| **Plugin skill** | Added APNG format, async jobs section, updated smart processing docs |
| **Plugin command** | Added APNG to remove-bg format table and recommendations |
