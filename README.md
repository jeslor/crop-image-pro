# Crop Image Pro

<p align="center">
  <img src="sample.gif" width="fit" />
</p>

Professional image cropping library with HEIC support, compression, and easy integration. Framework-agnostic vanilla JavaScript/TypeScript solution that works seamlessly with any web application.

## Features

✅ **Framework Agnostic** - Works with vanilla JS, React, Vue, Angular, Svelte, or any other framework  
✅ **HEIC Support** - Automatically converts HEIC/HEIF images to JPEG  
✅ **Image Compression** - Built-in compression to reduce file sizes  
✅ **Aspect Ratio Control** - Lock or unlock aspect ratios  
✅ **Zoom & Rotate** - Full image transformation controls  
✅ **TypeScript Support** - Full type definitions included  
✅ **Responsive Design** - Mobile-friendly with touch support  
✅ **Accessible** - ARIA labels and keyboard navigation  
✅ **Dark Mode Ready** - Automatic dark mode support  
✅ **Zero Dependencies** (except heic2any for HEIC conversion)

## Installation

```bash
npm install crop-image-pro
```

or

```bash
yarn add crop-image-pro
```

## Quick Start

### Basic Usage (Vanilla JavaScript)

```javascript
import CropImagePro from "crop-image-pro";
// CSS is automatically embedded - no need to import separately!
// Optional: import "crop-image-pro/css" if you prefer external CSS

// Get file from input
const fileInput = document.getElementById("file-input");
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];

  if (file) {
    const cropper = new CropImagePro(file, "my-image", {
      aspectRatio: 1, // Square crop
      maxOutputSize: 1200,
      compressionQuality: 0.7,
    });

    try {
      const result = await cropper.open();

      // Use the cropped image
      console.log("Cropped file:", result.file);
      console.log("Preview URL:", result.previewUrl);

      // Display preview
      const img = document.createElement("img");
      img.src = result.previewUrl;
      document.body.appendChild(img);

      // Upload to server
      const formData = new FormData();
      formData.append("image", result.file);
      await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      console.log("User cancelled or error occurred:", error);
    }
  }
});
```

### HTML Setup

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Crop Image Pro Demo</title>
    <!-- CSS is embedded automatically, but you can also use standalone: -->
    <!-- <link rel="stylesheet" href="node_modules/crop-image-pro/dist/cropImagePro.css" /> -->
  </head>
  <body>
    <input type="file" id="file-input" accept="image/*,.heic" />

    <script type="module">
      import CropImagePro from "./node_modules/crop-image-pro/dist/cropImagePro.js";

      // Your code here
    </script>
  </body>
</html>
```

### React Integration

```jsx
import React, { useState } from "react";
import CropImagePro from "crop-image-pro";
// CSS is embedded - no import needed!

function ImageUploader() {
  const [preview, setPreview] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];

    if (file) {
      const cropper = new CropImagePro(file, "profile-picture", {
        aspectRatio: 1,
        maxOutputSize: 800,
      });

      try {
        const result = await cropper.open();
        setPreview(result.previewUrl);

        // Upload to server
        // await uploadImage(result.file);
      } catch (error) {
        console.log("Cancelled");
      }
    }
  };

  return (
    <div>
      <input type="file" accept="image/*,.heic" onChange={handleFileChange} />
      {preview && <img src={preview} alt="Preview" />}
    </div>
  );
}
```

### Vue Integration

```vue
<template>
  <div>
    <input type="file" accept="image/*,.heic" @change="handleFileChange" />
    <img v-if="preview" :src="preview" alt="Preview" />
  </div>
</template>

<script setup>
import { ref } from "vue";
import CropImagePro from "crop-image-pro";
import "crop-image-pro/css";

const preview = ref(null);

const handleFileChange = async (e) => {
  const file = e.target.files[0];

  if (file) {
    const cropper = new CropImagePro(file, "image", {
      aspectRatio: 16 / 9,
    });

    try {
      const result = await cropper.open();
      preview.value = result.previewUrl;
    } catch (error) {
      console.log("Cancelled");
    }
  }
};
</script>
```

### Angular Integration

```typescript
import { Component } from "@angular/core";
import CropImagePro from "crop-image-pro";
import "crop-image-pro/css";

@Component({
  selector: "app-image-uploader",
  template: `
    <input
      type="file"
      accept="image/*,.heic"
      (change)="handleFileChange($event)"
    />
    <img *ngIf="preview" [src]="preview" alt="Preview" />
  `,
})
export class ImageUploaderComponent {
  preview: string | null = null;

  async handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const cropper = new CropImagePro(file, "image", {
        aspectRatio: 1,
      });

