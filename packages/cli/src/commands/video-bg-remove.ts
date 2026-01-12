import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import type { VideoFormat } from '@hypervideo-dev/sdk';
import { startSpinner, error, saveDataUrlToFile, formatSize, formatDuration, keyValue } from '../output.js';
import { formatError, parseTolerance, parseChromaKey, getDefaultOutputPath, createClient } from '../utils.js';

const validFormats: VideoFormat[] = ['webm', 'mov', 'stacked-alpha', 'webp'];

/**
 * Get file extension for format
 */
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
    default:
      return '.webm';
  }
}

export function createVideoBgRemoveCommand(): Command {
  const cmd = new Command('video:bg-remove')
    .description('Remove background from a video')
    .argument('<input>', 'Input video file')
    .option('-o, --output <path>', 'Output file path')
    .option('-f, --format <format>', `Output format: ${validFormats.join(', ')}`, 'webm')
    .option('-t, --tolerance <number>', 'Background detection tolerance (0-100)', '20')
    .option('--fps <number>', 'Frames per second (1-60)', '24')
    .option('-c, --chroma-key <hex>', 'Manual background color in hex (e.g., #00FF00)')
    .action(async (input: string, options: {
      output?: string;
      format: string;
      tolerance: string;
      fps: string;
      chromaKey?: string;
    }) => {
      // Validate input file exists
      if (!existsSync(input)) {
        error(`File not found: ${input}`);
        process.exit(1);
      }

      // Validate format
      if (!validFormats.includes(options.format as VideoFormat)) {
        error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
        process.exit(1);
      }
      const format = options.format as VideoFormat;

      // Parse tolerance
      let tolerance: number;
      try {
        tolerance = parseTolerance(options.tolerance);
      } catch (err) {
        error(formatError(err));
        process.exit(1);
      }

      // Parse FPS
      const fps = parseInt(options.fps, 10);
      if (isNaN(fps) || fps < 1 || fps > 60) {
        error('FPS must be a number between 1 and 60');
        process.exit(1);
      }

      // Parse chroma key if provided
      let chromaKey: { r: number; g: number; b: number } | undefined;
      try {
        chromaKey = parseChromaKey(options.chromaKey);
      } catch (err) {
        error(formatError(err));
        process.exit(1);
      }

      // Determine output path
      const outputPath = options.output || getDefaultOutputPath(input, '-nobg', getExtension(format));

      // Create SDK client with extended timeout for video
      const client = createClient({ timeout: 300000 });

      // Read input file
      const spinner = startSpinner('Reading input file...');
      let fileBuffer: Buffer;
      try {
        fileBuffer = readFileSync(input);
      } catch (err) {
        spinner.fail('Failed to read input file');
        error(formatError(err));
        process.exit(1);
      }

      // Call API
      spinner.text = 'Removing background (this may take a while)...';
      const startTime = Date.now();

      try {
        const result = await client.video.removeBackground({
          file: fileBuffer,
          format,
          tolerance,
          fps,
          chromaKey,
        });

        const duration = Date.now() - startTime;

        // Save output
        spinner.text = 'Saving output...';
        saveDataUrlToFile(result.url, outputPath);

        spinner.succeed('Background removed successfully');

        // Display results
        console.log('');
        keyValue('Output', outputPath);
        keyValue('Size', formatSize(result.size));
        keyValue('Dimensions', `${result.width}x${result.height}`);
        keyValue('Duration', `${result.duration.toFixed(2)}s`);
        keyValue('Frames', `${result.frameCount} @ ${result.fps}fps`);
        keyValue('Format', result.format);
        keyValue('Processing', formatDuration(duration));
        if (result.detectedBackgroundColor) {
          keyValue('Detected BG', result.detectedBackgroundColor.hex);
        }
      } catch (err) {
        spinner.fail('Failed to remove background');
        error(formatError(err));
        process.exit(1);
      }
    });

  return cmd;
}
