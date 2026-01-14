import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CONFIG_DIR = join(homedir(), '.hypervideo');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  apiKey?: string;
  baseUrl?: string;
}

function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    try {
      mkdirSync(CONFIG_DIR, { recursive: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to create config directory at ${CONFIG_DIR}: ${message}`);
    }
  }
}

function readConfigFile(): Config {
  if (!existsSync(CONFIG_FILE)) {
    return {};
  }

  // Read file - throw on permission/IO errors (these are unexpected)
  let content: string;
  try {
    content = readFileSync(CONFIG_FILE, 'utf-8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read config file at ${CONFIG_FILE}: ${message}`);
  }

  // Parse JSON - warn and fallback on corrupt config (user can fix by re-setting)
  try {
    return JSON.parse(content) as Config;
  } catch {
    console.error(`Warning: Config file at ${CONFIG_FILE} is corrupted and could not be parsed.`);
    console.error('Run "hypervideo config set <api-key>" to create a new config file.');
    return {};
  }
}

function writeConfigFile(config: Config): void {
  ensureConfigDir();
  try {
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to write config file at ${CONFIG_FILE}: ${message}`);
  }
}

/**
 * Get API key from environment variable or config file
 * Priority: HYPERVIDEO_API_KEY env > ~/.hypervideo/config.json
 */
export function getApiKey(): string | undefined {
  // First check environment variable
  const envKey = process.env.HYPERVIDEO_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  // Fallback to config file
  const config = readConfigFile();
  if (config.apiKey && config.apiKey.trim().length > 0) {
    return config.apiKey.trim();
  }

  return undefined;
}

/**
 * Get base URL from environment or config, with default fallback
 */
export function getBaseUrl(): string {
  const envUrl = process.env.HYPERVIDEO_API_URL;
  if (envUrl) {
    return envUrl;
  }

  const config = readConfigFile();
  return config.baseUrl || 'https://api.hypervideo.dev';
}

/**
 * Save API key to config file
 */
export function setApiKey(apiKey: string): void {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API key cannot be empty');
  }
  const config = readConfigFile();
  config.apiKey = apiKey.trim();
  writeConfigFile(config);
}

/**
 * Get the config file path (for display purposes)
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Validate that we have an API key, throw if not
 */
export function requireApiKey(): string {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error(
      `No API key found. Authenticate with:\n` +
      `  hypervideo login\n\n` +
      `Or set manually:\n` +
      `  hypervideo config set <api-key>`
    );
  }
  return apiKey;
}

/**
 * Mask API key for display - shows first 4 and last 4 chars only if long enough
 */
export function maskApiKey(apiKey: string | undefined): string {
  if (!apiKey) return '(not set)';
  return apiKey.length > 8
    ? apiKey.slice(0, 4) + '****' + apiKey.slice(-4)
    : '****' + apiKey.slice(-2);
}
