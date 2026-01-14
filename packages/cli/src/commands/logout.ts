import { Command } from 'commander';
import { existsSync, unlinkSync } from 'fs';
import { getConfigPath } from '../config.js';
import { success, error as logError, info } from '../output.js';

/**
 * Creates the logout command
 */
export function createLogoutCommand(): Command {
  return new Command('logout')
    .description('Remove saved API key and log out')
    .action(async () => {
      try {
        const configPath = getConfigPath();

        // Check if config file exists
        if (!existsSync(configPath)) {
          info('Already logged out - no config file found');
          console.log();
          info('To authenticate again, run:');
          info('  hypervideo login');
          console.log();
          process.exit(0);
        }

        // Delete the config file
        unlinkSync(configPath);

        // Success message
        console.log();
        success('✅ Successfully logged out!');
        console.log();
        info(`Config file removed: ${configPath}`);
        console.log();
        info('To authenticate again, run:');
        info('  hypervideo login');
        console.log();

        process.exit(0);
      } catch (err) {
        logError(`Failed to log out: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
