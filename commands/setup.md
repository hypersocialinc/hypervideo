---
description: Set up Hypervideo SDK in your project
---

# Setup Hypervideo SDK

Initialize Hypervideo SDK in the current project.

## Instructions

1. **Install the SDK:**
   ```bash
   npm install @hypervideo-dev/sdk
   ```

2. **Check for environment file** (`.env`, `.env.local`, etc.)

3. **Add API key to environment:**
   ```
   HYPERVIDEO_API_KEY=hv_your_key_here
   ```

4. **Create SDK client helper:**

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

5. **Example usage:**
   ```typescript
   import { hypervideo } from '@/lib/hypervideo';

   // Remove background from image
   const result = await hypervideo.image.removeBackground({
     file: imageFile,
   });

   // Remove background from video
   const video = await hypervideo.video.removeBackground({
     file: videoFile,
     formats: ['stacked-alpha'],
   });
   ```

6. **Remind user to get API key** at https://app.hypervideo.dev if they don't have one.
