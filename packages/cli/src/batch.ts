import { existsSync, statSync, readdirSync, mkdirSync } from 'fs';
import { basename, dirname, join, extname } from 'path';
import { info, warn, success, error as errorLog } from './output.js';

/**
 * Result of processing a single file in batch mode
 * Uses discriminated union for type-safe success/error handling
 */
export type BatchResult =
  | { input: string; success: true; output?: string }
  | { input: string; success: false; error: string };

/**
 * Options for batch processing
 */
export interface BatchOptions {
  /** Continue processing on error */
  continueOnError?: boolean;
}

/**
 * Safely check if a path is a file
 */
function isFile(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * Safely check if a path is a directory
 */
function isDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Expand glob pattern or directory to list of files
 * Supports: *.png, **\/*.jpg, path/to/dir/
 * Returns { files, skipped } to report any access issues
 */
export function expandGlob(pattern: string): { files: string[]; skipped: number } {
  let skipped = 0;

  // Check if it's a single file
  if (isFile(pattern)) {
    return { files: [pattern], skipped: 0 };
  }

  // Check if it's a directory - get all files
  if (isDirectory(pattern)) {
    let entries: string[];
    try {
      entries = readdirSync(pattern);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to read directory ${pattern}: ${message}`);
    }
    const files: string[] = [];
    for (const f of entries) {
      const fullPath = join(pattern, f);
      try {
        if (statSync(fullPath).isFile()) {
          files.push(fullPath);
        }
      } catch {
        skipped++;
      }
    }
    return { files: files.sort(), skipped };
  }

  // Simple glob expansion for *.ext patterns
  const dir = dirname(pattern);
  const patternBase = basename(pattern);

  if (!existsSync(dir)) {
    return { files: [], skipped: 0 };
  }

  // Convert glob pattern to regex
  const regexPattern = patternBase
    .replace(/\./g, '\\.')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}$`, 'i');

  let dirEntries: string[];
  try {
    dirEntries = readdirSync(dir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read directory ${dir}: ${message}`);
  }

  const matchingFiles: string[] = [];
  for (const f of dirEntries) {
    if (!regex.test(f)) continue;
    const fullPath = join(dir, f);
    try {
      if (statSync(fullPath).isFile()) {
        matchingFiles.push(fullPath);
      }
    } catch {
      skipped++;
    }
  }

  return { files: matchingFiles.sort(), skipped };
}

/**
 * Check if input looks like a batch pattern
 */
export function isBatchPattern(input: string): boolean {
  // Contains glob characters
  if (input.includes('*') || input.includes('?')) {
    return true;
  }

  // Is a directory (using safe check)
  if (isDirectory(input)) {
    return true;
  }

  return false;
}

/**
 * Generate output path for a file in batch mode
 */
export function getBatchOutputPath(
  inputPath: string,
  outputDir: string,
  suffix: string,
  extension?: string
): string {
  const ext = extension || extname(inputPath);
  const base = basename(inputPath, extname(inputPath));
  return join(outputDir, `${base}${suffix}${ext}`);
}

/**
 * Run batch processing with progress display
 */
export async function runBatch<T>(
  files: string[],
  processor: (file: string, index: number, total: number) => Promise<T>,
  options: BatchOptions = {}
): Promise<BatchResult[]> {
  const results: BatchResult[] = [];
  const total = files.length;
  let successCount = 0;
  let errorCount = 0;

  info(`Processing ${total} file${total === 1 ? '' : 's'}...`);
  console.log('');

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const num = i + 1;

    process.stdout.write(`  [${num}/${total}] ${basename(file)}...`);

    try {
      await processor(file, i, total);
      results.push({ input: file, success: true });
      successCount++;
      process.stdout.write(' done\n');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      results.push({ input: file, success: false, error: errorMessage });
      errorCount++;
      process.stdout.write(' FAILED\n');

      if (!options.continueOnError) {
        errorLog(`Error: ${errorMessage}`);
        errorLog('Use --continue to continue processing on errors');
        break;
      } else {
        warn(`  Error: ${errorMessage}`);
      }
    }
  }

  console.log('');

  // Summary
  if (errorCount === 0) {
    success(`Completed: ${successCount} file${successCount === 1 ? '' : 's'} processed`);
  } else {
    warn(`Completed: ${successCount} succeeded, ${errorCount} failed`);
  }

  return results;
}

/**
 * Check if batch results contain any failures
 */
export function hasBatchFailures(results: BatchResult[]): boolean {
  return results.some(r => !r.success);
}

/**
 * Prepare batch mode: expand glob, validate files, ensure output directory exists
 * Returns files array or exits on error
 */
export function prepareBatch(
  pattern: string,
  outputDir: string
): string[] {
  const { files, skipped } = expandGlob(pattern);

  if (files.length === 0) {
    errorLog(`No files match pattern: ${pattern}`);
    process.exit(1);
  }

  if (skipped > 0) {
    warn(`Skipped ${skipped} file${skipped === 1 ? '' : 's'} due to access errors`);
  }

  if (!existsSync(outputDir)) {
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errorLog(`Failed to create output directory ${outputDir}: ${message}`);
      process.exit(1);
    }
  }

  return files;
}
