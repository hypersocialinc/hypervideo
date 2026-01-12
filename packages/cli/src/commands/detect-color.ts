import { Command } from 'commander';
import { readFileSync, existsSync } from 'fs';
import { startSpinner, error, keyValue } from '../output.js';
import { formatError, createClient } from '../utils.js';

export function createDetectColorCommand(): Command {
  const cmd = new Command('detect-color')
    .description('Detect dominant background color of an image')
    .argument('<input>', 'Input image file')
    .option('--json', 'Output as JSON')
    .action(async (input: string, options: {
      json?: boolean;
    }) => {
      // Validate input file exists
      if (!existsSync(input)) {
        error(`File not found: ${input}`);
        process.exit(1);
      }

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
      spinner.text = 'Detecting background color...';

      try {
        const result = await client.image.detectBackgroundColor({
          file: fileBuffer,
        });

        spinner.stop();

        const { backgroundColor, hex } = result;

        if (options.json) {
          // JSON output for scripting
          console.log(JSON.stringify({
            r: backgroundColor.r,
            g: backgroundColor.g,
            b: backgroundColor.b,
            hex,
          }, null, 2));
        } else {
          // Human-readable output
          console.log('');
          keyValue('Hex', hex);
          keyValue('RGB', `rgb(${backgroundColor.r}, ${backgroundColor.g}, ${backgroundColor.b})`);
          keyValue('R', backgroundColor.r.toString());
          keyValue('G', backgroundColor.g.toString());
          keyValue('B', backgroundColor.b.toString());
        }
      } catch (err) {
        spinner.fail('Failed to detect background color');
        error(formatError(err));
        process.exit(1);
      }
    });

  return cmd;
}
