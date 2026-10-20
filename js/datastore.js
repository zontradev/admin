/**
 * Lashker Traders - Comprehensive Catalog & Persistent Data Store (datastore.js)
 * Fully structured with variants, reviews, address book, B2B applications, and orders.
 */

const INITIAL_STORE_CONFIG = {
  storeName: "Lashker Traders",
  tagline: "Diapers • Baby Care • More",
  subheadline: "Bangladesh's biggest retail diaper seller",
  phone: "01797753722",
  supportEmail: "support@lashkertraders.com",
  currency: "৳",
  currencyCode: "BDT",
  freeDeliveryThreshold: 1200,
  deliveryFeeInsideDhaka: 60,
  deliveryFeeDhakaSubCity: 80,
  deliveryFeeOutsideDhaka: 120,
  activeCoupon: {
    code: "LASHKER10",
    discountPercent: 10,
    description: "Get 10% off on diaper and skincare orders"
  }
};

const PRESET_CATEGORIES = [
  {
    id: "baby-diaper",
    name: "Baby Diaper",
    slug: "baby-diaper",
    aliases: ["diapers"],
    isPopular: true,
    description: "Premium baby tape & pant diapers from trusted global pediatric brands",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 8c2.5-3 13.5-3 16 0 1 5-2 11-8 12-6-1-9-7-8-12z"/><path d="M9 13a3 3 0 0 0 6 0"/></svg>`,
    itemCount: 0,
    bg: "#e0f2fe",
    color: "#0284c7",
    subcategories: ["Belt Diapers", "Pant Diapers", "Overnight Pull-Ups", "Junior Pants"],
    filterConfigs: {
      hasSystem: true,
      systemTitle: "Diaper System",
      systems: ["Belt System", "Pant System"],
      hasSizes: true,
      sizeTitle: "Baby Diaper Size",
      sizes: ["NB", "S", "M", "L", "XL", "XXL", "3XL"]
    }
  },
  {
    id: "adult-diaper",
    name: "Adult Diaper",
    slug: "adult-diaper",
    isPopular: true,
    description: "Medical-grade adult incontinence diapers & senior pull-up pants",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    itemCount: 0,
    bg: "#f0fdf4",
    color: "#059669",
    subcategories: ["Adhesive Belt Diaper", "Pull-Up Underwear", "Bed Underpads"],
    filterConfigs: {
      hasSystem: true,
      systemTitle: "Adult Diaper Style",
      systems: ["Belt", "Pant"],
      hasSizes: true,
      sizeTitle: "Adult Diaper Size",
      sizes: ["S", "M", "L", "XL", "XXL"]
    }
  },
  {
    id: "skin-care",
    name: "Skin Care",
    slug: "skin-care",
    aliases: ["bath-skincare"],
    isPopular: true,
    description: "Hypoallergenic skin lotions, face creams, soothing gels & daily care",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2v3"/><path d="M14 2v3"/><rect x="6" y="5" width="12" height="15" rx="3"/><circle cx="12" cy="13" r="2"/></svg>`,
    itemCount: 0,
    bg: "#fef3c7",
    color: "#d97706",
    subcategories: ["Lotion", "Face Cream", "Moisturizer", "Soothing Gel", "Sunscreen"],
    filterConfigs: {
      hasSkinType: true,
      skinTypeTitle: "Skin Type",
      skinTypes: ["Oily skin", "Dry skin", "Normal Skin", "Sensitive skin"],
      hasSubcategory: true,
      subcategoryTitle: "Skin Product Type"
    }
  },
  {
    id: "wipes",
    name: "Wipes",
    slug: "wipes",
    aliases: ["wipes-tissue"],
    isPopular: true,
    description: "99% pure water wipes, hypoallergenic wet sheets & travel packs",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="12" rx="3"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/><path d="M10 14h4"/></svg>`,
    itemCount: 0,
    bg: "#e0e7ff",
    color: "#4f46e5",
    subcategories: ["Box", "Packet", "Mini"],
    filterConfigs: {
      hasPackaging: true,
      packagingTitle: "Wipes Packaging",
      packagingStyles: ["Box", "Packet", "Mini"],
      hasFeatures: true,
      featureTitle: "Wipe Formulation",
      features: ["Pure Water", "Hypoallergenic", "Fragrance-Free"]
    }
  },
  {
    id: "feeder",
    name: "Feeder",
    slug: "feeder",
    aliases: ["feeding"],
    isPopular: false,
    description: "Anti-colic feeding bottles, peristaltic silicone nipples & feeders",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3h6v3H9z"/><path d="M10 6v3h4V6"/><path d="M8 9h8a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-9a2 2 0 0 1 2-2z"/><line x1="12" y1="13" x2="12" y2="17"/></svg>`,
    itemCount: 0,
    bg: "#dcfce7",
    color: "#16a34a",
    subcategories: ["Glass Feeder", "Plastic Feeder", "Silicone Feeder", "Stainless Steel Feeder"],
    filterConfigs: {
      hasMaterial: true,
      materialTitle: "Bottle Material",
      materials: ["Glass", "Plastic", "Silicon", "Metal"],
      hasCapacity: true,
      capacityTitle: "Bottle Capacity",
      capacities: ["30ml", "60ml", "120ml", "150ml", "200ml", "250ml"]
    }
  },
  {
    id: "tissue",
    name: "Tissue",
    slug: "tissue",
    isPopular: false,
    description: "Ultra-soft facial tissues, travel pocket packs & kitchen towel rolls",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
    itemCount: 0,
    bg: "#f3e8ff",
    color: "#9333ea",
    subcategories: ["Box Facial Tissue", "Pocket Pack", "Kitchen Towel"],
    filterConfigs: {
      hasTissueType: true,
      tissueTypeTitle: "Tissue Pack Type",
      tissueTypes: ["Box Facial Tissue", "Pocket Pack", "Kitchen Towel"],
      hasPly: true,
      plyTitle: "Ply Count",
      plies: ["2-Ply", "3-Ply", "4-Ply"]
    }
  },
  {
    id: "baby-care",
    name: "Baby Care",
    slug: "baby-care",
    isPopular: false,
    description: "Pediatric shampoos, top-to-toe washes, oils, powders & daily care",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z"/><path d="M5 22h14a2 2 0 0 0 2-2v-4a7 7 0 0 0-7-7h-4a7 7 0 0 0-7 7v4a2 2 0 0 0 2 2z"/></svg>`,
    itemCount: 0,
    bg: "#fce7f3",
    color: "#db2777",
    subcategories: ["Shampoo", "Top to Toe", "Baby Oil", "Baby Powder", "Lotion", "Face Cream"],
    filterConfigs: {
      hasSubcategory: true,
      subcategoryTitle: "Baby Care Subcategory",
      isSubcategoryDynamic: true,
      hasSkinType: true,
      skinTypeTitle: "Skin Compatibility",
      skinTypes: ["Normal Skin", "Dry skin", "Sensitive skin"]
    }
  },
  {
    id: "toys",
    name: "Toys",
    slug: "toys",
    aliases: ["accessories"],
    isPopular: false,
    description: "BPA-free teethers, sensory rattles, bath floating toys & plush buddies",
    icon: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="20" r="1"/><circle cx="20" cy="20" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
    itemCount: 0,
    bg: "#ccfbf1",
    color: "#0d9488",
    subcategories: ["Rattles & Teethers", "Bath Toys", "Soft Plush", "Educational"],
    filterConfigs: {
      hasToyType: true,
      toyTypeTitle: "Toy Category",
      toyTypes: ["Rattles & Teethers", "Bath Toys", "Soft Plush", "Educational"]
    }
  }
];

