<template>
  <div class="image-cropper">
    <h2>Upload Image</h2>

    <div class="upload-section">
      <input
        type="file"
        accept="image/*,.heic"
        @change="handleFileChange"
        :disabled="isLoading"
        id="file-input"
      />
      <label for="file-input" class="upload-button">
        {{ isLoading ? "Processing..." : "Choose Image" }}
      </label>
    </div>

    <div v-if="preview" class="preview-section">
      <h3>Preview</h3>
      <img :src="preview" alt="Cropped preview" class="preview-image" />
      <div class="file-info">
        <p>File size: {{ fileSize }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import CropImagePro from "crop-image-pro";
// CSS is embedded in the library, but you can optionally import standalone CSS:
// import 'crop-image-pro/css';

const preview = ref<string | null>(null);
const isLoading = ref(false);
const fileInfo = ref<File | null>(null);

const fileSize = computed(() => {
  if (!fileInfo.value) return "";
  const kb = fileInfo.value.size / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(2)} KB`;
  }
  return `${(kb / 1024).toFixed(2)} MB`;
});

// Clean up preview URL on unmount
onUnmounted(() => {
  if (preview.value) {
    URL.revokeObjectURL(preview.value);
  }
});

async function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  // Validate file
  if (
    !file.type.startsWith("image/") &&
    !file.name.toLowerCase().endsWith(".heic")
  ) {
    alert("Please select an image file");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("File too large. Maximum 10MB");
    return;
  }

  isLoading.value = true;

  try {
    // Create cropper with options
    const cropper = new CropImagePro(file, "my-image", {
      aspectRatio: 16 / 9, // Wide format
      maxOutputSize: 1920, // Full HD
      compressionQuality: 0.75,
    });

    // Open crop modal
    const result = await cropper.open();

    // Clean up old preview
    if (preview.value) {
      URL.revokeObjectURL(preview.value);
    }

    // Set new preview
    preview.value = result.previewUrl;
    fileInfo.value = result.file;

    // Here you would upload the file
    // await uploadImage(result.file);
  } catch (error) {
    if ((error as Error).message !== "User cancelled") {
      console.error("Error cropping image:", error);
      alert("Failed to process image");
    }
  } finally {
    isLoading.value = false;
  }
}

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}
</script>

<style scoped>
.image-cropper {
  max-width: 500px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
}

h2 {
  margin-bottom: 1.5rem;
  color: #073d44;
}

.upload-section {
  margin-bottom: 1.5rem;
}

input[type="file"] {
  display: none;
}

.upload-button {
  display: inline-block;
  padding: 0.75rem 1.5rem;
  background: #073d44;
  color: white;
  border-radius: 0.375rem;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s;
}

.upload-button:hover {
  background: #052c31;
}

.preview-section {
  text-align: center;
}

.preview-section h3 {
  margin-bottom: 1rem;
  color: #374151;
}

.preview-image {
  max-width: 100%;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.file-info {
  margin-top: 1rem;
  padding: 0.75rem;
  background: #f0fdf4;
  border-radius: 0.25rem;
}

.file-info p {
  margin: 0;
  color: #065f46;
  font-size: 0.875rem;
}
</style>
