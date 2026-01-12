import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { startSpinner, error, saveDataUrlToFile, formatSize, formatDuration, keyValue } from '../output.js';
import { isBatchPattern, runBatch, hasBatchFailures, prepareBatch } from '../batch.js';
import { formatError, getDefaultOutputPath, parseQuality, createClient, readFile } from '../utils.js';

type PresetSize = 'small' | 'medium' | 'large';

const presetSizes: Record<PresetSize, number> = {
  small: 150,
  medium: 300,
  large: 600,
};

/**
 * Parse size option - can be preset or WxH format
 */
function parseSize(sizeStr: string): { width?: number; height?: number } {
  // Check if it's a preset
  if (sizeStr in presetSizes) {
    const size = presetSizes[sizeStr as PresetSize];
    return { width: size, height: size };
  }

  // Try WxH format
  const match = sizeStr.match(/^(\d+)x(\d+)$/i);
  if (match) {
    return {
      width: parseInt(match[1], 10),
      height: parseInt(match[2], 10),
    };
  }

  // Try single number (square)
  const num = parseInt(sizeStr, 10);
  if (!isNaN(num) && num > 0) {
    return { width: num, height: num };
  }

  return {};
}

export function createThumbnailCommand(): Command {
  const cmd = new Command('thumbnail')
    .alias('thumb')
    .description('Generate a thumbnail from an image')
    .argument('<input>', 'Input image file or glob pattern (e.g., *.png)')
    .option('-o, --output <path>', 'Output file path or directory for batch')
    .option('-s, --size <size>', 'Size: small (150), medium (300), large (600), WxH, or single number', 'medium')
    .option('-q, --quality <number>', 'Output quality (1-100)', '80')
    .option('--continue', 'Continue processing on errors (batch mode)')
    .action(async (input: string, options: {
      output?: string;
      size: string;
      quality: string;
      continue?: boolean;
    }) => {
      // Parse size
      const { width, height } = parseSize(options.size);
      if (!width && !height) {
        error(`Invalid size format. Use: small, medium, large, WxH (e.g., 200x150), or a number`);
        process.exit(1);
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
          const result = await client.image.thumbnail({
            file: fileBuffer,
            width,
            height,
            quality,
          });
          const outPath = join(outputDir, `${basename(file, extname(file))}-thumb${extname(file)}`);
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
      const outputPath = options.output || getDefaultOutputPath(input, '-thumb');

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
      spinner.text = 'Generating thumbnail...';
      const startTime = Date.now();

      try {
        const result = await client.image.thumbnail({
          file: fileBuffer,
          width,
          height,
          quality,
        });

        const duration = Date.now() - startTime;

        // Save output
        spinner.text = 'Saving output...';
        saveDataUrlToFile(result.url, outputPath);

        spinner.succeed('Thumbnail generated successfully');

        // Display results
        console.log('');
        keyValue('Output', outputPath);
        keyValue('Size', formatSize(result.size));
        keyValue('Dimensions', `${result.width}x${result.height}`);
        keyValue('Time', formatDuration(duration));
      } catch (err) {
        spinner.fail('Failed to generate thumbnail');
        error(formatError(err));
        process.exit(1);
      }
    });

  return cmd;
}
