import { Command } from 'commander';
import { getApiKey, getBaseUrl, getConfigPath, setApiKey, maskApiKey } from './config.js';
import { formatError } from './utils.js';
import { createBgRemoveCommand } from './commands/bg-remove.js';
import { createResizeCommand } from './commands/resize.js';
import { createThumbnailCommand } from './commands/thumbnail.js';
import { createEmoticonsCommand } from './commands/emoticons.js';
import { createVideoBgRemoveCommand } from './commands/video-bg-remove.js';
import { createDetectColorCommand } from './commands/detect-color.js';

const program = new Command();

program
  .name('hypervideo')
  .description('CLI for Hypervideo media transformations')
  .version('0.1.0');

// Config command group
const configCmd = program
  .command('config')
  .description('Manage CLI configuration');

configCmd
  .command('set <api-key>')
  .description('Set your Hypervideo API key')
  .action((apiKey: string) => {
    try {
      setApiKey(apiKey);
      console.log(`API key saved to ${getConfigPath()}`);
    } catch (err) {
      console.error(`Error: ${formatError(err)}`);
      process.exit(1);
    }
  });

configCmd
  .command('get')
  .description('Show current API key (masked)')
  .action(() => {
    try {
      const apiKey = getApiKey();
      if (apiKey) {
        console.log(`API Key: ${maskApiKey(apiKey)}`);
        console.log(`Source: ${process.env.HYPERCONVERT_API_KEY ? 'environment' : 'config file'}`);
      } else {
        console.log('No API key configured');
        console.log(`Set via: HYPERCONVERT_API_KEY env or 'hypervideo config set <key>'`);
      }
    } catch (err) {
      console.error(`Error: ${formatError(err)}`);
      process.exit(1);
    }
  });

configCmd
  .command('path')
  .description('Show config file path')
  .action(() => {
    console.log(getConfigPath());
  });

configCmd
  .command('show')
  .description('Show all configuration')
  .action(() => {
    try {
      const apiKey = getApiKey();
      const baseUrl = getBaseUrl();

      console.log('Configuration:');
      console.log(`  API Key: ${maskApiKey(apiKey)}`);
      console.log(`  Base URL: ${baseUrl}`);
      console.log(`  Config File: ${getConfigPath()}`);
    } catch (err) {
      console.error(`Error: ${formatError(err)}`);
      process.exit(1);
    }
  });

// Image commands
program.addCommand(createBgRemoveCommand());
program.addCommand(createResizeCommand());
program.addCommand(createThumbnailCommand());
program.addCommand(createEmoticonsCommand());

// Video commands
program.addCommand(createVideoBgRemoveCommand());

// Utility commands
program.addCommand(createDetectColorCommand());

program.parse();
