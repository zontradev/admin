/**
 * Lashker Traders - Supabase Full Service for Admin Portal (supabase-service.js)
 * Production Integration: Supabase Auth, Storage Bucket ('traders_bucket'), Database Sync
 * Project: aovqspldjfmhbljdogqw (https://aovqspldjfmhbljdogqw.supabase.co)
 */

const SUPABASE_CONFIG = {
  url: "https://aovqspldjfmhbljdogqw.supabase.co",
  publishableKey: "sb_publishable_0Srntar9hPBEVhj1LHR3hA_CEowndqC",
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

class AdminSupabaseService {
  constructor() {
    this.config = SUPABASE_CONFIG;
    this.client = null;
    this.initClient();
  }

  initClient() {
    if (typeof window !== "undefined" && window.supabase && typeof window.supabase.createClient === "function") {
      try {
        this.client = window.supabase.createClient(this.config.url, this.config.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: "lt_admin_supabase_auth"
          }
        });
        console.log("[Admin Supabase] Client initialized successfully.");
      } catch (err) {
        console.warn("[Admin Supabase] Client init fallback:", err.message);
      }
    }
  }

  ensureClient() {
    if (!this.client) this.initClient();
    return this.client;
  }

  // ==========================================================================
  // AUTHENTICATION: GOOGLE OAUTH & EMAIL/PASSWORD
  // ==========================================================================

  async loginWithGoogle() {
    const client = this.ensureClient();
    if (client && client.auth) {
      const redirectUrl = window.location.origin + window.location.pathname;
      const { data, error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl
        }
      });
      if (error) throw error;
      return data;
    }

    // Direct REST OAuth fallback
    const redirectUrl = encodeURIComponent(window.location.origin + window.location.pathname);
    const authUrl = `${this.config.url}/auth/v1/authorize?provider=google&redirect_to=${redirectUrl}`;
    return { url: authUrl };
  }

  async loginWithEmail(email, password) {
    const client = this.ensureClient();
    const cleanEmail = (email || "").trim().toLowerCase();

    if (client && client.auth) {
      const { data, error } = await client.auth.signInWithPassword({
        email: cleanEmail,
        password: password
      });
      if (error) throw error;
      return {
        user: data.user,
        session: data.session
      };
    }

    // REST fallback
    const res = await fetch(`${this.config.url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "apikey": this.config.anonKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email: cleanEmail, password: password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error_description || data.msg || data.message || "Invalid administrator credentials.");
    }

    return {
      user: data.user,
      session: data
    };
  }

  async logout() {
    const client = this.ensureClient();
    if (client && client.auth) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn("[Admin Supabase] Logout note:", e.message);
      }
    }

    if (typeof localStorage !== "undefined") {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("lt_admin_") || k.includes("supabase.auth")) {
          localStorage.removeItem(k);
        }
      });
    }
    return { success: true };
  }

  async getSession() {
    const client = this.ensureClient();
    if (client && client.auth) {
      const { data } = await client.auth.getSession();
      return data?.session || null;
    }
    return null;
  }

  async getUser() {
    const client = this.ensureClient();
    if (client && client.auth) {
      const { data } = await client.auth.getUser();
      return data?.user || null;
    }
    return null;
  }

  onAuthStateChanged(callback) {
    const client = this.ensureClient();
    if (client && client.auth) {
      return client.auth.onAuthStateChange((event, session) => {
        callback(session?.user || null, session, event);
      });
    }
    return null;
  }

  // ==========================================================================
  // STORAGE BUCKET: 'traders_bucket' (UPLOAD, LIST, DELETE, PREVIEW)
  // ==========================================================================

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

  async uploadImage(file, customPath = "") {
    if (!this.isImage(file)) {
      throw new Error("Invalid format: Only images (JPEG, PNG, WebP, SVG, GIF) can be stored in 'traders_bucket'.");
    }

    const fileExt = (file.name || "image.jpg").split(".").pop().toLowerCase();
    const cleanName = (file.name || "image").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = customPath || `catalog/${Date.now()}_${cleanName}.${fileExt}`;

    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const uploadUrl = `${this.config.url}/storage/v1/object/${this.config.bucket}/${encodeURIComponent(fileName)}`;

      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": file.type || "image/jpeg",
          "x-upsert": "true"
        },
        body: file
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed with HTTP ${response.status}`);
      }

      const publicUrl = this.getPublicUrl(fileName);
      console.log("[Admin Supabase Storage] Image uploaded:", publicUrl);

      return {
        success: true,
        publicUrl: publicUrl,
        path: fileName,
        fileName: file.name
      };
    } catch (err) {
      console.warn("[Admin Supabase Storage] Upload error, fallback preview generated:", err.message);
      return {
        success: true,
        publicUrl: URL.createObjectURL(file),
        path: fileName,
        warning: err.message
      };
    }
  }

  async listBucketImages(folder = "catalog") {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const listUrl = `${this.config.url}/storage/v1/object/list/${this.config.bucket}`;

      const res = await fetch(listUrl, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prefix: folder,
          limit: 100,
          offset: 0,
          sortBy: { column: "created_at", order: "desc" }
        })
      });

      if (!res.ok) return [];
      const data = await res.json();
      return (data || []).map(item => ({
        name: item.name,
        id: item.id,
        size: item.metadata?.size || 0,
        createdAt: item.created_at,
        path: `${folder}/${item.name}`,
        publicUrl: this.getPublicUrl(`${folder}/${item.name}`)
      }));
    } catch (err) {
      console.warn("[Admin Supabase Storage] List images note:", err.message);
      return [];
    }
  }

  async deleteBucketImage(filePath) {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const cleanPath = filePath.replace(/^\/+/, "");
      const deleteUrl = `${this.config.url}/storage/v1/object/${this.config.bucket}`;

      const res = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ prefixes: [cleanPath] })
      });
      return res.ok;
    } catch (err) {
      console.warn("[Admin Supabase Storage] Delete error:", err.message);
      return false;
    }
  }

  // ==========================================================================
  // DATABASE SERVER SYNC (PRODUCTS & ORDERS)
  // ==========================================================================

  async fetchServerProducts() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/products?select=*&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchServerProducts note:", e.message);
      return [];
    }
  }

  async saveServerProduct(prod) {
    if (!prod) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/products`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(prod)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] saveServerProduct note:", e.message);
      return false;
    }
  }

  async deleteServerProduct(id) {
    if (!id) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/products?id=eq.${id}`, {
        method: "DELETE",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`
        }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteServerProduct note:", e.message);
      return false;
    }
  }

  async fetchServerOrders() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/orders?select=*&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchServerOrders note:", e.message);
      return [];
    }
  }

  async updateServerOrderStatus(orderId, status) {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/orders?order_number=eq.${orderId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          fulfillment_status: status,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] updateServerOrderStatus note:", e.message);
      return false;
    }
  }
}

// Global Singleton
const SupabaseAdmin = new AdminSupabaseService();
if (typeof window !== "undefined") {
  window.SupabaseService = SupabaseAdmin;
  // Full backward compatibility for any existing calls
  window.SupabaseStorageService = SupabaseAdmin;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { AdminSupabaseService, SupabaseAdmin, SUPABASE_CONFIG };
}
