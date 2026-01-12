import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { basename, extname, join } from 'path';
import { startSpinner, error, saveDataUrlToFile, formatSize, formatDuration, keyValue } from '../output.js';
import { isBatchPattern, runBatch, hasBatchFailures, prepareBatch } from '../batch.js';
import { formatError, getDefaultOutputPath, parseTolerance, parseChromaKey, createClient, readFile } from '../utils.js';

export function createBgRemoveCommand(): Command {
  const cmd = new Command('bg-remove')
    .description('Remove background from an image')
    .argument('<input>', 'Input image file or glob pattern (e.g., *.png)')
    .option('-o, --output <path>', 'Output file path or directory for batch')
    .option('-t, --tolerance <number>', 'Background detection tolerance (0-100)', '20')
    .option('-c, --chroma-key <hex>', 'Manual background color in hex (e.g., #00FF00)')
    .option('--continue', 'Continue processing on errors (batch mode)')
    .action(async (input: string, options: {
      output?: string;
      tolerance: string;
      chromaKey?: string;
      continue?: boolean;
    }) => {
      // Parse tolerance
      let tolerance: number;
      try {
        tolerance = parseTolerance(options.tolerance);
      } catch (err) {
        error(formatError(err));
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

      const client = createClient();

      // Check if batch mode
      if (isBatchPattern(input)) {
        const outputDir = options.output || '.';
        const files = prepareBatch(input, outputDir);

        const results = await runBatch(files, async (file) => {
          const fileBuffer = readFile(file);
          const result = await client.image.removeBackground({
            file: fileBuffer,
            tolerance,
            chromaKey,
          });
          const outPath = join(outputDir, `${basename(file, extname(file))}-nobg.png`);
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
      const outputPath = options.output || getDefaultOutputPath(input, '-nobg', '.png');

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
      spinner.text = 'Removing background...';
      const startTime = Date.now();

      try {
        const result = await client.image.removeBackground({
          file: fileBuffer,
          tolerance,
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
        keyValue('Time', formatDuration(duration));
        if (result.detectedColor) {
          keyValue('Detected BG', result.detectedColor.hex);
        }
      } catch (err) {
        spinner.fail('Failed to remove background');
        error(formatError(err));
        process.exit(1);
      }
    });

  return cmd;
}
