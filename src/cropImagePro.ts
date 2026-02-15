/**
 * CropImagePro - Professional Image Cropping Library
 * Vanilla JavaScript/TypeScript implementation with HEIC support
 */

import heic2any from "heic2any";

export interface CropImageProOptions {
  aspectRatio?: number; // e.g., 1 for square, 16/9 for wide
  maxOutputSize?: number; // maximum width/height for output image (default: 1200)
  compressionQuality?: number; // JPEG quality 0-1 (default: 0.7)
  circularCrop?: boolean; // Show circular crop preview
  theme?: {
    primaryColor?: string; // default: '#073d44'
    backgroundColor?: string; // default: '#ffffff'
    overlayColor?: string; // default: 'rgba(0, 0, 0, 0.6)'
  };
}

export interface CropResult {
  previewUrl: string;
  file: File;
  blob: Blob;
}

type ResolvedTheme = Required<NonNullable<CropImageProOptions["theme"]>>;
type ResolvedOptions = Omit<Required<CropImageProOptions>, "theme"> & {
  theme: ResolvedTheme;
};

export class CropImagePro {
  private container: HTMLElement | null = null;
  private imgElement: HTMLImageElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private options: ResolvedOptions;
  private file: File;
  private fileName: string;
  private isLoading = false;
  private contentElement: HTMLElement | null = null;