const PRESET_BRANDS = [
  { id: "twinkle", name: "Twinkle", origin: "Bangladesh", verified: true },
  { id: "mamypoko", name: "MamyPoko", origin: "Japan / Unicharm", verified: true },
  { id: "huggies", name: "Huggies", origin: "USA / Kimberly-Clark", verified: true },
  { id: "pampers", name: "Pampers", origin: "USA / P&G", verified: true },
  { id: "johnson", name: "Johnson's Baby", origin: "USA", verified: true },
  { id: "merries", name: "Merries", origin: "Japan", verified: true },
  { id: "chu-chu", name: "Chu Chu", origin: "Bangladesh", verified: true },
  { id: "aveeno", name: "Aveeno Baby", origin: "USA", verified: true },
  { id: "dr-p", name: "Dr. P", origin: "Taiwan / Adult Care", verified: true },
  { id: "friends", name: "Friends", origin: "India / Adult Care", verified: true },
  { id: "pigeon", name: "Pigeon", origin: "Japan", verified: true },
  { id: "philips-avent", name: "Philips Avent", origin: "UK", verified: true },
  { id: "comotomo", name: "Comotomo", origin: "USA", verified: true },
  { id: "bashundhara", name: "Bashundhara", origin: "Bangladesh", verified: true },
  { id: "fay", name: "Fay", origin: "Bangladesh", verified: true },
  { id: "cetaphil", name: "Cetaphil", origin: "Galderma / Switzerland", verified: true },
  { id: "sebamed", name: "Sebamed", origin: "Germany", verified: true },
  { id: "kodomo", name: "Kodomo", origin: "Japan / Lion", verified: true },
  { id: "fisher-price", name: "Fisher-Price", origin: "USA", verified: true }
];

