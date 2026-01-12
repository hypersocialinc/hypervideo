# @hypervideo/cli

Command-line interface for [Hypervideo API](https://api.hypervideo.dev/docs) - generate and play transparent videos, everywhere.

## Features

- **Image transformations**: Resize, thumbnail, background removal, emoticon generation
- **Video transformations**: Background removal with multi-format output
- **Color detection**: Detect dominant background color
- **Scriptable**: JSON output for automation and AI agents
- **Cross-platform**: Works on macOS, Linux, and Windows

## Installation

```bash
npm install -g @hypervideo/cli
# or
pnpm add -g @hypervideo/cli
# or
yarn global add @hypervideo/cli
```

## Quick Start

```bash
# Set your API key (stored in ~/.hypervideo/config.json)
hypervideo config set YOUR_API_KEY

# Remove background from an image
hypervideo bg-remove photo.png

# Resize an image
hypervideo resize large-image.jpg -w 800 -h 600

# Generate thumbnails
hypervideo thumbnail product.png --size medium

# Generate emoticon pack
hypervideo emoticons mascot.png -o ./emoticons

# Remove background from video
hypervideo video:bg-remove animation.mp4

# Detect background color
hypervideo detect-color image.png
```

## Configuration

### Setting API Key

The CLI uses your Hypervideo API key for authentication. Set it using one of these methods:

**Option 1: Environment variable** (recommended for CI/CD)
```bash
export HYPERVIDEO_API_KEY=your-api-key
```

**Option 2: Config command**
```bash
hypervideo config set your-api-key
```

### Config Commands

```bash
# Set API key
hypervideo config set <api-key>

# Show current API key (masked)
hypervideo config get

# Show config file path
hypervideo config path

# Show all configuration
hypervideo config show
```

## Commands

### bg-remove - Remove Image Background

Remove background from an image using automatic edge detection or manual chroma key.

```bash
hypervideo bg-remove <input> [options]
```

**Options:**
- `-o, --output <path>` - Output file path (default: `<input>-nobg.png`)
- `-t, --tolerance <number>` - Background detection tolerance, 0-100 (default: 20)
- `-c, --chroma-key <hex>` - Manual background color in hex (e.g., `#00FF00`)

**Examples:**
```bash
# Auto-detect and remove background
hypervideo bg-remove photo.png

# Save to specific location
hypervideo bg-remove photo.png -o result.png

# More aggressive background removal
hypervideo bg-remove photo.png -t 40

# Green screen removal
hypervideo bg-remove greenscreen.png -c "#00FF00"
```

### resize - Resize Image

Resize an image to specific dimensions.

```bash
hypervideo resize <input> [options]
```

**Options:**
- `-o, --output <path>` - Output file path
- `-w, --width <number>` - Target width in pixels
- `-h, --height <number>` - Target height in pixels
- `--fit <mode>` - Fit mode: `cover`, `contain`, `fill`, `inside`, `outside` (default: cover)
- `-f, --format <type>` - Output format: `jpeg`, `png`, `webp`
- `-q, --quality <number>` - Output quality, 1-100

**Examples:**
```bash
# Resize to specific width (height auto-calculated)
hypervideo resize large.jpg -w 800

# Resize with both dimensions
hypervideo resize large.jpg -w 1920 -h 1080

# Convert to WebP with quality
hypervideo resize photo.png -w 800 -f webp -q 85

# Contain within dimensions (letterbox)
hypervideo resize banner.jpg -w 1200 -h 400 --fit contain
```

### thumbnail / thumb - Generate Thumbnail

Generate web-optimized thumbnails with preset or custom sizes.

```bash
hypervideo thumbnail <input> [options]
hypervideo thumb <input> [options]  # alias
```

**Options:**
- `-o, --output <path>` - Output file path
- `-s, --size <size>` - Size preset or custom dimensions:
  - `small` - 150px
  - `medium` - 300px
  - `large` - 600px
  - `WxH` - Custom dimensions (e.g., `400x300`)
  - Single number - Square dimensions (e.g., `256`)
- `-q, --quality <number>` - Output quality, 1-100

**Examples:**
```bash
# Medium thumbnail
hypervideo thumb product.jpg --size medium

# Custom dimensions
hypervideo thumb product.jpg --size 400x300

# Square thumbnail
hypervideo thumb avatar.png --size 128

# High quality thumbnail
hypervideo thumb hero.jpg --size large -q 90
```

### emoticons / emoji - Generate Emoticon Pack

Generate multi-size emoticon packs for web applications.

```bash
hypervideo emoticons <input> [options]
hypervideo emoji <input> [options]  # alias
```

**Options:**
- `-o, --output <path>` - Output directory (default: `./emoticons`)
- `-s, --sizes <sizes>` - Comma-separated sizes (default: 16,24,32,48,64,96,128,256)
- `-f, --format <type>` - Output format: `png`, `webp`, `both` (default: both)

**Examples:**
```bash
# Generate all default sizes
hypervideo emoji mascot.png

# Custom output directory
hypervideo emoji mascot.png -o ./assets/mascot

# Specific sizes only
hypervideo emoji mascot.png -s 32,64,128

# PNG only
hypervideo emoji mascot.png -f png
```

**Output Structure:**
```
emoticons/
├── png/
│   ├── emoticon-16px.png
│   ├── emoticon-24px.png
│   └── ...
└── webp/
    ├── emoticon-16px.webp
    ├── emoticon-24px.webp
    └── ...
```

### video:bg-remove - Remove Video Background

Remove background from video files.

```bash
hypervideo video:bg-remove <input> [options]
```

**Options:**
- `-o, --output <path>` - Output file path
- `-f, --format <type>` - Output format:
  - `webm` - VP9 with alpha (default, Chrome/Firefox/Edge)
  - `mov` - ProRes 4444 (Safari compatible, large files)
  - `stacked-alpha` - H.264 RGB+Alpha stacked (requires WebGL player)
  - `webp` - Animated WebP
- `-t, --tolerance <number>` - Background detection tolerance, 0-100 (default: 20)
- `--fps <number>` - Frames per second, 1-60 (default: 24)
- `-c, --chroma-key <hex>` - Manual background color in hex

**Examples:**
```bash
# Auto-detect and remove background
hypervideo video:bg-remove animation.mp4

# Safari-compatible output
hypervideo video:bg-remove animation.mp4 -f mov

# Stacked alpha for web playback
hypervideo video:bg-remove animation.mp4 -f stacked-alpha

# Green screen removal
hypervideo video:bg-remove greenscreen.mp4 -c "#00FF00"

# Lower FPS for smaller file
hypervideo video:bg-remove animation.mp4 --fps 15
```

### detect-color - Detect Background Color

Detect the dominant background color of an image.

```bash
hypervideo detect-color <input> [options]
```

**Options:**
- `--json` - Output as JSON (for scripting)

**Examples:**
```bash
# Human-readable output
hypervideo detect-color photo.png
# Output:
#   Hex: #E92FBC
#   RGB: rgb(233, 47, 188)
#   R: 233
#   G: 47
#   B: 188

# JSON output for scripting
hypervideo detect-color photo.png --json
# Output: {"r":233,"g":47,"b":188,"hex":"#E92FBC"}

# Use in scripts
COLOR=$(hypervideo detect-color photo.png --json | jq -r '.hex')
echo "Background color: $COLOR"
```

## Batch Processing

Process multiple files at once using glob patterns or directories.

### Glob Patterns

```bash
# Remove background from all PNG files
hypervideo bg-remove "*.png" -o ./processed

# Resize all images in a directory
hypervideo resize "./images/*" -w 800 -o ./resized

# Generate thumbnails from all JPEG files
hypervideo thumb "*.jpg" --size medium -o ./thumbs
```

### Batch Options

- `--output <dir>` - Output directory for processed files (required for batch)
- `--continue` - Continue processing on errors instead of stopping

### Batch Output

During batch processing, the CLI shows progress:
```
Processing 5 files...

  [1/5] photo1.png... done
  [2/5] photo2.png... done
  [3/5] photo3.png... FAILED
    Error: API rate limit exceeded
  [4/5] photo4.png... done
  [5/5] photo5.png... done

Completed: 4 succeeded, 1 failed
```

### Examples

```bash
# Process all files, stop on first error (default)
hypervideo bg-remove "*.png" -o ./output

# Process all files, continue on errors
hypervideo bg-remove "*.png" -o ./output --continue

# Process directory of images
hypervideo resize ./photos -w 1920 -o ./resized
```

## Exit Codes

- `0` - Success
- `1` - Error (invalid arguments, file not found, API error, etc.)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `HYPERVIDEO_API_KEY` | API key for authentication (takes priority over config file) |
| `HYPERVIDEO_BASE_URL` | Custom API base URL (for development) |

## AI Agent Usage

The CLI is designed for use by AI agents and automation scripts:

```bash
# Detect color and use result
hypervideo detect-color image.png --json | jq '.hex'

# Process multiple files
for f in *.png; do
  hypervideo bg-remove "$f" -o "processed/$f"
done

# Batch resize
find . -name "*.jpg" -exec hypervideo resize {} -w 800 \;
```

## Related Packages

- [@hypervideo-dev/sdk](https://www.npmjs.com/package/@hypervideo-dev/sdk) - TypeScript SDK
- [@hypervideo/react](https://www.npmjs.com/package/@hypervideo/react) - React components (including WebGL video player)

## API Documentation

- **Playground**: https://app.hypervideo.dev
- **API Docs**: https://api.hypervideo.dev/docs
- **OpenAPI Spec**: https://api.hypervideo.dev/docs.json

## License

MIT
