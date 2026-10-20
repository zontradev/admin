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

function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(str || ''));
}
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}


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

  async uploadImages(fileList, folder = "catalog") {
    if (!fileList || fileList.length === 0) return [];
    const files = Array.from(fileList);
    const results = [];
    for (const file of files) {
      try {
        const res = await this.uploadImage(file);
        results.push(res);
      } catch (err) {
        console.warn("[Admin Supabase Storage] Single file upload error:", err.message);
        results.push({
          success: false,
          fileName: file.name,
          error: err.message
        });
      }
    }
    return results;
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
  // DATABASE SERVER SYNC (PRODUCTS, VARIANTS, REALTIME & ORDERS)
  // ==========================================================================

  async fetchServerProducts() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/products?select=*,product_variants(*)&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) {
        // Fallback to simple select if relations aren't populated
        const fbRes = await fetch(`${this.config.url}/rest/v1/products?select=*&order=created_at.desc`, {
          headers: {
            "apikey": this.config.anonKey,
            "Authorization": `Bearer ${this.config.anonKey}`
          }
        });
        if (!fbRes.ok) return [];
        return await fbRes.json();
      }
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

  async saveProductWithVariants(product, variants = []) {
    if (!product || !product.id) return { success: false, error: "Product payload missing required id" };
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const targetVariants = (Array.isArray(variants) && variants.length > 0) ? variants : (Array.isArray(product.variants) ? product.variants : []);

      const productId = isUUID(product.id) ? product.id : generateUUID();
      const productRow = {
        id: productId,
        slug: product.slug,
        sku: product.sku || (targetVariants[0] ? targetVariants[0].sku : `SKU-${Date.now()}`),
        name: product.title || product.name,
        short_description: product.shortDescription || product.short_description || "",
        description: product.description || "",
        brand_id: isUUID(product.brand_id || product.brandId || product.brand) ? (product.brand_id || product.brandId || product.brand) : null,
        status: (product.status === "published" || product.status === "active") ? "active" : (product.status === "archived" ? "archived" : "draft"),
        product_type: product.productType || product.product_type || "physical",
        attributes: {
          category: product.category,
          subcategory: product.subcategory,
          tags: product.tags || [],
          primary_image: product.image,
          images: product.images || [],
          ...(product.attributes || {})
        },
        seo: product.seo || {},
        is_featured: Boolean(product.isFeatured || product.is_featured),
        updated_at: new Date().toISOString()
      };

      if (!product.createdAt) {
        productRow.created_at = new Date().toISOString();
      }

      // 1. Upsert product record into public.products
      const client = this.ensureClient();
      let productSaved = false;

      if (client && client.from) {
        const { error: prodErr } = await client
          .from("products")
          .upsert(productRow, { onConflict: "id" });
        if (prodErr) {
          console.warn("[Supabase SDK] Products upsert warning:", prodErr.message);
        } else {
          productSaved = true;
        }
      }

      if (!productSaved) {
        const res = await fetch(`${this.config.url}/rest/v1/products`, {
          method: "POST",
          headers: {
            "apikey": this.config.anonKey,
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates"
          },
          body: JSON.stringify(productRow)
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn("[Supabase REST] Products upsert warning:", errData);
        }
      }

      // 2. Synchronize product_variants
      if (Array.isArray(targetVariants) && targetVariants.length > 0) {
        const variantRows = targetVariants.map((v, idx) => {
          const varId = isUUID(v.id) ? v.id : generateUUID();
          return {
            id: varId,
            product_id: productId,
            sku: v.sku || `SKU-${Date.now()}-${idx}`,
            variant_name: v.variant_name || v.name || v.sizeName || `${productRow.name} - ${v.sku}`,
            options: v.options || v.optionValues || { size: v.sizeName || v.size || '', pcs: v.pcs || '' },
            retail_price: parseFloat(v.retail_price ?? v.retailPrice ?? v.price) || 0,
            compare_at_price: (v.compare_at_price != null && v.compare_at_price !== "") ? parseFloat(v.compare_at_price) : ((v.compareAtPrice != null && v.compareAtPrice !== "") ? parseFloat(v.compareAtPrice) : ((v.regularPrice != null && v.regularPrice !== "") ? parseFloat(v.regularPrice) : null)),
            cost_price: (v.cost_price != null && v.cost_price !== "") ? parseFloat(v.cost_price) : ((v.costPrice != null && v.costPrice !== "") ? parseFloat(v.costPrice) : null),
            wholesale_price: (v.wholesale_price != null && v.wholesale_price !== "") ? parseFloat(v.wholesale_price) : ((v.wholesalePrice != null && v.wholesalePrice !== "") ? parseFloat(v.wholesalePrice) : ((v.b2bPrice != null && v.b2bPrice !== "") ? parseFloat(v.b2bPrice) : null)),
            stock_quantity: parseInt(v.stock_quantity ?? v.stockQuantity ?? v.stock ?? v.qty ?? v.stockCount, 10) || 0,
            low_stock_threshold: parseInt(v.low_stock_threshold ?? v.lowStockThreshold, 10) || 5,
            is_active: v.is_active !== false && v.isActive !== false && v.status !== "inactive",
            updated_at: new Date().toISOString()
          };
        });

        if (client && client.from) {
          const { error: varErr } = await client
            .from("product_variants")
            .upsert(variantRows, { onConflict: "id" });
          if (varErr) console.warn("[Supabase SDK] Variants upsert warning:", varErr.message);
        } else {
          await fetch(`${this.config.url}/rest/v1/product_variants`, {
            method: "POST",
            headers: {
              "apikey": this.config.anonKey,
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
              "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify(variantRows)
          });
        }
      }

      return { success: true, product: productRow, productId: productId };
    } catch (err) {
      console.warn("[Admin Supabase DB] saveProductWithVariants note:", err.message);
      return { success: false, error: err.message };
    }
  }

  async updateProductStatus(productId, status) {
    if (!productId || !status) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const client = this.ensureClient();

      if (client && client.from) {
        const { error } = await client
          .from("products")
          .update({ status: status, updated_at: new Date().toISOString() })
          .eq("id", productId);
        if (!error) return true;
      }

      const res = await fetch(`${this.config.url}/rest/v1/products?id=eq.${productId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status: status, updated_at: new Date().toISOString() })
      });
      return res.ok;
    } catch (err) {
      console.warn("[Admin Supabase DB] updateProductStatus note:", err.message);
      return false;
    }
  }

  async deleteProductWithVariants(id) {
    if (!id) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const client = this.ensureClient();

      // Delete variants first if not cascading
      if (client && client.from) {
        await client.from("product_variants").delete().eq("product_id", id);
        const { error } = await client.from("products").delete().eq("id", id);
        return !error;
      }

      await fetch(`${this.config.url}/rest/v1/product_variants?product_id=eq.${id}`, {
        method: "DELETE",
        headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${token}` }
      });

      const res = await fetch(`${this.config.url}/rest/v1/products?id=eq.${id}`, {
        method: "DELETE",
        headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteProductWithVariants note:", e.message);
      return false;
    }
  }

  async deleteServerProduct(id) {
    return this.deleteProductWithVariants(id);
  }

  setupRealtimeProducts(onProductChange) {
    const client = this.ensureClient();
    if (!client || !client.channel) return null;

    try {
      const channel = client.channel('admin-catalog-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, (payload) => {
          console.log("[Supabase Realtime] Product change received:", payload.eventType, payload.new?.id || payload.old?.id);
          if (typeof onProductChange === "function") onProductChange(payload, 'products');
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, (payload) => {
          console.log("[Supabase Realtime] Variant change received:", payload.eventType, payload.new?.id || payload.old?.id);
          if (typeof onProductChange === "function") onProductChange(payload, 'product_variants');
        })
        .subscribe((status) => {
          console.log("[Supabase Realtime] Catalog sync channel status:", status);
        });

      return channel;
    } catch (e) {
      console.warn("[Supabase Realtime] Subscription warning:", e.message);
      return null;
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

  async updateServerOrderStatus(orderId, status, note = '') {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const user = await this.getUser();

      const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];
      let normStatus = (status || '').toLowerCase().trim();
      if (!validStatuses.includes(normStatus)) {
        if (normStatus.includes('process')) normStatus = 'processing';
        else if (normStatus.includes('ship')) normStatus = 'shipped';
        else if (normStatus.includes('deliv')) normStatus = 'delivered';
        else if (normStatus.includes('cancel')) normStatus = 'cancelled';
        else if (normStatus.includes('refund')) normStatus = 'refunded';
        else if (normStatus.includes('confirm')) normStatus = 'confirmed';
        else normStatus = 'pending';
      }

      const res = await fetch(`${this.config.url}/rest/v1/orders?order_number=eq.${orderId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: normStatus,
          fulfillment_status: status,
          updated_at: new Date().toISOString()
        })
      });

      // Record history
      try {
        const orderRes = await fetch(`${this.config.url}/rest/v1/orders?order_number=eq.${orderId}&select=id`, {
          headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${this.config.anonKey}` }
        });
        if (orderRes.ok) {
          const ordData = await orderRes.json();
          if (Array.isArray(ordData) && ordData[0]?.id) {
            await fetch(`${this.config.url}/rest/v1/order_status_history`, {
              method: "POST",
              headers: {
                "apikey": this.config.anonKey,
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                id: generateUUID(),
                order_id: ordData[0].id,
                new_status: normStatus,
                note: note || `Order updated to ${status} by admin`,
                changed_by: user?.id || null,
                created_at: new Date().toISOString()
              })
            });
          }
        }
      } catch (eHistory) {
        // Non-fatal
      }

      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] updateServerOrderStatus note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // DELIVERY ZONES & SHIPPING CHARGES (SUPABASE DB)
  // ==========================================================================
  async fetchDeliveryZones() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/delivery_zones?select=*&order=fee.asc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchDeliveryZones note:", e.message);
      return [];
    }
  }

  async saveDeliveryZone(zone) {
    if (!zone || !zone.id) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const zoneId = isUUID(zone.id) ? zone.id : generateUUID();
      const zoneCode = (zone.zone_code || zone.code || (zone.name || 'zone').toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      const row = {
        id: zoneId,
        zone_code: zoneCode,
        zone_name: zone.name || zone.zone_name || 'Delivery Zone',
        fee: parseFloat(zone.fee) || 0,
        free_shipping_threshold: parseFloat(zone.free_shipping_threshold ?? zone.free_threshold ?? zone.freeThreshold) || 1200,
        estimated_days: zone.estimated_days || zone.estimate || '24-48 hours',
        is_active: zone.isActive !== false && zone.is_active !== false
      };
      const res = await fetch(`${this.config.url}/rest/v1/delivery_zones`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(row)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] saveDeliveryZone note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // B2B APPLICATIONS (SUPABASE DB & WORKFLOW)
  // ==========================================================================
  async fetchB2BApplications() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/b2b_applications?select=*&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchB2BApplications note:", e.message);
      return [];
    }
  }

  async updateB2BApplicationStatus(appId, status) {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/b2b_applications?id=eq.${appId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: status,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] updateB2BApplicationStatus note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // CUSTOMER REVIEWS & RATINGS (SUPABASE DB & MODERATION)
  // ==========================================================================
  async fetchReviews() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/reviews?select=*&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchReviews note:", e.message);
      return [];
    }
  }

  async updateReviewStatus(reviewId, status) {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/reviews?id=eq.${reviewId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: status,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] updateReviewStatus note:", e.message);
      return false;
    }
  }

  async deleteReview(reviewId) {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/reviews?id=eq.${reviewId}`, {
        method: "DELETE",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`
        }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteReview note:", e.message);
      return false;
    }
  }


  // ==========================================================================
  // BRAND MANAGEMENT (PUBLIC.BRANDS)
  // ==========================================================================
  async fetchBrands() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/brands?select=*&order=name.asc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchBrands note:", e.message);
      return [];
    }
  }

  async saveBrand(brand) {
    if (!brand || (!brand.name && !brand.id)) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const brandId = isUUID(brand.id) ? brand.id : generateUUID();
      const slug = (brand.slug || brand.name || 'brand').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const row = {
        id: brandId,
        name: brand.name,
        slug: slug,
        origin: brand.origin || '',
        logo_url: brand.logo_url || brand.logo || '',
        is_active: brand.is_active !== false && brand.isActive !== false
      };

      const res = await fetch(`${this.config.url}/rest/v1/brands`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(row)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] saveBrand note:", e.message);
      return false;
    }
  }

  async deleteBrand(brandId) {
    if (!brandId) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/brands?id=eq.${brandId}`, {
        method: "DELETE",
        headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteBrand note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // CATEGORY MANAGEMENT (PUBLIC.CATEGORIES)
  // ==========================================================================
  async fetchCategories() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/categories?select=*&order=sort_order.asc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchCategories note:", e.message);
      return [];
    }
  }

  async saveCategory(cat) {
    if (!cat || (!cat.name && !cat.id)) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const catId = isUUID(cat.id) ? cat.id : generateUUID();
      const slug = (cat.slug || cat.name || 'cat').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const row = {
        id: catId,
        parent_id: isUUID(cat.parent_id || cat.parentId) ? (cat.parent_id || cat.parentId) : null,
        name: cat.name,
        slug: slug,
        description: cat.description || '',
        image_url: cat.image_url || cat.image || '',
        sort_order: parseInt(cat.sort_order ?? cat.sortOrder, 10) || 0,
        is_active: cat.is_active !== false && cat.isActive !== false
      };

      const res = await fetch(`${this.config.url}/rest/v1/categories`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(row)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] saveCategory note:", e.message);
      return false;
    }
  }

  async deleteCategory(catId) {
    if (!catId) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/categories?id=eq.${catId}`, {
        method: "DELETE",
        headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteCategory note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // INVENTORY MOVEMENTS (PUBLIC.INVENTORY_MOVEMENTS)
  // ==========================================================================
  async recordInventoryMovement(variantId, quantityChange, reason, referenceId = null) {
    if (!variantId || !quantityChange) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const user = await this.getUser();
      const row = {
        id: generateUUID(),
        variant_id: variantId,
        quantity_change: parseInt(quantityChange, 10),
        reason: reason || 'Adjustment',
        reference_id: isUUID(referenceId) ? referenceId : null,
        created_by: user?.id || null,
        created_at: new Date().toISOString()
      };

      const res = await fetch(`${this.config.url}/rest/v1/inventory_movements`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(row)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] recordInventoryMovement note:", e.message);
      return false;
    }
  }

  async fetchInventoryMovements(variantId = null) {
    try {
      let url = `${this.config.url}/rest/v1/inventory_movements?select=*&order=created_at.desc&limit=50`;
      if (variantId) url += `&variant_id=eq.${variantId}`;
      const res = await fetch(url, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchInventoryMovements note:", e.message);
      return [];
    }
  }

  // ==========================================================================
  // DISCOUNTS & COUPONS (PUBLIC.COUPONS)
  // ==========================================================================
  async fetchCoupons() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/coupons?select=*&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchCoupons note:", e.message);
      return [];
    }
  }

  async saveCoupon(coupon) {
    if (!coupon || !coupon.code) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const row = {
        id: isUUID(coupon.id) ? coupon.id : generateUUID(),
        code: String(coupon.code).trim().toUpperCase(),
        discount_type: (coupon.discount_type || coupon.type || 'percent') === 'fixed' ? 'fixed' : 'percent',
        discount_value: parseFloat(coupon.discount_value ?? coupon.discount ?? coupon.value) || 0,
        minimum_order: parseFloat(coupon.minimum_order ?? coupon.minOrder) || 0,
        maximum_discount: coupon.maximum_discount ? parseFloat(coupon.maximum_discount) : null,
        usage_limit: coupon.usage_limit ? parseInt(coupon.usage_limit, 10) : null,
        usage_count: parseInt(coupon.usage_count, 10) || 0,
        starts_at: coupon.starts_at || null,
        expires_at: coupon.expires_at || null,
        is_active: coupon.is_active !== false && coupon.isActive !== false
      };

      const res = await fetch(`${this.config.url}/rest/v1/coupons`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify(row)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] saveCoupon note:", e.message);
      return false;
    }
  }

  async deleteCoupon(couponId) {
    if (!couponId) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/coupons?id=eq.${couponId}`, {
        method: "DELETE",
        headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteCoupon note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // PAYMENTS (PUBLIC.PAYMENTS)
  // ==========================================================================
  async fetchPayments() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/payments?select=*&order=created_at.desc`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchPayments note:", e.message);
      return [];
    }
  }

  async updatePaymentStatus(paymentId, status) {
    if (!paymentId || !status) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/payments?id=eq.${paymentId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: status,
          paid_at: status === 'paid' ? new Date().toISOString() : null
        })
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] updatePaymentStatus note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // STAFF & PERMISSIONS (PUBLIC.PROFILES)
  // ==========================================================================
  async fetchStaffMembers() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/profiles?role=neq.customer&select=*`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchStaffMembers note:", e.message);
      return [];
    }
  }

  async updateStaffRole(userId, newRole) {
    if (!userId || !newRole) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/profiles?user_id=eq.${userId}`, {
        method: "PATCH",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          role: newRole,
          updated_at: new Date().toISOString()
        })
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] updateStaffRole note:", e.message);
      return false;
    }
  }

  // ==========================================================================
  // AUDIT LOGS (PUBLIC.ADMIN_AUDIT_LOGS)
  // ==========================================================================
  async fetchAuditLogs() {
    try {
      const res = await fetch(`${this.config.url}/rest/v1/admin_audit_logs?select=*&order=created_at.desc&limit=100`, {
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${this.config.anonKey}`
        }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.warn("[Admin Supabase DB] fetchAuditLogs note:", e.message);
      return [];
    }
  }

  async recordAuditLog(action, entity, entityId = null, details = {}) {
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const user = await this.getUser();
      const row = {
        id: generateUUID(),
        admin_user_id: user?.id || null,
        action: String(action || 'ACTION'),
        entity: String(entity || 'GENERAL'),
        entity_id: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? details : { raw: details },
        created_at: new Date().toISOString()
      };

      const res = await fetch(`${this.config.url}/rest/v1/admin_audit_logs`, {
        method: "POST",
        headers: {
          "apikey": this.config.anonKey,
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(row)
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] recordAuditLog note:", e.message);
      return false;
    }
  }

  async deleteDeliveryZone(zoneId) {
    if (!zoneId) return false;
    try {
      const session = await this.getSession();
      const token = session?.access_token || this.config.anonKey;
      const res = await fetch(`${this.config.url}/rest/v1/delivery_zones?id=eq.${zoneId}`, {
        method: "DELETE",
        headers: { "apikey": this.config.anonKey, "Authorization": `Bearer ${token}` }
      });
      return res.ok;
    } catch (e) {
      console.warn("[Admin Supabase DB] deleteDeliveryZone note:", e.message);
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
