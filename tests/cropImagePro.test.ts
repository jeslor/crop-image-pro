import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CropImagePro, CropImageProOptions } from "../src/cropImagePro";

// Mock heic2any
vi.mock("heic2any", () => ({
  default: vi
    .fn()
    .mockResolvedValue(new Blob(["test"], { type: "image/jpeg" })),
}));

describe("CropImagePro", () => {
  let mockFile: File;
  let mockHeicFile: File;

  beforeEach(() => {
    // Create mock files
    const blob = new Blob(["test image data"], { type: "image/jpeg" });
    mockFile = new File([blob], "test-image.jpg", { type: "image/jpeg" });

    const heicBlob = new Blob(["heic data"], { type: "image/heic" });
    mockHeicFile = new File([heicBlob], "test-image.heic", {
      type: "image/heic",
    });

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((event: string, callback: Function) => {
        if (event === "load") {
          setTimeout(() => {
            (mockFileReader as any).result =
              "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
            callback();
          }, 0);
        }
      }),
      result: null,
    };

    vi.spyOn(window, "FileReader").mockImplementation(
      () => mockFileReader as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Clean up any modals
    document.body.innerHTML = "";
  });

  describe("Constructor", () => {
    it("should create instance with default options", () => {
      const cropper = new CropImagePro(mockFile, "test-image");
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should create instance with custom options", () => {
      const options: CropImageProOptions = {
        aspectRatio: 16 / 9,
        maxOutputSize: 800,
        compressionQuality: 0.8,
        circularCrop: true,
        theme: {
          primaryColor: "#ff0000",
          backgroundColor: "#ffffff",
          overlayColor: "rgba(0, 0, 0, 0.5)",
        },
      };

      const cropper = new CropImagePro(mockFile, "test-image", options);
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should use default values for missing options", () => {
      const cropper = new CropImagePro(mockFile, "test-image", {
        aspectRatio: 2,
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });
  });

  describe("Options Validation", () => {
    it("should accept aspectRatio of 1 for square crop", () => {
      const cropper = new CropImagePro(mockFile, "test", { aspectRatio: 1 });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept aspectRatio of 16/9 for widescreen", () => {
      const cropper = new CropImagePro(mockFile, "test", {
        aspectRatio: 16 / 9,
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept aspectRatio of 4/3 for standard", () => {
      const cropper = new CropImagePro(mockFile, "test", {
        aspectRatio: 4 / 3,
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept compressionQuality between 0 and 1", () => {
      const cropper1 = new CropImagePro(mockFile, "test", {
        compressionQuality: 0.1,
      });
      const cropper2 = new CropImagePro(mockFile, "test", {
        compressionQuality: 0.9,
      });
      expect(cropper1).toBeInstanceOf(CropImagePro);
      expect(cropper2).toBeInstanceOf(CropImagePro);
    });

    it("should accept custom maxOutputSize", () => {
      const cropper = new CropImagePro(mockFile, "test", {
        maxOutputSize: 2000,
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });
  });

  describe("File Type Support", () => {
    it("should accept JPEG files", () => {
      const jpegFile = new File([new Blob([""])], "test.jpg", {
        type: "image/jpeg",
      });
      const cropper = new CropImagePro(jpegFile, "test");
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept PNG files", () => {
      const pngFile = new File([new Blob([""])], "test.png", {
        type: "image/png",
      });
      const cropper = new CropImagePro(pngFile, "test");
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept HEIC files", () => {
      const cropper = new CropImagePro(mockHeicFile, "test");
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept WebP files", () => {
      const webpFile = new File([new Blob([""])], "test.webp", {
        type: "image/webp",
      });
      const cropper = new CropImagePro(webpFile, "test");
      expect(cropper).toBeInstanceOf(CropImagePro);
    });
  });

  describe("Theme Options", () => {
    it("should accept custom primary color", () => {
      const cropper = new CropImagePro(mockFile, "test", {
        theme: { primaryColor: "#123456" },
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept custom background color", () => {
      const cropper = new CropImagePro(mockFile, "test", {
        theme: { backgroundColor: "#fefefe" },
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });

    it("should accept custom overlay color", () => {
      const cropper = new CropImagePro(mockFile, "test", {
        theme: { overlayColor: "rgba(255, 0, 0, 0.3)" },
      });
      expect(cropper).toBeInstanceOf(CropImagePro);
    });
  });
});

describe("CropImagePro Modal", () => {
  let mockFile: File;

  beforeEach(() => {
    const blob = new Blob(["test"], { type: "image/jpeg" });
    mockFile = new File([blob], "test.jpg", { type: "image/jpeg" });

    // Mock FileReader
    const mockFileReader = {
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((event: string, callback: Function) => {
        if (event === "load") {
          setTimeout(() => {
            (mockFileReader as any).result = "data:image/jpeg;base64,test";
            callback();
          }, 10);
        }
      }),
      result: null,
    };
    vi.spyOn(window, "FileReader").mockImplementation(
      () => mockFileReader as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("should inject styles when modal opens", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    // Start opening (don't await, we'll cancel)
    const openPromise = cropper.open();

    // Wait for DOM to be ready
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check styles were injected
    const styleElement = document.getElementById("crop-image-pro-styles");
    expect(styleElement).not.toBeNull();

    // Cancel by clicking overlay or cancel button
    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    if (cancelBtn) {
      (cancelBtn as HTMLElement).click();
    }

    try {
      await openPromise;
    } catch (e) {
      // Expected - user cancelled
    }
  });

  it("should create modal with correct structure", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check modal structure
    expect(document.querySelector(".crop-image-pro-overlay")).not.toBeNull();
    expect(document.querySelector(".crop-image-pro-modal")).not.toBeNull();
    expect(document.querySelector(".crop-image-pro-header")).not.toBeNull();
    expect(document.querySelector(".crop-image-pro-content")).not.toBeNull();
    expect(document.querySelector(".crop-image-pro-controls")).not.toBeNull();

    // Cleanup
    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    if (cancelBtn) (cancelBtn as HTMLElement).click();
    try {
      await openPromise;
    } catch (e) {
      /* expected */
    }
  });

  it("should have zoom controls", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check for zoom slider
    const slider = document.querySelector(".crop-image-pro-slider");
    expect(slider).not.toBeNull();
    expect(slider?.getAttribute("type")).toBe("range");
    expect(slider?.getAttribute("min")).toBe("0.5");
    expect(slider?.getAttribute("max")).toBe("3");

    // Cleanup
    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    if (cancelBtn) (cancelBtn as HTMLElement).click();
    try {
      await openPromise;
    } catch (e) {
      /* expected */
    }
  });

  it("should have action buttons", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    const saveBtn = document.querySelector(".crop-image-pro-btn-primary");

    expect(cancelBtn).not.toBeNull();
    expect(saveBtn).not.toBeNull();
    expect(cancelBtn?.textContent).toContain("Cancel");
    expect(saveBtn?.textContent).toContain("Save");

    // Cleanup
    if (cancelBtn) (cancelBtn as HTMLElement).click();
    try {
      await openPromise;
    } catch (e) {
      /* expected */
    }
  });

  it("should reject with error when cancelled", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    expect(cancelBtn).not.toBeNull();

    (cancelBtn as HTMLElement).click();

    await expect(openPromise).rejects.toThrow("User cancelled");
  });

  it("should close modal when close button clicked", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const closeBtn = document.querySelector(".crop-image-pro-close-btn");
    expect(closeBtn).not.toBeNull();

    (closeBtn as HTMLElement).click();

    await expect(openPromise).rejects.toThrow("User cancelled");

    // Modal should be removed
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(document.querySelector(".crop-image-pro-overlay")).toBeNull();
  });
});

describe("CropImagePro Icons", () => {
  let mockFile: File;

  beforeEach(() => {
    const blob = new Blob(["test"], { type: "image/jpeg" });
    mockFile = new File([blob], "test.jpg", { type: "image/jpeg" });

    const mockFileReader = {
      readAsDataURL: vi.fn(),
      addEventListener: vi.fn((event: string, callback: Function) => {
        if (event === "load") {
          setTimeout(() => {
            (mockFileReader as any).result = "data:image/jpeg;base64,test";
            callback();
          }, 10);
        }
      }),
      result: null,
    };
    vi.spyOn(window, "FileReader").mockImplementation(
      () => mockFileReader as any
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("should render SVG icons in buttons", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Check for SVG elements in icon buttons
    const iconBtns = document.querySelectorAll(".crop-image-pro-icon-btn");
    expect(iconBtns.length).toBeGreaterThan(0);

    iconBtns.forEach((btn) => {
      const svg = btn.querySelector("svg");
      expect(svg).not.toBeNull();
    });

    // Cleanup
    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    if (cancelBtn) (cancelBtn as HTMLElement).click();
    try {
      await openPromise;
    } catch (e) {
      /* expected */
    }
  });

  it("should have close icon in close button", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const closeBtn = document.querySelector(".crop-image-pro-close-btn");
    const svg = closeBtn?.querySelector("svg");
    expect(svg).not.toBeNull();

    // Cleanup
    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    if (cancelBtn) (cancelBtn as HTMLElement).click();
    try {
      await openPromise;
    } catch (e) {
      /* expected */
    }
  });

  it("should have check icon in save button", async () => {
    const cropper = new CropImagePro(mockFile, "test");

    const openPromise = cropper.open();
    await new Promise((resolve) => setTimeout(resolve, 50));

    const saveBtn = document.querySelector(".crop-image-pro-btn-primary");
    const svg = saveBtn?.querySelector("svg");
    expect(svg).not.toBeNull();

    // Cleanup
    const cancelBtn = document.querySelector(".crop-image-pro-btn-secondary");
    if (cancelBtn) (cancelBtn as HTMLElement).click();
    try {
      await openPromise;
    } catch (e) {
      /* expected */
    }
  });
});

describe("CropImagePro Exports", () => {
  it("should export CropImagePro class", async () => {
    const { CropImagePro } = await import("../src/cropImagePro");
    expect(CropImagePro).toBeDefined();
    expect(typeof CropImagePro).toBe("function");
  });

  it("should export default CropImagePro", async () => {
    const module = await import("../src/cropImagePro");
    expect(module.default).toBeDefined();
    expect(module.default).toBe(module.CropImagePro);
  });
});