// Clean Slate: Zero Default Categories & Zero Default Brands
const INITIAL_CATEGORIES = [];
const INITIAL_BRANDS = [];

const INITIAL_PRODUCTS = [];

const INITIAL_REVIEWS = [];

const INITIAL_USER_PROFILE = {
  id: "usr-01",
  name: "Sadia Rahman (Demo)",
  phone: "01711223344",
  email: "sadia.rahman@example.com",
  isVerified: true,
  role: "CUSTOMER", // "CUSTOMER" | "B2B_PARTNER" | "ADMIN"
  addresses: [
    {
      id: "addr-1",
      label: "Home (Primary)",
      recipientName: "Sadia Rahman",
      phone: "01711223344",
      address: "House 12, Road 4, Dhanmondi",
      city: "Dhaka",
      zone: "inside-dhaka",
      isDefault: true
    },
    {
      id: "addr-2",
      label: "Parents' House",
      recipientName: "A. Rahman",
      phone: "01819998877",
      address: "Sector 7, Road 14, Uttara",
      city: "Dhaka",
      zone: "inside-dhaka",
      isDefault: false
    }
  ],
  babies: [
    {
      id: "baby-01",
      name: "Ayaan",
      birthDate: "2025-04-18",
      gender: "Boy",
      manualWeight: 6.2,
      weightRecordedDate: "2026-10-18"
    }
  ],
  adults: [
    {
      id: "adult-01",
      name: "Mohammad Ali (Father)",
      age: 68,
      hipSizeInches: 38,
      careType: "Tape Diaper (Bedridden / Incontinence)"
    }
  ]
};

const INITIAL_B2B_APPLICATIONS = [];

/**
 * Robust LocalStorage Persistence Engine
 */
