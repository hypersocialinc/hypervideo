import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { startSpinner, error, saveDataUrlToFile, formatSize, formatDuration, keyValue } from '../output.js';
import { isBatchPattern, runBatch, hasBatchFailures, prepareBatch } from '../batch.js';
import { formatError, getDefaultOutputPath, parseQuality, createClient, readFile } from '../utils.js';

type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
type OutputFormat = 'jpeg' | 'png' | 'webp';

const validFitModes: FitMode[] = ['cover', 'contain', 'fill', 'inside', 'outside'];
const validFormats: OutputFormat[] = ['jpeg', 'png', 'webp'];

export function createResizeCommand(): Command {
  const cmd = new Command('resize')
    .description('Resize an image')
    .argument('<input>', 'Input image file or glob pattern (e.g., *.png)')
    .option('-o, --output <path>', 'Output file path or directory for batch')
    .option('-w, --width <number>', 'Output width in pixels')
    .option('-h, --height <number>', 'Output height in pixels')
    .option('--fit <mode>', `Fit mode: ${validFitModes.join(', ')}`, 'cover')
    .option('-f, --format <format>', `Output format: ${validFormats.join(', ')}`)
    .option('-q, --quality <number>', 'Output quality (1-100)', '80')
    .option('--continue', 'Continue processing on errors (batch mode)')
    .action(async (input: string, options: {
      output?: string;
      width?: string;
      height?: string;
      fit: string;
      format?: string;
      quality: string;
      continue?: boolean;
    }) => {
      // Validate at least one dimension
      if (!options.width && !options.height) {
        error('At least one of --width or --height is required');
        process.exit(1);
      }

      // Parse width
      let width: number | undefined;
      if (options.width) {
        width = parseInt(options.width, 10);
        if (isNaN(width) || width <= 0) {
          error('Width must be a positive number');
          process.exit(1);
        }
      }

      // Parse height
      let height: number | undefined;
      if (options.height) {
        height = parseInt(options.height, 10);
        if (isNaN(height) || height <= 0) {
          error('Height must be a positive number');
          process.exit(1);
        }
      }

      // Validate fit mode
      if (!validFitModes.includes(options.fit as FitMode)) {
        error(`Invalid fit mode. Must be one of: ${validFitModes.join(', ')}`);
        process.exit(1);
      }
      const fit = options.fit as FitMode;

      // Validate format if provided
      let format: OutputFormat | undefined;
      if (options.format) {
        if (!validFormats.includes(options.format as OutputFormat)) {
          error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
          process.exit(1);
        }
        format = options.format as OutputFormat;
      }

      // Parse quality
      let quality: number;
      try {
        quality = parseQuality(options.quality);
      } catch (err) {
        error(formatError(err));
        process.exit(1);
      }

      const client = createClient();

      // Check if batch mode
      if (isBatchPattern(input)) {
        const outputDir = options.output || '.';
        const files = prepareBatch(input, outputDir);

        const results = await runBatch(files, async (file) => {
          const fileBuffer = readFile(file);
          const result = await client.image.resize({
            file: fileBuffer,
            width,
            height,
            fit,
            format,
            quality,
          });
          const outputExt = format ? `.${format}` : extname(file);
          const outPath = join(outputDir, `${basename(file, extname(file))}-resized${outputExt}`);
          saveDataUrlToFile(result.url, outPath);
        }, { continueOnError: options.continue });

        if (hasBatchFailures(results)) {
          process.exit(1);
        }
        return;
      }

      // Single file mode
      if (!existsSync(input)) {
        error(`File not found: ${input}`);
        process.exit(1);
      }

      // Determine output path
      const outputExt = format ? `.${format}` : undefined;
      const outputPath = options.output || getDefaultOutputPath(input, '-resized', outputExt);

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
      spinner.text = 'Resizing image...';
      const startTime = Date.now();

      try {
        const result = await client.image.resize({
          file: fileBuffer,
          width,
          height,
          fit,
          format,
          quality,
        });

        const duration = Date.now() - startTime;

        // Save output
        spinner.text = 'Saving output...';
        saveDataUrlToFile(result.url, outputPath);

        spinner.succeed('Image resized successfully');

        // Display results
        console.log('');
        keyValue('Output', outputPath);
        keyValue('Size', formatSize(result.size));
        keyValue('Dimensions', `${result.width}x${result.height}`);
        keyValue('Format', result.format);
        keyValue('Time', formatDuration(duration));
      } catch (err) {
        spinner.fail('Failed to resize image');
        error(formatError(err));
        process.exit(1);
      }
    });

  return cmd;
}