  // Crop state
  private crop = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    unit: "%" as const,
  };
  private scale = 1;
  private rotate = 0;
  private isFixedAspect = true;
  private imgSrc = "";
  private isDragging = false;
  private dragStart = { x: 0, y: 0 };
  private isResizing = false;
  private resizeHandle = "";

  constructor(file: File, fileName: string, options: CropImageProOptions = {}) {
    this.file = file;
    this.fileName = fileName;
    this.options = {
      aspectRatio: options.aspectRatio ?? 1,
      maxOutputSize: options.maxOutputSize ?? 1200,
      compressionQuality: options.compressionQuality ?? 0.7,
      circularCrop: options.circularCrop ?? false,
      theme: {
        primaryColor: options.theme?.primaryColor ?? "#073d44",
        backgroundColor: options.theme?.backgroundColor ?? "#ffffff",
        overlayColor: options.theme?.overlayColor ?? "rgba(0, 0, 0, 0.6)",
      },
    };
  }

  /**
   * Apply theme CSS variables to the current overlay container
   */
  private applyThemeVariables(target: HTMLElement): void {
    const { primaryColor, backgroundColor, overlayColor } = this.options.theme;
    target.style.setProperty("--crop-image-pro-primary", primaryColor);
    target.style.setProperty("--crop-image-pro-background", backgroundColor);
    target.style.setProperty("--crop-image-pro-overlay", overlayColor);
  }

  /**
   * Opens the crop editor modal
   */
  public async open(): Promise<CropResult> {
    return new Promise(async (resolve, reject) => {
      try {
        // Add styles first
        this.injectStyles();

        // Always show loading state initially
        this.isLoading = true;
        this.createModal(resolve, reject);

        // Add to DOM
        document.body.appendChild(this.container!);

        // Load and convert image (this may take time for HEIC)
        const imgSrc = await this.loadImage();
        this.imgSrc = imgSrc;

        // Update content with actual image
        this.showImageContent();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Loads and converts image (handles HEIC)
   */
  private async loadImage(): Promise<string> {
    let imageFile = this.file;

    // Handle HEIC conversion
    if (
      this.file.type === "image/heic" ||
      this.file.name.toLowerCase().endsWith(".heic")
    ) {
      const convertedBlob = await heic2any({
        blob: this.file,
        toType: "image/jpeg",
        quality: 0.8,
      });

      const blob = Array.isArray(convertedBlob)
        ? convertedBlob[0]
        : convertedBlob;

      imageFile = new File([blob], this.file.name.replace(/\.heic$/i, ".jpg"), {
        type: "image/jpeg",
      });
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve(reader.result?.toString() || "");
      });
      reader.addEventListener("error", reject);
      reader.readAsDataURL(imageFile);
    });
  }

  /**
   * Creates the modal UI structure
   */
  private createModal(
    resolve: (result: CropResult) => void,
    reject: (error: Error) => void,
  ): void {
    // Create container
    this.container = document.createElement("div");
    this.container.className = "crop-image-pro-overlay";
    this.container.setAttribute("role", "dialog");
    this.container.setAttribute("aria-modal", "true");
    this.applyThemeVariables(this.container);

    // Create modal
    const modal = document.createElement("div");
    modal.className = "crop-image-pro-modal";

    // Header
    const header = this.createHeader(() => {
      this.close();
      reject(new Error("User cancelled"));
    });

    // Content area
    const content = this.createContent();

    // Controls
    const controls = this.createControls(resolve, reject);

    // Hidden canvas
    this.canvas = document.createElement("canvas");
    this.canvas.style.display = "none";

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(controls);
    modal.appendChild(this.canvas);

    this.container.appendChild(modal);
  }

  /**
   * Creates header with title and close button
   */
  private createHeader(onClose: () => void): HTMLElement {
    const header = document.createElement("div");
    header.className = "crop-image-pro-header";

    const title = document.createElement("h3");
    title.className = "crop-image-pro-title";
    title.textContent = "Edit Photo";

    const closeBtn = document.createElement("button");
    closeBtn.className = "crop-image-pro-close-btn";
    closeBtn.innerHTML = this.getIconSVG("close");
    closeBtn.setAttribute("aria-label", "Close");
    closeBtn.onclick = onClose;

    header.appendChild(title);
    header.appendChild(closeBtn);

    return header;
  }

  /**
   * Creates content area with image and crop overlay
   */
  private createContent(): HTMLElement {
    const content = document.createElement("div");
    content.className = "crop-image-pro-content";
    content.id = "crop-image-pro-content";
    this.contentElement = content;

    if (this.isLoading) {
      // Show loading state
      const loadingDiv = document.createElement("div");
      loadingDiv.className = "crop-image-pro-loading";
      loadingDiv.id = "crop-loading";
      loadingDiv.innerHTML = `
        ${this.getIconSVG("loader")}
        <p>Loading image...</p>
      `;
      content.appendChild(loadingDiv);
    } else {
      // Show image content
      this.createImageContent(content);
    }

    return content;
  }

  /**
   * Creates the image wrapper with crop overlay
   */
  private createImageContent(content: HTMLElement): void {
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "crop-image-pro-image-wrapper";
    imageWrapper.id = "crop-image-wrapper";

    this.imgElement = document.createElement("img");
    this.imgElement.src = this.imgSrc;
    this.imgElement.alt = "Image to crop";
    this.imgElement.className = "crop-image-pro-image";
    this.imgElement.onload = () => this.initializeCrop();

    const cropOverlay = document.createElement("div");
    cropOverlay.className = "crop-image-pro-crop-overlay";
    cropOverlay.id = "crop-overlay";

    imageWrapper.appendChild(this.imgElement);
    imageWrapper.appendChild(cropOverlay);
    content.appendChild(imageWrapper);

    // Set up crop interaction
    this.setupCropInteraction(cropOverlay);
  }

  /**
   * Shows the image content after loading is complete
   */
  private showImageContent(): void {
    if (!this.contentElement) return;

    // Remove loading state
    const loadingDiv = document.getElementById("crop-loading");
    if (loadingDiv) {
      loadingDiv.remove();
    }

    // Add image content
    this.isLoading = false;
    this.createImageContent(this.contentElement);
  }

  /**
   * Creates control buttons and sliders
   */
  private createControls(
    resolve: (result: CropResult) => void,
    reject: (error: Error) => void,
  ): HTMLElement {
    const controls = document.createElement("div");
    controls.className = "crop-image-pro-controls";

    // Tool controls
    const toolControls = document.createElement("div");
    toolControls.className = "crop-image-pro-tool-controls";

    // Zoom controls
    const zoomGroup = this.createZoomControls();

    // Divider
    const divider1 = document.createElement("div");
    divider1.className = "crop-image-pro-divider";

    // Rotate and aspect controls
    const transformGroup = this.createTransformControls();

    toolControls.appendChild(zoomGroup);
    toolControls.appendChild(divider1);
    toolControls.appendChild(transformGroup);

    // Action buttons
    const actions = document.createElement("div");
    actions.className = "crop-image-pro-actions";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "crop-image-pro-btn crop-image-pro-btn-secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => {
      this.close();
      reject(new Error("User cancelled"));
    };

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "crop-image-pro-btn crop-image-pro-btn-primary";
    saveBtn.innerHTML = this.getIconSVG("check") + "<span>Save Photo</span>";
    saveBtn.onclick = async (e: MouseEvent) => {
      e.preventDefault();
      try {
        const result = await this.handleSave();
        this.close();
        resolve(result);
      } catch (error) {
        reject(error as Error);
      }
    };

    actions.appendChild(cancelBtn);
    actions.appendChild(saveBtn);

    controls.appendChild(toolControls);
    controls.appendChild(actions);

    return controls;
  }

  /**
   * Creates zoom control group
   */
  private createZoomControls(): HTMLElement {
    const group = document.createElement("div");
    group.className = "crop-image-pro-control-group";

    const zoomOutBtn = document.createElement("button");
    zoomOutBtn.className = "crop-image-pro-icon-btn";
    zoomOutBtn.innerHTML = this.getIconSVG("zoom-out");
    zoomOutBtn.title = "Zoom Out";
    zoomOutBtn.onclick = () => this.adjustScale(-0.1);

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0.5";
    slider.max = "3";
    slider.step = "0.1";
    slider.value = "1";
    slider.className = "crop-image-pro-slider";
    slider.oninput = (e) => {
      this.scale = parseFloat((e.target as HTMLInputElement).value);
      this.updateImageTransform();
    };

    const zoomInBtn = document.createElement("button");
    zoomInBtn.className = "crop-image-pro-icon-btn";
    zoomInBtn.innerHTML = this.getIconSVG("zoom-in");
    zoomInBtn.title = "Zoom In";
    zoomInBtn.onclick = () => this.adjustScale(0.1);

    group.appendChild(zoomOutBtn);
    group.appendChild(slider);
    group.appendChild(zoomInBtn);

    return group;
  }

  /**
   * Creates transform control group (rotate, aspect lock)
   */
  private createTransformControls(): HTMLElement {
    const group = document.createElement("div");
    group.className = "crop-image-pro-control-group";

    const rotateBtn = document.createElement("button");
    rotateBtn.className = "crop-image-pro-icon-btn";
    rotateBtn.innerHTML = this.getIconSVG("rotate");
    rotateBtn.title = "Rotate 90°";
    rotateBtn.onclick = () => this.rotateImage();

    const divider = document.createElement("div");
    divider.className = "crop-image-pro-divider";

    const aspectBtn = document.createElement("button");
    aspectBtn.className =
      "crop-image-pro-icon-btn crop-image-pro-aspect-btn active";
    aspectBtn.innerHTML = this.getIconSVG("lock") + "<span>Fixed</span>";
    aspectBtn.title = "Toggle Aspect Ratio Lock";
    aspectBtn.onclick = () => {
      this.isFixedAspect = !this.isFixedAspect;
      aspectBtn.classList.toggle("active");
      aspectBtn.innerHTML = this.isFixedAspect
        ? this.getIconSVG("lock") + "<span>Fixed</span>"
        : this.getIconSVG("unlock") + "<span>Free</span>";

      if (this.isFixedAspect && this.imgElement) {
        this.initializeCrop();
      }
    };

    group.appendChild(rotateBtn);
    group.appendChild(divider);
    group.appendChild(aspectBtn);

    return group;
  }

  /**
   * Initialize crop area centered on image
   */
  private initializeCrop(): void {
    if (!this.imgElement) return;

    // Get the actual rendered dimensions of the image
    const imgRect = this.imgElement.getBoundingClientRect();
    const wrapper = document.getElementById("crop-image-wrapper");
    if (!wrapper) return;

    const wrapperRect = wrapper.getBoundingClientRect();

    // Calculate image position within wrapper (for centering)
    const imgOffsetX = imgRect.left - wrapperRect.left;
    const imgOffsetY = imgRect.top - wrapperRect.top;

    const imgWidth = imgRect.width;
    const imgHeight = imgRect.height;
    const aspect = this.options.aspectRatio;

    // Calculate crop size (90% of image, constrained by aspect ratio)
    let cropWidth = imgWidth * 0.9;
    let cropHeight = cropWidth / aspect;

    if (cropHeight > imgHeight * 0.9) {
      cropHeight = imgHeight * 0.9;
      cropWidth = cropHeight * aspect;
    }

    // Center the crop area on the image
    this.crop = {
      x: imgOffsetX + (imgWidth - cropWidth) / 2,
      y: imgOffsetY + (imgHeight - cropHeight) / 2,
      width: cropWidth,
      height: cropHeight,
      unit: "%",
    };

    this.updateCropOverlay();
  }

  /**
   * Update crop overlay position and size
   */
  private updateCropOverlay(): void {
    const overlay = document.getElementById("crop-overlay");
    if (!overlay || !this.imgElement) return;

    overlay.style.left = `${this.crop.x}px`;
    overlay.style.top = `${this.crop.y}px`;
    overlay.style.width = `${this.crop.width}px`;
    overlay.style.height = `${this.crop.height}px`;

    if (
      this.options.circularCrop &&
      this.isFixedAspect &&
      this.options.aspectRatio === 1
    ) {
      overlay.style.borderRadius = "50%";
    } else {
      overlay.style.borderRadius = "0";
    }
  }

  /**
   * Set up crop interaction (drag and resize)
   */
  private setupCropInteraction(overlay: HTMLElement): void {
    // Add resize handles
    const handles = ["nw", "ne", "sw", "se", "n", "s", "e", "w"];
    handles.forEach((handle) => {
      const div = document.createElement("div");
      div.className = `crop-handle crop-handle-${handle}`;
      div.dataset.handle = handle;
      overlay.appendChild(div);

      div.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        this.isResizing = true;
        this.resizeHandle = handle;
        this.dragStart = { x: e.clientX, y: e.clientY };
      });
    });

    // Drag to move
    overlay.addEventListener("mousedown", (e) => {
      if (this.isResizing) return;
      this.isDragging = true;
      this.dragStart = {
        x: e.clientX - this.crop.x,
        y: e.clientY - this.crop.y,
      };
    });

    document.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        this.handleDrag(e);
      } else if (this.isResizing) {
        this.handleResize(e);
      }
    });

    document.addEventListener("mouseup", () => {
      this.isDragging = false;
      this.isResizing = false;
      this.resizeHandle = "";
    });
  }

  /**
   * Handle crop area drag
   */
  private handleDrag(e: MouseEvent): void {
    if (!this.imgElement) return;

    const wrapper = document.getElementById("crop-image-wrapper");
    if (!wrapper) return;

    const imgRect = this.imgElement.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Calculate image offset within wrapper
    const imgOffsetX = imgRect.left - wrapperRect.left;
    const imgOffsetY = imgRect.top - wrapperRect.top;

    let newX = e.clientX - this.dragStart.x;
    let newY = e.clientY - this.dragStart.y;

    // Constrain to image bounds (accounting for image offset in wrapper)
    newX = Math.max(
      imgOffsetX,
      Math.min(newX, imgOffsetX + imgRect.width - this.crop.width),
    );
    newY = Math.max(
      imgOffsetY,
      Math.min(newY, imgOffsetY + imgRect.height - this.crop.height),
    );

    this.crop.x = newX;
    this.crop.y = newY;
    this.updateCropOverlay();
  }

  /**
   * Handle crop area resize
   */
  private handleResize(e: MouseEvent): void {
    if (!this.imgElement) return;

    const wrapper = document.getElementById("crop-image-wrapper");
    if (!wrapper) return;

    const imgRect = this.imgElement.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    // Calculate image offset within wrapper
    const imgOffsetX = imgRect.left - wrapperRect.left;
    const imgOffsetY = imgRect.top - wrapperRect.top;

    const deltaX = e.clientX - this.dragStart.x;
    const deltaY = e.clientY - this.dragStart.y;

    let newWidth = this.crop.width;
    let newHeight = this.crop.height;
    let newX = this.crop.x;
    let newY = this.crop.y;

    const handle = this.resizeHandle;

    // Handle horizontal resize
    if (handle.includes("e")) {
      newWidth = this.crop.width + deltaX;
    } else if (handle.includes("w")) {
      newWidth = this.crop.width - deltaX;
      newX = this.crop.x + deltaX;
    }

    // Handle vertical resize
    if (handle.includes("s")) {
      newHeight = this.crop.height + deltaY;
    } else if (handle.includes("n")) {
      newHeight = this.crop.height - deltaY;
      newY = this.crop.y + deltaY;
    }

    // Apply aspect ratio constraint
    if (this.isFixedAspect) {
      const aspect = this.options.aspectRatio;
      if (handle.includes("e") || handle.includes("w")) {
        newHeight = newWidth / aspect;
      } else if (handle.includes("n") || handle.includes("s")) {
        newWidth = newHeight * aspect;
      }
    }

    // Constrain to image bounds (accounting for image offset)
    const maxWidth = imgOffsetX + imgRect.width - newX;
    const maxHeight = imgOffsetY + imgRect.height - newY;
    newWidth = Math.max(50, Math.min(newWidth, maxWidth));
    newHeight = Math.max(50, Math.min(newHeight, maxHeight));
    newX = Math.max(
      imgOffsetX,
      Math.min(newX, imgOffsetX + imgRect.width - newWidth),
    );
    newY = Math.max(
      imgOffsetY,
      Math.min(newY, imgOffsetY + imgRect.height - newHeight),
    );

    this.crop.width = newWidth;
    this.crop.height = newHeight;
    this.crop.x = newX;
    this.crop.y = newY;

    this.dragStart = { x: e.clientX, y: e.clientY };
    this.updateCropOverlay();
  }

  /**
   * Adjust scale
   */
  private adjustScale(delta: number): void {
    this.scale = Math.max(0.5, Math.min(3, this.scale + delta));
    const slider = this.container?.querySelector(
      ".crop-image-pro-slider",
    ) as HTMLInputElement;
    if (slider) slider.value = this.scale.toString();
    this.updateImageTransform();
  }

  /**
   * Rotate image
   */
  private rotateImage(): void {
    this.rotate = (this.rotate + 90) % 360;
    this.updateImageTransform();
  }

  /**
   * Update image transform (scale, rotate)
   */
  private updateImageTransform(): void {
    if (!this.imgElement) return;
    this.imgElement.style.transform = `scale(${this.scale}) rotate(${this.rotate}deg)`;
  }

  /**
   * Handle save - crop and compress image
   */
  private async handleSave(): Promise<CropResult> {
    return new Promise((resolve, reject) => {
      if (!this.canvas || !this.imgElement) {
        reject(new Error("Canvas or image not initialized"));
        return;
      }

      const image = this.imgElement;
      const canvas = this.canvas;

      // Get image position offset for correct crop coordinates
      const wrapper = document.getElementById("crop-image-wrapper");
      let imgOffsetX = 0;
      let imgOffsetY = 0;

      if (wrapper) {
        const imgRect = image.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();
        imgOffsetX = imgRect.left - wrapperRect.left;
        imgOffsetY = imgRect.top - wrapperRect.top;
      }

      // Adjust crop coordinates to be relative to image (not wrapper)
      const cropX = this.crop.x - imgOffsetX;
      const cropY = this.crop.y - imgOffsetY;

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      const originalCropWidth = this.crop.width * scaleX;
      const originalCropHeight = this.crop.height * scaleY;

      const MAX_SIZE = this.options.maxOutputSize;

      let outWidth = originalCropWidth;
      let outHeight = originalCropHeight;

      if (outWidth > MAX_SIZE || outHeight > MAX_SIZE) {
        const scaleFactor = Math.min(MAX_SIZE / outWidth, MAX_SIZE / outHeight);
        outWidth = outWidth * scaleFactor;
        outHeight = outHeight * scaleFactor;
      }

      canvas.width = outWidth;
      canvas.height = outHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        image,
        cropX * scaleX,
        cropY * scaleY,
        originalCropWidth,
        originalCropHeight,
        0,
        0,
        outWidth,
        outHeight,
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          const previewUrl = URL.createObjectURL(blob);
          const croppedFile = new File([blob], `${this.fileName}.jpg`, {
            type: "image/jpeg",
          });

          resolve({
            previewUrl,
            file: croppedFile,
            blob,
          });
        },
        "image/jpeg",
        this.options.compressionQuality,
      );
    });
  }

  /**
   * Close modal and cleanup
   */
  private close(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  /**
   * Get SVG icon markup - using icons from the icons folder
   */
  private getIconSVG(icon: string): string {
    const icons: Record<string, string> = {
      close:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
      check:
        '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
      "zoom-in":
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
      "zoom-out":
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/><line x1="8" x2="14" y1="11" y2="11"/></svg>',
      rotate:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>',
      lock: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
      unlock:
        '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>',
      loader:
        '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="crop-image-pro-spinner"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
    };
    return icons[icon] || "";
  }

  /**
   * Inject CSS styles - all styles are embedded for easy integration
   */
  private injectStyles(): void {
    if (document.getElementById("crop-image-pro-styles")) return;

    const style = document.createElement("style");
    style.id = "crop-image-pro-styles";
    const { primaryColor, backgroundColor, overlayColor } = this.options.theme;
    style.textContent = `
      /* CropImagePro Styles */
      :root {
        --crop-image-pro-primary: ${primaryColor};
        --crop-image-pro-background: ${backgroundColor};
        --crop-image-pro-overlay: ${overlayColor};
      }
      * { box-sizing: border-box; }
      
      .crop-image-pro-overlay {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--crop-image-pro-overlay);
        backdrop-filter: blur(4px);
        padding: 1rem;
        animation: cropImageProFadeIn 200ms ease-in;
      }
      
      @keyframes cropImageProFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .crop-image-pro-modal {
        background-color: var(--crop-image-pro-background);
        border-radius: 0.75rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        width: 100%;
        max-width: 42rem;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
      }
      
      .crop-image-pro-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid #f3f4f6;
        flex-shrink: 0;
      }
      
      .crop-image-pro-title {
        font-weight: 600;
        font-size: 1.125rem;
        line-height: 1.75rem;
        color: var(--crop-image-pro-primary);
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .crop-image-pro-close-btn {
        padding: 0.5rem;
        background: transparent;
        border: none;
        border-radius: 9999px;
        cursor: pointer;
        transition: background-color 150ms ease-in-out;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #6b7280;
      }
      
      .crop-image-pro-close-btn:hover {
        background-color: #f3f4f6;
      }
      
      .crop-image-pro-content {
        flex: 1;
        overflow: auto;
        padding: 1.5rem;
        border: 2px solid var(--crop-image-pro-background);
        background-color: var(--crop-image-pro-background);
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 200px;
      }
      
      .crop-image-pro-image-wrapper {
        position: relative;
        width: 100%;
        display: flex;
        justify-content: center;
        user-select: none;
      }
      
      .crop-image-pro-image {
        display: block;
        max-width: 100%;
        height: auto;
        max-height: 60vh;
        transition: transform 150ms ease-in-out;
      }
      
      .crop-image-pro-crop-overlay {
        position: absolute;
        border: 2px solid var(--crop-image-pro-primary);
        box-shadow: 0 0 0 9999px var(--crop-image-pro-overlay);
        cursor: move;
        pointer-events: all;
      }
      
      .crop-handle {
        position: absolute;
        width: 12px;
        height: 12px;
        background-color: var(--crop-image-pro-primary);
        border: 2px solid #ffffff;
        border-radius: 50%;
        pointer-events: all;
      }
      
      .crop-handle-nw { top: -6px; left: -6px; cursor: nw-resize; }
      .crop-handle-ne { top: -6px; right: -6px; cursor: ne-resize; }
      .crop-handle-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
      .crop-handle-se { bottom: -6px; right: -6px; cursor: se-resize; }
      .crop-handle-n { top: -6px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
      .crop-handle-s { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
      .crop-handle-e { top: 50%; right: -6px; transform: translateY(-50%); cursor: e-resize; }
      .crop-handle-w { top: 50%; left: -6px; transform: translateY(-50%); cursor: w-resize; }
      
      .crop-image-pro-controls {
        padding: 1rem;
        border-top: 1px solid #f3f4f6;
        background-color: var(--crop-image-pro-background);
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }
      
      .crop-image-pro-tool-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 1rem;
        justify-content: center;
      }
      
      .crop-image-pro-control-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .crop-image-pro-divider {
        width: 1px;
        height: 1.5rem;
        background-color: #e5e7eb;
        margin: 0 0.5rem;
      }
      
      .crop-image-pro-icon-btn {
        padding: 0.5rem;
        color: #6b7280;
        background: transparent;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        transition: color 150ms ease-in-out;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .crop-image-pro-icon-btn:hover {
        color: var(--crop-image-pro-primary);
      }
      
      .crop-image-pro-icon-btn span {
        font-size: 0.75rem;
        line-height: 1rem;
        font-weight: 500;
      }
      
      .crop-image-pro-aspect-btn.active {
        background-color: #f3f4f6;
        color: var(--crop-image-pro-primary);
      }
      
      .crop-image-pro-slider {
        width: 8rem;
        height: 0.25rem;
        background-color: #e5e7eb;
        border-radius: 0.5rem;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
        outline: none;
      }
      
      .crop-image-pro-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 1rem;
        height: 1rem;
        background-color: var(--crop-image-pro-primary);
        border-radius: 50%;
        cursor: pointer;
        transition: background-color 150ms ease-in-out;
      }
      
      .crop-image-pro-slider::-webkit-slider-thumb:hover {
        background-color: var(--crop-image-pro-primary);
      }
      
      .crop-image-pro-slider::-moz-range-thumb {
        width: 1rem;
        height: 1rem;
        background-color: var(--crop-image-pro-primary);
        border-radius: 50%;
        border: none;
        cursor: pointer;
        transition: background-color 150ms ease-in-out;
      }
      
      .crop-image-pro-slider::-moz-range-thumb:hover {
        background-color: var(--crop-image-pro-primary);
      }
      
      .crop-image-pro-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding-top: 0.5rem;
      }
      
      .crop-image-pro-btn {
        height: 2.5rem;
        padding: 0 1.5rem;
        border-radius: 0.375rem;
        font-weight: 500;
        font-size: 0.875rem;
        line-height: 1.25rem;
        cursor: pointer;
        transition: all 150ms ease-in-out;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: none;
        outline: none;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      .crop-image-pro-btn:focus-visible {
        outline: 2px solid var(--crop-image-pro-primary);
        outline-offset: 2px;
      }
      
      .crop-image-pro-btn-secondary {
        background-color: transparent;
        color: #374151;
        border: 1px solid #d1d5db;
      }
      
      .crop-image-pro-btn-secondary:hover {
        background-color: #f9fafb;
      }
      
      .crop-image-pro-btn-primary {
        background-color: var(--crop-image-pro-primary);
        color: #ffffff;
        border: 1px solid transparent;
      }
      
      .crop-image-pro-btn-primary:hover {
        background-color: var(--crop-image-pro-primary);
      }
      
      .crop-image-pro-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .crop-image-pro-loading {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.75rem;
        color: #6b7280;
      }
      
      .crop-image-pro-spinner {
        width: 2rem;
        height: 2rem;
        color: var(--crop-image-pro-primary);
        animation: cropImageProSpin 1s linear infinite;
      }
      
      @keyframes cropImageProSpin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @media (max-width: 640px) {
        .crop-image-pro-overlay { padding: 0.5rem; }
        .crop-image-pro-content { padding: 1rem; }
        .crop-image-pro-tool-controls { gap: 0.5rem; }
        .crop-image-pro-divider { display: none; }
        .crop-image-pro-icon-btn span { display: none; }
        .crop-image-pro-slider { width: 5rem; }
        .crop-image-pro-actions { padding-top: 0; }
      }
      
      @media (prefers-reduced-motion: reduce) {
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Export for usage
export default CropImagePro;
