---
description: Set up Hypervideo SDK and/or CLI in your project
---

# Setup Hypervideo

Initialize Hypervideo tools in the current project.

## Pre-flight Checks (REQUIRED - DO THIS FIRST)

Before taking ANY action, you MUST check what's already installed:

1. **Check CLI availability:**
   ```bash
   hypervideo --version
   ```
   Note: Command will fail if CLI is not installed - that's expected.

2. **Read package.json** to check for existing dependencies:
   - `@hypervideo-dev/sdk` - TypeScript SDK (for programmatic use in code)
   - `@hypervideo-dev/cli` - Command-line tool (for CLI commands)

3. **Search for environment files** (`.env`, `.env.local`, `.env.development`, etc.) and check if `HYPERVIDEO_API_KEY` is already set

4. **Search for existing Hypervideo client files** (e.g., `lib/hypervideo.ts`, `src/lib/hypervideo.ts`, or similar)

5. **Report findings to user AND ask what they need:**

   Present a summary like:
   - "CLI: [installed / not installed]"
   - "SDK: [installed / not installed]"
   - "API key: [configured / not configured]"
   - "Client helper: [exists at X / not found]"

   Then ask the user using AskUserQuestion:
   - **Question:** "What would you like to set up?"
   - **Options:**
     - "CLI only" - For command-line usage (background removal, video processing)
     - "SDK only" - For programmatic use in your application code
     - "Both CLI and SDK" (Recommended)

   Skip options that are already installed.

## Instructions

Only perform steps that are actually needed based on pre-flight checks AND user selection.

### Install CLI (if selected and not already installed)

The CLI enables command-line video/image processing. Check if `hypervideo --version` works. If NOT:

```bash
npm install -g @hypervideo-dev/cli
```

Then configure the API key:
```bash
hypervideo config set apiKey hv_your_key_here
```

If already installed, skip and inform the user.

### Install SDK (if selected and not already installed)

The SDK enables programmatic API access in your code. Check if `@hypervideo-dev/sdk` exists in package.json. If NOT:

```bash
npm install @hypervideo-dev/sdk
```

If already installed, skip and inform the user.

### Configure API Key in Environment (if SDK selected and not already set)

Check if `HYPERVIDEO_API_KEY` exists in any environment file. If NOT:
- Locate the appropriate env file (`.env.local` for Next.js, `.env` for Node.js)
- Add the following line:
  ```
  HYPERVIDEO_API_KEY=hv_your_key_here
  ```
- Remind user to get API key at https://app.hypervideo.dev if they don't have one

If already configured, skip and inform the user.

### Create SDK Client Helper (if SDK selected and not already exists)

Search for existing files that import from `@hypervideo-dev/sdk` and export a client. If NOT found, create one:

For **Next.js App Router** (`lib/hypervideo.ts`):
```typescript
import { Hypervideo } from '@hypervideo-dev/sdk';

if (!process.env.HYPERVIDEO_API_KEY) {
  throw new Error('HYPERVIDEO_API_KEY environment variable is required');
}

export const hypervideo = new Hypervideo({
  apiKey: process.env.HYPERVIDEO_API_KEY,
});
```

For **Node.js/Express** (`src/lib/hypervideo.ts`):
```typescript
import { Hypervideo } from '@hypervideo-dev/sdk';
import 'dotenv/config';

if (!process.env.HYPERVIDEO_API_KEY) {
  throw new Error('HYPERVIDEO_API_KEY environment variable is required');
}

export const hypervideo = new Hypervideo({
  apiKey: process.env.HYPERVIDEO_API_KEY,
});
```

If a client helper already exists, skip and inform the user of its location.

## Summary

After completing setup, provide a summary:
- What was already installed/configured (skipped)
- What was newly installed/configured
- Quick usage examples based on what was installed:
  - CLI: `hypervideo video remove-bg input.mp4 -o output.mp4`
  - SDK: Show import and basic usage