class StorageManager {
  static get(key, defaultValue = null) {
    try {
      const data = localStorage.getItem(`lt_${key}`);
      return data !== null ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.warn("StorageManager error reading", key, e);
      return defaultValue;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(`lt_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn("StorageManager error saving", key, e);
    }
  }

  static getCategories() {
    return this.get("categories", INITIAL_CATEGORIES);
  }

  static saveCategories(cats) {
    this.set("categories", cats);
    if (typeof window !== "undefined" && window.DATA_STORE) {
      window.DATA_STORE.categories = cats;
    }
  }

  static getProducts() {
    const prods = this.get("products", null);
    if (!prods || !Array.isArray(prods)) {
      this.set("products", []);
      return [];
    }
    // If legacy default mock products (e.g. prod-1) are in storage, purge them!
    if (prods.some(p => p.id === "prod-1" && (p.slug === "twinkle-baby-diaper-medium" || p.sku === "TWK-DPR-M44"))) {
      this.set("products", []);
      return [];
    }
    return prods;
  }

  static saveProducts(prods) {
    this.set("products", prods || []);
    if (typeof window !== "undefined" && window.DATA_STORE) {
      window.DATA_STORE.products = prods || [];
    }
  }

  static clearProducts() {
    this.set("products", []);
    if (typeof window !== "undefined" && window.DATA_STORE) {
      window.DATA_STORE.products = [];
    }
  }

  static getReviews() {
    if (this.isOnlineMode()) {
      // ONLINE MODE: Real server reviews only, NO demo reviews
      return this.get("online_reviews", []);
    }
    // OFFLINE MODE: Demo reviews
    return this.get("reviews", INITIAL_REVIEWS);
  }

  static saveReviews(revs) {
    if (this.isOnlineMode()) {
      this.set("online_reviews", revs);
    } else {
      this.set("reviews", revs);
    }
  }

  static getCart() {
    return this.get("cart", []);
  }

  static saveCart(cart) {
    this.set("cart", cart);
  }

  static getBrands() {
    return this.get("brands", INITIAL_BRANDS);
  }

  static saveBrands(brands) {
    this.set("brands", brands);
    if (typeof window !== "undefined" && window.DATA_STORE) {
      window.DATA_STORE.brands = brands;
    }
  }

  static getProductById(id) {
    if (!id) return null;
    const prods = this.getProducts();
    return prods.find(p => p.id === id || p.slug === id) || null;
  }

  static getProductBySlug(slug) {
    if (!slug) return null;
    const prods = this.getProducts();
    return prods.find(p => p.slug === slug || p.id === slug) || null;
  }

  static getBrandById(id) {
    if (!id) return null;
    const brands = this.getBrands();
    return brands.find(b => b.id === id || b.slug === id || (b.name && b.name.toLowerCase() === id.toLowerCase())) || null;
  }

  static isBrandReferenced(brandIdOrName) {
    if (!brandIdOrName) return false;
    const prods = this.getProducts();
    const clean = String(brandIdOrName).toLowerCase();
    return prods.some(p => 
      (p.brandId && String(p.brandId).toLowerCase() === clean) ||
      (p.brand && String(p.brand).toLowerCase() === clean)
    );
  }

  static getCategoryById(id) {
    if (!id) return null;
    const cats = this.getCategories();
    return cats.find(c => c.id === id || c.slug === id) || null;
  }

  static isCategoryReferenced(catIdOrSlug) {
    if (!catIdOrSlug) return false;
    const prods = this.getProducts();
    const clean = String(catIdOrSlug).toLowerCase();
    return prods.some(p => 
      (p.categoryId && String(p.categoryId).toLowerCase() === clean) ||
      (p.category && String(p.category).toLowerCase() === clean)
    );
  }

  static updateVariantStock(productId, variantId, newStock) {
    const prods = this.getProducts();
    const prod = prods.find(p => p.id === productId);
    if (!prod) return false;
    
    const qty = Math.max(0, parseInt(newStock, 10) || 0);

    if (Array.isArray(prod.variants) && prod.variants.length > 0) {
      const v = prod.variants.find(item => item.id === variantId || item.sku === variantId);
      if (v) {
        v.stock = qty;
        v.stockCount = qty;
        v.inStock = qty > 0;
        prod.stock = prod.variants.reduce((acc, curr) => acc + (curr.stock || 0), 0);
        prod.stockCount = prod.stock;
        prod.inStock = prod.stock > 0;
        this.saveProducts(prods);
        return true;
      }
    } else {
      prod.stock = qty;
      prod.stockCount = qty;
      prod.inStock = qty > 0;
      this.saveProducts(prods);
      return true;
    }
    return false;
  }

  static resetAllToCleanCatalog() {
    this.set("products", []);
    this.set("orders", []);
    this.set("online_orders", []);
    this.set("reviews", []);
    this.set("online_reviews", []);
    this.set("cart", []);
    this.set("wishlist", []);
    this.set("online_wishlist", []);
    if (typeof window !== "undefined" && window.DATA_STORE) {
      window.DATA_STORE.products = [];
      window.DATA_STORE.reviews = [];
    }
  }

  static getWishlist() {
    if (this.isOnlineMode()) {
      return this.get("online_wishlist", []);
    }
    return this.get("wishlist", ["demo-item-1"]);
  }

  static saveWishlist(wishlist) {
    if (this.isOnlineMode()) {
      this.set("online_wishlist", wishlist);
    } else {
      this.set("wishlist", wishlist);
    }
  }

  static isOnlineMode() {
    if (typeof window !== "undefined" && window.FirebaseService) {
      return Boolean(window.FirebaseService.isOnlineMode);
    }
    if (typeof localStorage !== "undefined") {
      try {
        const saved = localStorage.getItem("lt_connection_mode");
        if (saved !== null) return saved === "online";
      } catch (e) {}
    }
    return true; // Default to online server connection
  }

  static getOrders() {
    if (this.isOnlineMode()) {
      return this.get("online_orders", []);
    }
    return this.get("orders", [
      {
        orderId: "LT-88421",
        date: "2026-10-17",
        customer: {
          name: "Sadia Rahman (Demo)",
          phone: "01711223344",
          address: "House 12, Road 4, Dhanmondi, Dhaka",
          deliveryZone: "inside-dhaka"
        },
        items: [
          {
            id: "demo-item-1",
            sku: "TWK-BDP-M-44",
            name: "Twinkle Baby Diaper (M)",
            quantity: 2,
            price: 1250,
            image: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=300&q=80"
          }
        ],
        subtotal: 2500,
        discount: 250,
        shipping: 0,
        total: 2250,
        status: "Out for Delivery",
        paymentMethod: "Cash on Delivery",
        trackingUpdates: [
          { status: "Placed", timestamp: "2026-10-17 10:15 AM", note: "Order registered in system" },
          { status: "Confirmed", timestamp: "2026-10-17 11:30 AM", note: "Stock verified by warehouse" },
          { status: "Packed", timestamp: "2026-10-17 02:00 PM", note: "Bag sealed with invoice" },
          { status: "Out for Delivery", timestamp: "2026-10-18 09:00 AM", note: "Rider assigned (Dhanmondi Hub)" }
        ]
      }
    ]);
  }

  static saveOrders(orders) {
    if (this.isOnlineMode()) {
      this.set("online_orders", orders);
    } else {
      this.set("orders", orders);
    }
  }

  static getUser() {
    if (this.isOnlineMode()) {
      // ONLINE MODE: NO DEMO DATA. Requires logged-in account
      const fbUser = this.get("firebase_user", null);
      if (fbUser && fbUser.uid) {
        return this.get(`user_${fbUser.uid}`, {
          id: fbUser.uid,
          name: fbUser.displayName || "",
          phone: fbUser.phone || "",
          email: fbUser.email || "",
          isVerified: Boolean(fbUser.emailVerified),
          role: "CUSTOMER",
          addresses: [],
          babies: [],
          adults: []
        });
      }
      return {
        id: null,
        name: "",
        phone: "",
        email: "",
        isVerified: false,
        role: "GUEST",
        addresses: [],
        babies: [],
        adults: []
      };
    }
    // OFFLINE MODE: Demo default profile
    return this.get("user", INITIAL_USER_PROFILE);
  }

  static saveUser(user) {
    if (this.isOnlineMode()) {
      const fbUser = this.get("firebase_user", null);
      if (fbUser && fbUser.uid) {
        this.set(`user_${fbUser.uid}`, user);
      }
    } else {
      this.set("user", user);
    }
  }

  static getB2BApplications() {
    if (this.isOnlineMode()) {
      return this.get("online_b2b_apps", []);
    }
    return this.get("b2b_apps", INITIAL_B2B_APPLICATIONS);
  }

  static saveB2BApplications(apps) {
    if (this.isOnlineMode()) {
      this.set("online_b2b_apps", apps);
    } else {
      this.set("b2b_apps", apps);
    }
  }

  static getConfig() {
    return this.get("config", INITIAL_STORE_CONFIG);
  }

  static saveConfig(cfg) {
    this.set("config", cfg);
  }

  static getDeliveryConfig() {
    return this.get("delivery_config", {
      freeDeliveryThreshold: 1200,
      freeDeliveryEnabled: true,
      zones: [
        { id: "inside_dhaka", name: "Inside Dhaka City", fee: 60, estimate: "24-48 Hours", isActive: true },
        { id: "dhaka_subcity", name: "Dhaka Sub-City (Gazipur, Savar, Narayanganj)", fee: 80, estimate: "2-3 Days", isActive: true },
        { id: "outside_dhaka", name: "Outside Dhaka (All 64 Districts)", fee: 120, estimate: "3-5 Days", isActive: true }
      ]
    });
  }

  static saveDeliveryConfig(config) {
    this.set("delivery_config", config);
  }

  static getAuditLogs() {
    return this.get("audit_logs", [
      { id: "log-1", actor: "admin@lashkertraders.com", action: "ORDER_FULFILLMENT_UPDATE", entity: "Order", entityId: "LT-10045", details: { newStatus: "Processing" }, timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: "log-2", actor: "admin@lashkertraders.com", action: "PRODUCT_CATALOG_UPDATE", entity: "Product", entityId: "BD-M-001", details: { note: "Updated price and stock" }, timestamp: new Date(Date.now() - 7200000).toISOString() },
      { id: "log-3", actor: "admin@lashkertraders.com", action: "B2B_APPLICATION_APPROVAL", entity: "B2BApplication", entityId: "app-101", details: { status: "Approved" }, timestamp: new Date(Date.now() - 14400000).toISOString() },
      { id: "log-4", actor: "admin@lashkertraders.com", action: "DELIVERY_ZONE_UPDATE", entity: "DeliveryZone", entityId: "inside_dhaka", details: { threshold: 1200 }, timestamp: new Date(Date.now() - 86400000).toISOString() }
    ]);
  }

  static saveAuditLogs(logs) {
    this.set("audit_logs", logs);
  }

  static getStaffMembers() {
    return this.get("staff_members", [
      { id: "staff-1", name: "Admin", email: "admin@lashkertraders.com", role: "super_admin", status: "Active", lastLogin: "Just now" },
      { id: "staff-2", name: "Catalog Specialist", email: "catalog@lashkertraders.com", role: "catalog_manager", status: "Active", lastLogin: "2 hours ago" },
      { id: "staff-3", name: "Fulfillment Officer", email: "dispatch@lashkertraders.com", role: "order_manager", status: "Active", lastLogin: "Yesterday" }
    ]);
  }

  static saveStaffMembers(members) {
    this.set("staff_members", members);
  }

  static getPayments() {
    return this.get("payments", [
      { id: "pay-1", orderId: "LT-10045", customerName: "Rahim Uddin", amount: 2450, currency: "BDT", method: "Cash on Delivery", status: "Pending", reference: "COD-LT10045", date: "May 4, 2025" },
      { id: "pay-2", orderId: "LT-10044", customerName: "Ayesha Akter", amount: 1280, currency: "BDT", method: "bKash Online", status: "Paid", reference: "TRX938472918", date: "May 4, 2025" },
      { id: "pay-3", orderId: "LT-10043", customerName: "Md. Kamrul Hasan", amount: 3620, currency: "BDT", method: "Cash on Delivery", status: "Pending", reference: "COD-LT10043", date: "May 4, 2025" },
      { id: "pay-4", orderId: "LT-10042", customerName: "Fatema Jahan", amount: 980, currency: "BDT", method: "Nagad Online", status: "Paid", reference: "TRX847291048", date: "May 3, 2025" },
      { id: "pay-5", orderId: "LT-10041", customerName: "Sabbir Hossain", amount: 4350, currency: "BDT", method: "Cash on Delivery", status: "Paid", reference: "COD-COLLECTED", date: "May 3, 2025" }
    ]);
  }

  static savePayments(pays) {
    this.set("payments", pays);
  }
}

// Global data store exports
var DATA_STORE = {
  config: StorageManager.getConfig(),
  categories: StorageManager.getCategories(),
  brands: INITIAL_BRANDS,
  products: StorageManager.getProducts(),
  reviews: StorageManager.getReviews(),
  heroSlides: [
    {
      id: "slide-1",
      badge: "Bangladesh's #1 Retail Diaper Destination",
      title: "Lashker Traders",
      subtitle: "Bangladesh biggest retail diaper seller",
      pitch: "Premium Diapers for Happy Babies",
      slogan: "Happy Baby Happy Yous!",
      highlightFeatures: [
        { icon: "feather", text: "Soft & Comfortable" },
        { icon: "shield", text: "For Healthy Skin" },
        { icon: "heart", text: "Trusted by Parents" }
      ],
      ctaText: "Shop Now",
      ctaLink: "#/catalog",
      bgGradient: "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #fdf2f8 100%)"
    },
    {
      id: "slide-2",
      badge: "MamyPoko & Twinkle Mega Offer",
      title: "Up to 20% OFF",
      subtitle: "Stock up on premium baby diapers",
      pitch: "Dry Nights • Zero Rashes • Pure Love",
      slogan: "Caring For Your Little Sunshine",
      highlightFeatures: [
        { icon: "shield", text: "100% Genuine Brands" },
        { icon: "feather", text: "Speed Dry Technology" },
        { icon: "heart", text: "Free Fast Dhaka Delivery" }
      ],
      ctaText: "Claim Discount",
      ctaLink: "#/catalog?category=diapers",
      bgGradient: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 50%, #f5f3ff 100%)"
    }
  ]
};

// Expose globally
window.DATA_STORE = DATA_STORE;
window.StorageManager = StorageManager;
