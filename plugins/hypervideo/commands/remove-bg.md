---
description: Remove background from image or video using Hypervideo
arguments:
  - name: input
    description: Path to input file (image or video)
    required: true
  - name: output
    description: Output path (optional, defaults to input-transparent.ext)
    required: false
---

# Remove Background

Remove background from an image or video file using the Hypervideo CLI.

## Pre-flight Check (REQUIRED)

**Check if CLI is installed FIRST:**
```bash
hypervideo --version
```

If NOT installed:
- Inform user: "Hypervideo CLI is not installed. It's required for background removal."
- Ask user if they want to install it
- If yes, install and configure:
  ```bash
  npm install -g @hypervideo-dev/cli
  hypervideo config set apiKey hv_your_key_here
  ```
- Get API key at: https://app.hypervideo.dev

If already installed, proceed to instructions.

## Instructions

2. **Detect file type** from the input path extension:
   - Image: `.png`, `.jpg`, `.jpeg`, `.webp`
   - Video: `.mp4`, `.mov`, `.webm`, `.avi`

3. **Run the appropriate command:**

### For Images
```bash
hypervideo image remove-bg {{input}} -o {{output}}
```

Options:
- `-t, --tolerance <number>`: Background sensitivity (0-100, default: 20)
- `-c, --chroma-key <color>`: Manual color as hex (#00FF00) or RGB

### For Videos
```bash
hypervideo video remove-bg {{input}} -o {{output}} -f webp
```

**Format options:**
| Format | Size | Speed | Browser Support |
|--------|------|-------|-----------------|
| `webp` | Smallest (~1.5MB) | ~60s | All browsers |
| `webm` | Small (~2MB) | ~10s | Chrome/Firefox/Edge |
| `stacked-alpha` | Small (~1MB) | ~10s | All (with WebGL player) |
| `mov` | Large (~60MB) | ~10s | All browsers |

Options:
- `-f, --format <format>`: Output format (webp, webm, stacked-alpha, mov)
- `-q, --quality <number>`: WebP quality 0-100 (default: 60, lower = smaller)
- `-t, --tolerance <number>`: Background sensitivity (for webm/mov/stacked)
- `-c, --chroma-key <color>`: Manual color for green/blue screen (forces chromakey)

4. **Format recommendations:**
   - Use `webp` for smallest file size (uses AI processing internally)
   - Use `stacked-alpha` for fastest processing + universal playback
   - Use `webm` for fast processing + native browser support

5. **If command fails with auth error**, the API key may not be configured:
   ```bash
   hypervideo config set apiKey hv_your_key_here
   ```
   Get API key at: https://app.hypervideo.dev
