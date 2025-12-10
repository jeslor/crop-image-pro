import React, { useState } from "react";
import CropImagePro from "crop-image-pro";
// CSS is embedded in the library, but you can optionally import standalone CSS:
// import "crop-image-pro/css";

/**
 * Example React component showing how to integrate Crop Image Pro
 */
function ImageCropperExample() {
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

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

    setIsLoading(true);

    try {
      // Create cropper with options
      const cropper = new CropImagePro(file, "profile-picture", {
        aspectRatio: 1, // Square crop
        maxOutputSize: 800, // Max 800px
        compressionQuality: 0.8, // Good quality
        circularCrop: true, // Circular preview
      });

      // Open crop modal
      const result = await cropper.open();

      // Set preview
      setPreview(result.previewUrl);

      // Upload to server
      await uploadImage(result.file);

      // Clean up old preview URL
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    } catch (error) {
      if ((error as Error).message !== "User cancelled") {
        console.error("Error cropping image:", error);
        alert("Failed to process image");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      console.log("Upload successful:", data);
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  return (
    <div className="image-cropper-example">
      <h2>Upload Profile Picture</h2>

      <div className="upload-section">
        <input
          type="file"
          accept="image/*,.heic"
          onChange={handleFileChange}
          disabled={isLoading}
          id="file-input"
        />
        <label htmlFor="file-input" className="upload-button">
          {isLoading ? "Processing..." : "Choose Image"}
        </label>
      </div>

      {preview && (
        <div className="preview-section">
          <h3>Preview</h3>
          <img src={preview} alt="Cropped preview" className="preview-image" />
        </div>
      )}

      <style jsx>{`
        .image-cropper-example {
          max-width: 400px;
          margin: 2rem auto;
          padding: 2rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
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
      `}</style>
    </div>
  );
}

export default ImageCropperExample;
