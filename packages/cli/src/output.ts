import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

/**
 * Start a spinner and return it
 */
export function startSpinner(text: string): Ora {
  return ora({
    text,
    color: 'cyan',
  }).start();
}

/**
 * Display a success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓') + ' ' + message);
}

/**
 * Display an error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗') + ' ' + message);
}

/**
 * Display a warning message
 */
export function warn(message: string): void {
  console.warn(chalk.yellow('⚠') + ' ' + message);
}

/**
 * Display an info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ') + ' ' + message);
}

/**
 * Save a base64 data URL to a file
 */
export function saveDataUrlToFile(dataUrl: string, outputPath: string): void {
  // Extract base64 data from data URL
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format - expected data:mime;base64,data');
  }

  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');

  // Ensure directory exists
  const dir = dirname(outputPath);
  if (dir && dir !== '.') {
    try {
      mkdirSync(dir, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to create directory ${dir}: ${message}`);
    }
  }

  try {
    writeFileSync(outputPath, buffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to write file ${outputPath}: ${message}`);
  }
}

/**
 * Format file size for display
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

/**
 * Format duration in milliseconds for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else {
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

/**
 * Styled output for key-value pairs
 */
export function keyValue(key: string, value: string | number): void {
  console.log(`  ${chalk.dim(key + ':')} ${value}`);
}
