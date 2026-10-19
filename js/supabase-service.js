/**
 * Lashker Traders - Supabase Image Storage Service (supabase-service.js)
 * Bucket: traders_bucket
 * Project: aovqspldjfmhbljdogqw (https://aovqspldjfmhbljdogqw.supabase.co)
 * Exclusively handles images (JPEG, PNG, WebP, SVG, GIF)
 */

const SUPABASE_CONFIG = {
  url: "https://aovqspldjfmhbljdogqw.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvdnFzcGxkamZtaGJsamRvZ3F3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMzMzNDcsImV4cCI6MjEwNzgwOTM0N30.lBqZELfmXsKTezWtNbMfOGV3xAYC6JfMLSuDhMaM5aw",
  bucket: "traders_bucket"
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif"
];

const ALLOWED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "svg", "gif"];

class SupabaseStorageService {
  constructor() {
    this.config = SUPABASE_CONFIG;
  }

  isImage(fileOrName) {
    if (!fileOrName) return false;
    if (typeof fileOrName === "object" && fileOrName.type) {
      return ALLOWED_IMAGE_TYPES.includes(fileOrName.type);
    }
    const name = typeof fileOrName === "string" ? fileOrName : fileOrName.name || "";
    const ext = name.split(".").pop().toLowerCase();
    return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
  }

  getPublicUrl(filePath) {
    const cleanPath = filePath.replace(/^\/+/, "");
    return `${this.config.url}/storage/v1/object/public/${this.config.bucket}/${cleanPath}`;
  }

  /**
   * Upload an image to traders_bucket
   * @param {File|Blob} file Image file to upload
   * @param {string} customPath Optional destination path (e.g. 'products/twinkle-diaper.jpg')
   */
  async uploadImage(file, customPath = "") {
    if (!this.isImage(file)) {
      throw new Error("Invalid file format: Only images (JPEG, PNG, WebP, SVG, GIF) can be stored in traders_bucket.");
    }

    const isOnline = window.FirebaseService ? window.FirebaseService.isOnlineMode : true;

    // OFFLINE / TEST MODE: create local object URL for instant preview
    if (!isOnline) {
      const mockUrl = URL.createObjectURL(file);
      console.log("[Supabase Test Mode] Simulated image upload:", mockUrl);
      return {
        success: true,
        isTestMode: true,
        publicUrl: mockUrl,
        path: customPath || `test/${file.name}`
      };
    }

    // ONLINE MODE: upload to Supabase Storage via REST endpoint
    const fileExt = (file.name || "image.jpg").split(".").pop().toLowerCase();
    const fileName = customPath || `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
    const uploadUrl = `${this.config.url}/storage/v1/object/${this.config.bucket}/${encodeURIComponent(fileName)}`;

    try {
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`,
          "Content-Type": file.type || "image/jpeg",
          "x-upsert": "true"
        },
        body: file
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const publicUrl = this.getPublicUrl(fileName);
      console.log("[Supabase Storage] Image uploaded successfully:", publicUrl);

      return {
        success: true,
        isTestMode: false,
        publicUrl: publicUrl,
        path: fileName
      };
    } catch (err) {
      console.warn("[Supabase Storage] Online upload failed, falling back to local object URL:", err.message);
      // Fallback preview
      return {
        success: true,
        isTestMode: true,
        publicUrl: URL.createObjectURL(file),
        path: fileName,
        warning: err.message
      };
    }
  }
}

// Global Singleton
const supabaseStorage = new SupabaseStorageService();
if (typeof window !== "undefined") {
  window.SupabaseStorageService = supabaseStorage;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SupabaseStorageService, SUPABASE_CONFIG };
}
