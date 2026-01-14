import { Command } from 'commander';
import http from 'http';
import { createInterface } from 'readline';
import open from 'open';
import { setApiKey, getConfigPath } from '../config.js';
import { success, error as logError, info } from '../output.js';

const API_KEY_REGEX = /^hc_[A-Za-z0-9]{32}$/;
const WEB_APP_URL = process.env.HYPERVIDEO_WEB_URL || 'https://www.hypervideo.dev';
const START_PORT = 8472;
const END_PORT = 8499;
const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

interface CallbackResult {
  success: boolean;
  key?: string;
  error?: string;
}

/**
 * Validates API key format
 */
function validateApiKey(key: string): boolean {
  return API_KEY_REGEX.test(key);
}

/**
 * Waits for user to press Enter
 */
function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Starts local HTTP server to receive API key from web app
 */
function startLocalServer(): Promise<{
  port: number;
  promise: Promise<CallbackResult>;
  server: http.Server;
}> {
  return new Promise((resolve, reject) => {
    let callbackResolve: (result: CallbackResult) => void;
    const callbackPromise = new Promise<CallbackResult>((res) => {
      callbackResolve = res;
    });

    let serverStarted = false;

    const tryPort = (port: number) => {
      if (port > END_PORT) {
        reject(new Error('No available ports in range 8472-8499'));
        return;
      }

      const server = http.createServer((req, res) => {
        // Only accept localhost connections
        const remoteAddr = req.socket.remoteAddress;
        if (remoteAddr !== '127.0.0.1' && remoteAddr !== '::1' && remoteAddr !== '::ffff:127.0.0.1') {
          res.writeHead(403, { 'Content-Type': 'text/plain' });
          res.end('Forbidden');
          return;
        }

        // Parse query params
        const url = new URL(req.url || '', `http://localhost:${port}`);
        const key = url.searchParams.get('key');
        const successParam = url.searchParams.get('success');

        if (successParam === 'true' && key) {
          // Send success HTML response
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Authentication Successful - Hypervideo CLI</title>
                <meta charset="utf-8">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 100vh;
                    margin: 0;
                    background: #08080c;
                    color: #ffffff;
                  }
                  .container {
                    text-align: center;
                    max-width: 400px;
                    padding: 40px;
                  }
                  .icon {
                    font-size: 64px;
                    margin-bottom: 20px;
                  }
                  h1 {
                    font-size: 24px;
                    margin-bottom: 12px;
                    font-weight: 600;
                  }
                  p {
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 14px;
                    line-height: 1.6;
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">✅</div>
                  <h1>Authentication Successful!</h1>
                  <p>Your CLI has been authenticated. You can close this window and return to your terminal.</p>
                </div>
              </body>
            </html>
          `);

          // Resolve callback with key
          callbackResolve({ success: true, key });

          // Close server after response
          setTimeout(() => {
            server.close();
          }, 100);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Bad Request');
        }
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
          // Port in use, try next port
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });

      server.listen(port, '127.0.0.1', () => {
        if (!serverStarted) {
          serverStarted = true;
          resolve({
            port,
            promise: callbackPromise,
            server,
          });
        }
      });
    };

    tryPort(START_PORT);
  });
}

/**
 * Waits for callback result with timeout
 */
function waitForCallback(
  promise: Promise<CallbackResult>,
  timeoutMs: number,
): Promise<{ result: CallbackResult; timeoutId: NodeJS.Timeout }> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<CallbackResult>((resolve) => {
    timeoutId = setTimeout(() => {
      resolve({
        success: false,
        error: `Timeout: No response received within ${timeoutMs / 1000 / 60} minutes`,
      });
    }, timeoutMs);
  });

  return Promise.race([
    promise.then(result => ({ result, timeoutId: timeoutId! })),
    timeoutPromise.then(result => ({ result, timeoutId: timeoutId! })),
  ]);
}

/**
 * Creates the login command
 */
export function createLoginCommand(): Command {
  return new Command('login')
    .description('Authenticate via browser and retrieve API key')
    .action(async () => {
      try {
        // Start local server
        info('Starting local server...');
        const { port, promise, server } = await startLocalServer();
        info(`Server started on http://localhost:${port}`);

        // Prompt user to press Enter
        console.log();
        info('🌐 Press Enter to open browser...');
        await waitForEnter();

        // Open browser
        const authUrl = `${WEB_APP_URL}/cli-auth?port=${port}`;
        info('Opening browser...');
        await open(authUrl);

        // Wait for callback
        console.log();
        info('⏳ Waiting for authentication...');
        info('(Complete the authentication in your browser)');
        console.log();

        const { result, timeoutId } = await waitForCallback(promise, TIMEOUT_MS);

        // Clear timeout and close server
        clearTimeout(timeoutId);
        server.close();

        if (!result.success) {
          logError(result.error || 'Authentication failed');
          console.log();
          info('Please try again or set your API key manually:');
          info(`  hypervideo config set <your-key>`);
          console.log();
          info(`Get your API key at: ${WEB_APP_URL}/playground`);
          process.exit(1);
        }

        // Validate key format
        if (!result.key || !validateApiKey(result.key)) {
          logError('Invalid API key format received');
          process.exit(1);
        }

        // Save key
        setApiKey(result.key);

        // Success message
        console.log();
        success('✅ Successfully authenticated!');
        console.log();
        info(`API key saved to ${getConfigPath()}`);
        console.log();
        info('You can now run commands like:');
        info('  hypervideo bg-remove input.png');
        info('  hypervideo video:bg-remove input.mp4 -f stacked-alpha');
        console.log();

        // Exit cleanly
        process.exit(0);
      } catch (err) {
        logError(`Failed to start authentication flow: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
