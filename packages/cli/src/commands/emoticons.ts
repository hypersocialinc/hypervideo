import { Command } from 'commander';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { startSpinner, error, saveDataUrlToFile, formatSize, formatDuration, keyValue, info } from '../output.js';
import { formatError, createClient } from '../utils.js';

type FormatOption = 'png' | 'webp' | 'both';

const defaultSizes = [16, 24, 32, 48, 64, 96, 128, 256];

/**
 * Parse sizes from comma-separated string
 */
function parseSizes(sizesStr: string): number[] {
  const sizes = sizesStr.split(',').map(s => parseInt(s.trim(), 10));
  for (const size of sizes) {
    if (isNaN(size) || size <= 0) {
      throw new Error(`Invalid size: ${size}. Sizes must be positive numbers.`);
    }
  }
  return sizes;
}

export function createEmoticonsCommand(): Command {
  const cmd = new Command('emoticons')
    .alias('emoji')
    .description('Generate emoticon pack in multiple sizes')
    .argument('<input>', 'Input image file (should be square)')
    .option('-o, --output <dir>', 'Output directory', './emoticons')
    .option('-s, --sizes <sizes>', `Sizes to generate (comma-separated)`, defaultSizes.join(','))
    .option('-f, --format <format>', 'Output format: png, webp, both', 'both')
    .action(async (input: string, options: {
      output: string;
      sizes: string;
      format: string;
    }) => {
      // Validate input file exists
      if (!existsSync(input)) {
        error(`File not found: ${input}`);
        process.exit(1);
      }

      // Parse sizes
      let sizes: number[];
      try {
        sizes = parseSizes(options.sizes);
      } catch (err) {
        error(formatError(err));
        process.exit(1);
      }

      // Validate format
      const format = options.format as FormatOption;
      if (!['png', 'webp', 'both'].includes(format)) {
        error('Format must be one of: png, webp, both');
        process.exit(1);
      }

      const outputDir = options.output;
      const client = createClient();

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
      spinner.text = 'Generating emoticons...';
      const startTime = Date.now();

      try {
        const result = await client.image.emoticon({
          file: fileBuffer,
          sizes,
        });

        const duration = Date.now() - startTime;

        // Create output directory
        spinner.text = 'Saving files...';
        try {
          mkdirSync(outputDir, { recursive: true });
          if (format === 'both' || format === 'png') {
            mkdirSync(join(outputDir, 'png'), { recursive: true });
          }
          if (format === 'both' || format === 'webp') {
            mkdirSync(join(outputDir, 'webp'), { recursive: true });
          }
        } catch (err) {
          spinner.fail('Failed to create output directories');
          error(formatError(err));
          process.exit(1);
        }

        // Save files
        let fileCount = 0;
        for (const sizeData of result.sizes) {
          if (format === 'both' || format === 'png') {
            const pngPath = join(outputDir, 'png', `emoticon-${sizeData.size}px.png`);
            saveDataUrlToFile(sizeData.png.dataUrl, pngPath);
            fileCount++;
          }
          if (format === 'both' || format === 'webp') {
            const webpPath = join(outputDir, 'webp', `emoticon-${sizeData.size}px.webp`);
            saveDataUrlToFile(sizeData.webp.dataUrl, webpPath);
            fileCount++;
          }
        }

        spinner.succeed('Emoticons generated successfully');

        // Display results
        console.log('');
        keyValue('Output', outputDir);
        keyValue('Files', `${fileCount} files`);
        keyValue('Sizes', sizes.join(', ') + 'px');
        if (format === 'both' || format === 'png') {
          keyValue('PNG Total', formatSize(result.totalPngSize));
        }
        if (format === 'both' || format === 'webp') {
          keyValue('WebP Total', formatSize(result.totalWebpSize));
        }
        keyValue('Time', formatDuration(duration));

        // List generated files
        console.log('');
        info('Generated files:');
        for (const sizeData of result.sizes) {
          if (format === 'both' || format === 'png') {
            console.log(`  png/emoticon-${sizeData.size}px.png (${formatSize(sizeData.png.size)})`);
          }
          if (format === 'both' || format === 'webp') {
            console.log(`  webp/emoticon-${sizeData.size}px.webp (${formatSize(sizeData.webp.size)})`);
          }
        }
      } catch (err) {
        spinner.fail('Failed to generate emoticons');
        error(formatError(err));
        process.exit(1);
      }
    });

  return cmd;
}