      try {
        const result = await cropper.open();
        this.preview = result.previewUrl;
      } catch (error) {
        console.log("Cancelled");
      }
    }
  }
}
```

## API Documentation

### Constructor

```typescript
new CropImagePro(file: File, fileName: string, options?: CropImageProOptions)
```

#### Parameters

- **file** `File` (required) - The image file to crop
- **fileName** `string` (required) - Base name for the output file
- **options** `CropImageProOptions` (optional) - Configuration options

### Options

```typescript
interface CropImageProOptions {
  aspectRatio?: number; // Default: 1 (square)
  maxOutputSize?: number; // Default: 1200 (pixels)
  compressionQuality?: number; // Default: 0.7 (0-1)
  circularCrop?: boolean; // Default: false
  theme?: {
    primaryColor?: string; // Default: '#073d44'
    backgroundColor?: string; // Default: '#ffffff'
    overlayColor?: string; // Default: 'rgba(0, 0, 0, 0.6)'
  };
}
```

#### Option Details

| Option                  | Type      | Default                | Description                                                                 |
| ----------------------- | --------- | ---------------------- | --------------------------------------------------------------------------- |
| `aspectRatio`           | `number`  | `1`                    | Aspect ratio for crop (e.g., 1 for square, 16/9 for wide, 4/3 for portrait) |
| `maxOutputSize`         | `number`  | `1200`                 | Maximum width or height of output image in pixels                           |
| `compressionQuality`    | `number`  | `0.7`                  | JPEG compression quality (0-1, where 1 is highest quality)                  |
| `circularCrop`          | `boolean` | `false`                | Show circular crop preview (only with aspectRatio 1)                        |
| `theme.primaryColor`    | `string`  | `'#073d44'`            | Primary color for UI elements                                               |
| `theme.backgroundColor` | `string`  | `'#ffffff'`            | Background color for modal                                                  |
| `theme.overlayColor`    | `string`  | `'rgba(0, 0, 0, 0.6)'` | Color for overlay backdrop                                                  |

### Methods

#### `open(): Promise<CropResult>`

Opens the crop editor modal and returns a promise that resolves with the crop result or rejects if cancelled.

**Returns:**

```typescript
interface CropResult {
  previewUrl: string; // Blob URL for preview
  file: File; // Cropped image as File object
  blob: Blob; // Cropped image as Blob
}
```

## Common Use Cases

### Profile Picture Upload

```javascript
const cropper = new CropImagePro(file, "profile", {
  aspectRatio: 1, // Square
  maxOutputSize: 400, // Small size for profile pics
  circularCrop: true, // Circular preview
  compressionQuality: 0.8,
});
```

### Banner/Header Image

```javascript
const cropper = new CropImagePro(file, "banner", {
  aspectRatio: 16 / 9, // Wide format
  maxOutputSize: 1920, // Full HD width
  compressionQuality: 0.85,
});
```

### Product Photos

```javascript
const cropper = new CropImagePro(file, "product", {
  aspectRatio: 4 / 3, // Standard photo ratio
  maxOutputSize: 1200,
  compressionQuality: 0.75,
});
```

### Free-form Crop

```javascript
const cropper = new CropImagePro(file, "image", {
  aspectRatio: undefined, // User can choose any ratio
  maxOutputSize: 2000,
});

// User can toggle aspect lock in the UI
```

## Features in Detail

### HEIC/HEIF Support

The library automatically detects and converts HEIC/HEIF images (common on iOS devices) to JPEG format:

```javascript
// Works automatically with HEIC files
const file = input.files[0]; // Could be .heic
const cropper = new CropImagePro(file, "photo");
const result = await cropper.open();
// result.file is JPEG
```

### Image Compression

All output images are automatically compressed to balance quality and file size:

```javascript
// High quality (larger file)
const cropper = new CropImagePro(file, "image", {
  compressionQuality: 0.9,
});

// Balanced (default)
const cropper = new CropImagePro(file, "image", {
  compressionQuality: 0.7,
});

// Smaller file size
const cropper = new CropImagePro(file, "image", {
  compressionQuality: 0.5,
});
```

### Custom Styling

You can customize the appearance by overriding CSS variables or classes:

```css
/* Custom theme colors */
.crop-image-pro-modal {
  --primary-color: #your-color;
}

/* Or override specific classes */
.crop-image-pro-btn-primary {
  background-color: #your-brand-color;
}
```

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- iOS Safari (latest 2 versions)
- Chrome Android (latest)

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import CropImagePro, { CropImageProOptions, CropResult } from "crop-image-pro";

const options: CropImageProOptions = {
  aspectRatio: 16 / 9,
  maxOutputSize: 1920,
};

const cropper = new CropImagePro(file, "image", options);
const result: CropResult = await cropper.open();
```

## Error Handling

```javascript
try {
  const cropper = new CropImagePro(file, "image");
  const result = await cropper.open();

  // Success - use result
  await uploadImage(result.file);
} catch (error) {
  if (error.message === "User cancelled") {
    // User clicked cancel
    console.log("User cancelled crop");
  } else {
    // Other errors (file loading, etc.)
    console.error("Error:", error);
  }
}
```

## Best Practices

1. **Always handle errors** - Users may cancel or errors may occur
2. **Clean up preview URLs** - Call `URL.revokeObjectURL(result.previewUrl)` when done
3. **Set appropriate maxOutputSize** - Balance quality and file size
4. **Validate file types** - Check file type before creating cropper
5. **Show loading states** - Cropping large images may take time

```javascript
// Example with best practices
async function handleImageUpload(file) {
  // Validate file type
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file");
    return;
  }

  // Validate file size (e.g., max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    alert("File too large. Maximum 10MB");
    return;
  }

  try {
    const cropper = new CropImagePro(file, "image", {
      maxOutputSize: 1200,
      compressionQuality: 0.7,
    });

    const result = await cropper.open();

    // Upload to server
    await uploadToServer(result.file);

    // Display preview
    displayPreview(result.previewUrl);

    // Clean up after some time
    setTimeout(() => {
      URL.revokeObjectURL(result.previewUrl);
    }, 60000);
  } catch (error) {
    if (error.message !== "User cancelled") {
      console.error("Upload failed:", error);
      alert("Failed to process image");
    }
  }
}
```

## Examples

See the [examples](./examples) directory for complete working examples:

- Vanilla JavaScript
- React
- Vue
- Angular
- Next.js
- Svelte

## License

MIT © Jeslor Ssozi

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Issues

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/jeslor/crop-image-pro/issues).

## Changelog

### 1.0.0

- Initial release
- Vanilla JavaScript/TypeScript implementation
- HEIC support
- Image compression
- Zoom and rotate controls
- Aspect ratio locking
- Framework-agnostic design
