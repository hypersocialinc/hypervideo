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

## Instructions

1. **Check if CLI is installed:**
   ```bash
   hypervideo --version
   ```

   If not installed:
   ```bash
   npm install -g @hypervideo-dev/cli
   ```

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
hypervideo video remove-bg {{input}} -o {{output}} -f stacked-alpha
```

Options:
- `-f, --format <format>`: Output format (webm, stacked-alpha, mov)
- `-t, --tolerance <number>`: Background sensitivity
- `-c, --chroma-key <color>`: Manual color for green/blue screen

4. **Recommend stacked-alpha format** for videos if user plans to play in browser:
   - WebM only works in Chrome/Firefox/Edge
   - Stacked-alpha works everywhere with Hypervideo players

5. **Check for API key** if command fails with auth error:
   ```bash
   hypervideo config set apiKey hv_your_key_here
   ```

   Get API key at: https://app.hypervideo.dev
