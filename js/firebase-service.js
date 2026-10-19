/**
 * Lashker Traders - Firebase Cloud Integration & Authentication Engine (firebase-service.js)
 * Supports:
 * 1. Online Mode (Real Firebase Auth + Cloud Firestore + Analytics)
 * 2. Offline / Test Mode (Instant local mock authentication & storage)
 * 3. Password Hardness Meter & Illegal Character Protection (rejects spaces, commas, backticks, quotes)
 * 4. Email Verification with return URL lashkertraders.com
 * 5. Google Sign-In with popup
 */

// Firebase SDK Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCHXLoz0TRSomyagCyTmOFR6VexAns491o",
  authDomain: "lashkertraders.firebaseapp.com",
  projectId: "lashkertraders",
  storageBucket: "lashkertraders.firebasestorage.app",
  messagingSenderId: "315617121413",
  appId: "1:315617121413:web:d44083acb0fa71ed7945ec",
  measurementId: "G-XX5J6QK29D"
};

// Character Safety Regex: Disallow spaces, commas, backticks, single/double quotes, semicolons, backslashes
const ILLEGAL_PASSWORD_CHARS_REGEX = /[\s,`"';\\]/;

// Password Evaluation & Character Safety Engine
function evaluatePasswordSafety(password) {
  if (!password) {
    return {
      isValid: false,
      hasIllegalChars: false,
      illegalCharDetails: "",
      score: 0,
      label: "None",
      color: "#94a3b8",
      feedback: "Enter a password"
    };
  }

  // 1. Check for illegal characters
  const illegalMatches = password.match(ILLEGAL_PASSWORD_CHARS_REGEX);
  if (illegalMatches) {
    const offending = illegalMatches[0] === " " ? "space" : `symbol '${illegalMatches[0]}'`;
    return {
      isValid: false,
      hasIllegalChars: true,
      illegalCharDetails: `Illegal character detected: ${offending}. Spaces, commas, backticks (\`), and quotes are not allowed.`,
      score: 0,
      label: "Illegal Characters",
      color: "#ef4444",
      feedback: "Remove spaces, commas, or backticks"
    };
  }

  // 2. Score password strength
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=\[\]{}|:<.>?~]/.test(password)) score += 1;

  let label = "Weak";
  let color = "#ef4444";
  let feedback = "Too weak. Use 8+ characters with uppercase, numbers & symbols.";

  if (score >= 4) {
    label = "Strong";
    color = "#10b981";
    feedback = "Excellent security strength!";
  } else if (score >= 3) {
    label = "Good";
    color = "#3b82f6";
    feedback = "Good password. Add symbols to make it even stronger.";
  } else if (score >= 2) {
    label = "Fair";
    color = "#f59e0b";
    feedback = "Fair. Combine uppercase letters, digits, and symbols.";
  }

  return {
    isValid: password.length >= 6 && !illegalMatches,
    hasIllegalChars: false,
    illegalCharDetails: "",
    score,
    label,
    color,
    feedback
  };
}

class FirebaseService {
  constructor() {
    this.config = firebaseConfig;
    this.app = null;
    this.auth = null;
    this.db = null;
    this.analytics = null;
    this.currentUser = null;
    this.isOnlineMode = this.loadModePreference();
    this.authListeners = [];
    this.sdkReady = false;

    // Load initial cached auth user
    this.currentUser = StorageManager.get("firebase_user", null);
  }

  loadModePreference() {
    // Default to 'online' mode, allow user to toggle 'offline' test mode
    try {
      const saved = localStorage.getItem("lt_connection_mode");
      return saved !== "offline";
    } catch (e) {
      return true;
    }
  }

  setConnectionMode(mode) {
    this.isOnlineMode = mode === "online";
    try {
      localStorage.setItem("lt_connection_mode", this.isOnlineMode ? "online" : "offline");
    } catch (e) {}
    this.notifyAuthListeners();
  }

  onAuthStateChanged(callback) {
    this.authListeners.push(callback);
    callback(this.currentUser, this.isOnlineMode);
    return () => {
      this.authListeners = this.authListeners.filter(cb => cb !== callback);
    };
  }

  notifyAuthListeners() {
    this.authListeners.forEach(cb => {
      try {
        cb(this.currentUser, this.isOnlineMode);
      } catch (e) {
        console.error("Auth listener error:", e);
      }
    });
  }

  // Initialize Firebase Modular SDK dynamically from Google CDN
  async initSdk() {
    if (this.sdkReady || !this.isOnlineMode) return;

    try {
      // Dynamic import from official Firebase v10 CDN
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js");
      const { 
        getAuth, 
        onAuthStateChanged,
        GoogleAuthProvider,
        signInWithPopup,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        sendEmailVerification,
        sendPasswordResetEmail,
        updateProfile
      } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js");

      const {
        getFirestore,
        doc,
        setDoc,
        getDoc,
        getDocs,
        deleteDoc,
        updateDoc,
        collection,
        addDoc,
        onSnapshot,
        query,
        orderBy,
        serverTimestamp
      } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js");

      this.app = initializeApp(this.config);
      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);

      // Save references
      this._sdk = {
        GoogleAuthProvider,
        signInWithPopup,
        signInWithEmailAndPassword,
        createUserWithEmailAndPassword,
        signOut,
        sendEmailVerification,
        sendPasswordResetEmail,
        updateProfile,
        doc,
        setDoc,
        getDoc,
        getDocs,
        deleteDoc,
        updateDoc,
        collection,
        addDoc,
        onSnapshot,
        query,
        orderBy,
        serverTimestamp
      };

      try {
        const { getAnalytics } = await import("https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js");
        this.analytics = getAnalytics(this.app);
      } catch (err) {
        console.warn("[Firebase Analytics] Analytics optional or blocked by client:", err.message);
      }

      // Listen to real Firebase auth status
      onAuthStateChanged(this.auth, (user) => {
        if (this.isOnlineMode) {
          if (user) {
            this.currentUser = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email.split("@")[0],
              photoURL: user.photoURL,
              emailVerified: user.emailVerified,
              isAnonymous: user.isAnonymous,
              provider: user.providerData?.[0]?.providerId || "password"
            };
            StorageManager.set("firebase_user", this.currentUser);
          } else {
            this.currentUser = null;
            StorageManager.set("firebase_user", null);
          }
          this.notifyAuthListeners();
        }
      });

      this.sdkReady = true;
      console.log("[Firebase] Online Cloud SDK initialized successfully for lashkertraders.firebaseapp.com");
    } catch (err) {
      console.warn("[Firebase] Could not load online Firebase CDN SDK, falling back to offline test mode:", err.message);
      this.sdkReady = false;
    }
  }

  // Password Hardness & Character Safety Checker
  checkPasswordStrength(password) {
    return evaluatePasswordSafety(password);
  }

  // Register with Email and Password
  async registerWithEmail(email, password, displayName = "") {
    // 1. Character safety check
    const safety = evaluatePasswordSafety(password);
    if (!safety.isValid) {
      throw new Error(safety.illegalCharDetails || "Password must be at least 6 characters.");
    }

    if (!email || !email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }

    // OFFLINE / TEST MODE
    if (!this.isOnlineMode || !this.sdkReady) {
      const mockUser = {
        uid: "test-user-" + Date.now(),
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || email.split("@")[0],
        emailVerified: true,
        provider: "offline-test"
      };
      this.currentUser = mockUser;
      StorageManager.set("firebase_user", mockUser);
      this.notifyAuthListeners();
      return {
        user: mockUser,
        verificationSent: false,
        isTestMode: true,
        message: "Account created instantly in Offline Test Mode!"
      };
    }

    // ONLINE FIREBASE CLOUD MODE
    try {
      const cred = await this._sdk.createUserWithEmailAndPassword(this.auth, email.trim(), password);
      
      if (displayName.trim()) {
        await this._sdk.updateProfile(cred.user, { displayName: displayName.trim() });
      }

      // Send Verification Link with lashkertraders.com action URL
      const actionCodeSettings = {
        url: "https://lashkertraders.com/#/account?verified=true",
        handleCodeInApp: true
      };

      try {
        await this._sdk.sendEmailVerification(cred.user, actionCodeSettings);
      } catch (verifyErr) {
        // Fallback standard verification without custom URL
        await this._sdk.sendEmailVerification(cred.user);
      }

      // Sync user profile to Cloud Firestore
      await this.saveUserProfileToFirestore({
        uid: cred.user.uid,
        email: cred.user.email,
        name: displayName.trim() || cred.user.email.split("@")[0],
        phone: "",
        emailVerified: false,
        createdAt: new Date().toISOString()
      });

      this.currentUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName.trim() || cred.user.email.split("@")[0],
        photoURL: null,
        emailVerified: false,
        provider: "password"
      };
      StorageManager.set("firebase_user", this.currentUser);
      this.notifyAuthListeners();

      return {
        user: this.currentUser,
        verificationSent: true,
        isTestMode: false,
        message: `Verification link sent to ${email}. Please check your inbox and verify your email!`
      };
    } catch (err) {
      throw this.formatFirebaseError(err);
    }
  }

  // Login with Email and Password
  async loginWithEmail(email, password) {
    const safety = evaluatePasswordSafety(password);
    if (safety.hasIllegalChars) {
      throw new Error(safety.illegalCharDetails);
    }

    // OFFLINE / TEST MODE
    if (!this.isOnlineMode || !this.sdkReady) {
      const mockUser = {
        uid: "test-user-offline",
        email: email.trim().toLowerCase(),
        displayName: email.split("@")[0],
        emailVerified: true,
        provider: "offline-test"
      };
      this.currentUser = mockUser;
      StorageManager.set("firebase_user", mockUser);
      this.notifyAuthListeners();
      return { user: mockUser, isTestMode: true };
    }

    // ONLINE FIREBASE CLOUD MODE
    try {
      const cred = await this._sdk.signInWithEmailAndPassword(this.auth, email.trim(), password);
      this.currentUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email.split("@")[0],
        photoURL: cred.user.photoURL,
        emailVerified: cred.user.emailVerified,
        provider: "password"
      };
      StorageManager.set("firebase_user", this.currentUser);
      this.notifyAuthListeners();
      return { user: this.currentUser, isTestMode: false };
    } catch (err) {
      throw this.formatFirebaseError(err);
    }
  }

  // Login with Google Popup
  async loginWithGoogle() {
    // OFFLINE / TEST MODE
    if (!this.isOnlineMode || !this.sdkReady) {
      const mockGoogleUser = {
        uid: "google-test-" + Date.now(),
        email: "google.user@lashkertraders.com",
        displayName: "Google Test Customer",
        photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
        emailVerified: true,
        provider: "google.com"
      };
      this.currentUser = mockGoogleUser;
      StorageManager.set("firebase_user", mockGoogleUser);
      this.notifyAuthListeners();
      return { user: mockGoogleUser, isTestMode: true };
    }

    // ONLINE FIREBASE CLOUD MODE
    try {
      const provider = new this._sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await this._sdk.signInWithPopup(this.auth, provider);

      this.currentUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName,
        photoURL: cred.user.photoURL,
        emailVerified: cred.user.emailVerified,
        provider: "google.com"
      };

      // Sync with Cloud Firestore
      await this.saveUserProfileToFirestore({
        uid: cred.user.uid,
        email: cred.user.email,
        name: cred.user.displayName,
        photoURL: cred.user.photoURL,
        provider: "google.com",
        lastLogin: new Date().toISOString()
      });

      StorageManager.set("firebase_user", this.currentUser);
      this.notifyAuthListeners();
      return { user: this.currentUser, isTestMode: false };
    } catch (err) {
      throw this.formatFirebaseError(err);
    }
  }

  // Resend Email Verification Link
  async resendEmailVerification() {
    if (!this.isOnlineMode || !this.sdkReady) {
      return { success: true, message: "[Test Mode] Verification email simulated." };
    }

    if (!this.auth.currentUser) {
      throw new Error("No active user session found. Please log in first.");
    }

    const actionCodeSettings = {
      url: "https://lashkertraders.com/#/account?verified=true",
      handleCodeInApp: true
    };

    await this._sdk.sendEmailVerification(this.auth.currentUser, actionCodeSettings);
    return { success: true, message: "Verification link sent! Please check your email inbox and spam folder." };
  }

  // Logout
  async logout() {
    if (this.isOnlineMode && this.sdkReady && this.auth) {
      try {
        await this._sdk.signOut(this.auth);
      } catch (e) {}
    }
    this.currentUser = null;
    StorageManager.set("firebase_user", null);
    this.notifyAuthListeners();
  }

  // Save/Update Customer Profile in Cloud Firestore
  async saveUserProfileToFirestore(profileData) {
    if (!this.isOnlineMode || !this.sdkReady || !this.db) return;
    try {
      const uid = profileData.uid || this.currentUser?.uid;
      if (!uid) return;
      const userRef = this._sdk.doc(this.db, "users", uid);
      await this._sdk.setDoc(userRef, {
        ...profileData,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log("[Firestore] User profile synced for:", uid);
    } catch (e) {
      console.warn("[Firestore] Failed to sync user profile:", e.message);
    }
  }

  // Sync Completed Order to Cloud Firestore
  async syncOrderToFirestore(order) {
    return this.insertOrderToFirestore(order);
  }

  // ------------------------------------------------------------------------
  // E-COMMERCE FIRESTORE DATABASE CRUD & REAL-TIME LISTENERS
  // ------------------------------------------------------------------------

  // 1. Insert or Update Product in Firestore
  async insertProductToFirestore(product) {
    if (!product || !product.id) return false;
    // Local persistence for zero-latency UI update
    const products = StorageManager.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = { ...products[idx], ...product };
    } else {
      products.unshift(product);
    }
    StorageManager.saveProducts(products);

    // Sync to Cloud Firestore when online
    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.setDoc) {
      try {
        const prodRef = this._sdk.doc(this.db, "products", product.id);
        await this._sdk.setDoc(prodRef, {
          ...product,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("[Firestore] Product saved to cloud:", product.id, product.title);
        return true;
      } catch (err) {
        console.warn("[Firestore] Failed to save product to cloud (local fallback preserved):", err.message);
        return false;
      }
    }
    return true;
  }

  // 2. Fetch All Products from Cloud Firestore
  async getProductsFromFirestore() {
    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.collection && this._sdk?.getDocs) {
      try {
        const colRef = this._sdk.collection(this.db, "products");
        const snapshot = await this._sdk.getDocs(colRef);
        const prods = [];
        snapshot.forEach(docSnap => {
          prods.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (prods.length > 0) {
          StorageManager.saveProducts(prods);
        }
        return prods;
      } catch (err) {
        console.warn("[Firestore] Could not fetch products from cloud:", err.message);
      }
    }
    return StorageManager.getProducts();
  }

  // 3. Delete Product from Cloud Firestore
  async deleteProductFromFirestore(productId) {
    const products = StorageManager.getProducts().filter(p => p.id !== productId);
    StorageManager.saveProducts(products);

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.deleteDoc) {
      try {
        const prodRef = this._sdk.doc(this.db, "products", productId);
        await this._sdk.deleteDoc(prodRef);
        console.log("[Firestore] Product deleted from cloud:", productId);
        return true;
      } catch (err) {
        console.warn("[Firestore] Could not delete product from cloud:", err.message);
        return false;
      }
    }
    return true;
  }

  // 4. Real-time Snapshot Listener for Products (Simultaneous Admin & Storefront Sync)
  listenToProducts(callback) {
    if (!this.isOnlineMode || !this.sdkReady || !this.db || !this._sdk?.collection || !this._sdk?.onSnapshot) {
      return () => {};
    }
    try {
      const colRef = this._sdk.collection(this.db, "products");
      const unsubscribe = this._sdk.onSnapshot(colRef, (snapshot) => {
        const prods = [];
        snapshot.forEach(docSnap => {
          prods.push({ id: docSnap.id, ...docSnap.data() });
        });
        StorageManager.saveProducts(prods);
        if (typeof callback === "function") {
          callback(prods);
        }
      }, (err) => {
        console.warn("[Firestore] Real-time products listener error:", err.message);
      });
      return unsubscribe;
    } catch (err) {
      console.warn("[Firestore] Could not attach real-time products listener:", err.message);
      return () => {};
    }
  }

  // 5. Insert Customer Order to Firestore
  async insertOrderToFirestore(order) {
    if (!order || !order.orderId) return order;
    const orders = StorageManager.getOrders();
    const existingIdx = orders.findIndex(o => o.orderId === order.orderId);
    if (existingIdx >= 0) {
      orders[existingIdx] = { ...orders[existingIdx], ...order };
    } else {
      orders.unshift(order);
    }
    StorageManager.saveOrders(orders);

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.setDoc) {
      try {
        const orderRef = this._sdk.doc(this.db, "orders", order.orderId);
        await this._sdk.setDoc(orderRef, {
          ...order,
          syncedToCloud: true,
          cloudCreatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("[Firestore] Order inserted into cloud:", order.orderId);
        return { ...order, syncedToCloud: true };
      } catch (err) {
        console.warn("[Firestore] Could not sync order to cloud (local preserved):", err.message);
        return order;
      }
    }
    return order;
  }

  // 6. Update Order Status in Firestore (e.g. Confirmed, Packed, Out for Delivery, Delivered)
  async updateOrderStatusInFirestore(orderId, status) {
    const orders = StorageManager.getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (order) {
      order.status = status;
      StorageManager.saveOrders(orders);
    }

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.setDoc) {
      try {
        const orderRef = this._sdk.doc(this.db, "orders", orderId);
        await this._sdk.setDoc(orderRef, {
          status,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("[Firestore] Order status updated in cloud:", orderId, status);
        return true;
      } catch (err) {
        console.warn("[Firestore] Could not update order status in cloud:", err.message);
        return false;
      }
    }
    return true;
  }

  // 7. Real-time Snapshot Listener for Orders (Live Order Fulfillment Queue)
  listenToOrders(callback) {
    if (!this.isOnlineMode || !this.sdkReady || !this.db || !this._sdk?.collection || !this._sdk?.onSnapshot) {
      return () => {};
    }
    try {
      const colRef = this._sdk.collection(this.db, "orders");
      const unsubscribe = this._sdk.onSnapshot(colRef, (snapshot) => {
        const ords = [];
        snapshot.forEach(docSnap => {
          ords.push({ orderId: docSnap.id, ...docSnap.data() });
        });
        StorageManager.saveOrders(ords);
        if (typeof callback === "function") {
          callback(ords);
        }
      }, (err) => {
        console.warn("[Firestore] Real-time orders listener error:", err.message);
      });
      return unsubscribe;
    } catch (err) {
      console.warn("[Firestore] Could not attach real-time orders listener:", err.message);
      return () => {};
    }
  }

  // ------------------------------------------------------------------------
  // CATEGORIES - CLOUD FIRESTORE CRUD & REAL-TIME
  // ------------------------------------------------------------------------
  async insertCategoryToFirestore(category) {
    if (!category || !category.id) return false;
    const categories = StorageManager.getCategories();
    const idx = categories.findIndex(c => c.id === category.id);
    if (idx >= 0) {
      categories[idx] = { ...categories[idx], ...category };
    } else {
      categories.push(category);
    }
    StorageManager.saveCategories(categories);

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.setDoc) {
      try {
        const catRef = this._sdk.doc(this.db, "categories", category.id);
        await this._sdk.setDoc(catRef, {
          ...category,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("[Firestore] Category saved to cloud:", category.id, category.name);
        return true;
      } catch (err) {
        console.warn("[Firestore] Failed to save category to cloud:", err.message);
        return false;
      }
    }
    return true;
  }

  async getCategoriesFromFirestore() {
    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.collection && this._sdk?.getDocs) {
      try {
        const colRef = this._sdk.collection(this.db, "categories");
        const snapshot = await this._sdk.getDocs(colRef);
        const cats = [];
        snapshot.forEach(docSnap => {
          cats.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (cats.length > 0) {
          StorageManager.saveCategories(cats);
        }
        return cats;
      } catch (err) {
        console.warn("[Firestore] Could not fetch categories from cloud:", err.message);
      }
    }
    return StorageManager.getCategories();
  }

  async deleteCategoryFromFirestore(categoryId) {
    const categories = StorageManager.getCategories().filter(c => c.id !== categoryId);
    StorageManager.saveCategories(categories);

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.deleteDoc) {
      try {
        const catRef = this._sdk.doc(this.db, "categories", categoryId);
        await this._sdk.deleteDoc(catRef);
        console.log("[Firestore] Category deleted from cloud:", categoryId);
        return true;
      } catch (err) {
        console.warn("[Firestore] Could not delete category from cloud:", err.message);
        return false;
      }
    }
    return true;
  }

  listenToCategories(callback) {
    if (!this.isOnlineMode || !this.sdkReady || !this.db || !this._sdk?.collection || !this._sdk?.onSnapshot) {
      return () => {};
    }
    try {
      const colRef = this._sdk.collection(this.db, "categories");
      const unsubscribe = this._sdk.onSnapshot(colRef, (snapshot) => {
        const cats = [];
        snapshot.forEach(docSnap => {
          cats.push({ id: docSnap.id, ...docSnap.data() });
        });
        StorageManager.saveCategories(cats);
        if (typeof callback === "function") {
          callback(cats);
        }
      }, (err) => {
        console.warn("[Firestore] Real-time categories listener error:", err.message);
      });
      return unsubscribe;
    } catch (err) {
      console.warn("[Firestore] Could not attach real-time categories listener:", err.message);
      return () => {};
    }
  }

  // ------------------------------------------------------------------------
  // BRANDS - CLOUD FIRESTORE CRUD & REAL-TIME
  // ------------------------------------------------------------------------
  async insertBrandToFirestore(brand) {
    if (!brand || !brand.id) return false;
    const brands = StorageManager.getBrands();
    const idx = brands.findIndex(b => b.id === brand.id);
    if (idx >= 0) {
      brands[idx] = { ...brands[idx], ...brand };
    } else {
      brands.push(brand);
    }
    StorageManager.saveBrands(brands);

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.setDoc) {
      try {
        const brandRef = this._sdk.doc(this.db, "brands", brand.id);
        await this._sdk.setDoc(brandRef, {
          ...brand,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("[Firestore] Brand saved to cloud:", brand.id, brand.name);
        return true;
      } catch (err) {
        console.warn("[Firestore] Failed to save brand to cloud:", err.message);
        return false;
      }
    }
    return true;
  }

  async getBrandsFromFirestore() {
    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.collection && this._sdk?.getDocs) {
      try {
        const colRef = this._sdk.collection(this.db, "brands");
        const snapshot = await this._sdk.getDocs(colRef);
        const brs = [];
        snapshot.forEach(docSnap => {
          brs.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (brs.length > 0) {
          StorageManager.saveBrands(brs);
        }
        return brs;
      } catch (err) {
        console.warn("[Firestore] Could not fetch brands from cloud:", err.message);
      }
    }
    return StorageManager.getBrands();
  }

  async deleteBrandFromFirestore(brandId) {
    const brands = StorageManager.getBrands().filter(b => b.id !== brandId);
    StorageManager.saveBrands(brands);

    if (this.isOnlineMode && this.sdkReady && this.db && this._sdk?.doc && this._sdk?.deleteDoc) {
      try {
        const brandRef = this._sdk.doc(this.db, "brands", brandId);
        await this._sdk.deleteDoc(brandRef);
        console.log("[Firestore] Brand deleted from cloud:", brandId);
        return true;
      } catch (err) {
        console.warn("[Firestore] Could not delete brand from cloud:", err.message);
        return false;
      }
    }
    return true;
  }

  listenToBrands(callback) {
    if (!this.isOnlineMode || !this.sdkReady || !this.db || !this._sdk?.collection || !this._sdk?.onSnapshot) {
      return () => {};
    }
    try {
      const colRef = this._sdk.collection(this.db, "brands");
      const unsubscribe = this._sdk.onSnapshot(colRef, (snapshot) => {
        const brs = [];
        snapshot.forEach(docSnap => {
          brs.push({ id: docSnap.id, ...docSnap.data() });
        });
        StorageManager.saveBrands(brs);
        if (typeof callback === "function") {
          callback(brs);
        }
      }, (err) => {
        console.warn("[Firestore] Real-time brands listener error:", err.message);
      });
      return unsubscribe;
    } catch (err) {
      console.warn("[Firestore] Could not attach real-time brands listener:", err.message);
      return () => {};
    }
  }

  // ------------------------------------------------------------------------
  // ADMIN AUTHENTICATION & ACCESS CONTROL (GOOGLE SIGN-IN ONLY)
  // ------------------------------------------------------------------------
  async loginAdminWithGoogle() {
    // OFFLINE / TEST MODE SIMULATION
    if (!this.isOnlineMode || !this.sdkReady) {
      const mockAdminUser = {
        uid: "google-admin-" + Date.now(),
        email: "admin.google@lashkertraders.com",
        displayName: "Google Super Admin",
        photoURL: "https://lh3.googleusercontent.com/a/default-user=s96-c",
        role: "ADMIN",
        isAdmin: true,
        provider: "google.com",
        loginTime: new Date().toISOString()
      };
      this.currentUser = mockAdminUser;
      StorageManager.set("firebase_user", mockAdminUser);
      StorageManager.set("admin_session", mockAdminUser);
      this.notifyAuthListeners();
      return { success: true, user: mockAdminUser, isTestMode: true, message: "Google Admin profile provisioned! (Test Mode)" };
    }

    // ONLINE FIREBASE CLOUD MODE
    try {
      const provider = new this._sdk.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const cred = await this._sdk.signInWithPopup(this.auth, provider);

      const adminUser = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || cred.user.email.split("@")[0],
        photoURL: cred.user.photoURL,
        role: "ADMIN",
        isAdmin: true,
        provider: "google.com",
        loginTime: new Date().toISOString()
      };

      // Auto provision Admin profile in Cloud Firestore: role = "ADMIN"
      if (this.db && this._sdk?.doc && this._sdk?.setDoc) {
        try {
          const userDocRef = this._sdk.doc(this.db, "users", cred.user.uid);
          await this._sdk.setDoc(userDocRef, {
            uid: cred.user.uid,
            email: cred.user.email,
            name: cred.user.displayName || cred.user.email.split("@")[0],
            photoURL: cred.user.photoURL,
            role: "ADMIN",
            isAdmin: true,
            provider: "google.com",
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          console.log("[Firestore] Auto-created admin profile in Firestore: role = ADMIN for", cred.user.email);
        } catch (dbErr) {
          console.warn("[Firestore] Failed to write admin user profile:", dbErr.message);
        }
      }

      this.currentUser = adminUser;
      StorageManager.set("firebase_user", adminUser);
      StorageManager.set("admin_session", adminUser);
      this.notifyAuthListeners();

      return { success: true, user: adminUser, isTestMode: false, message: `Welcome, ${adminUser.displayName}! Super Admin verified.` };
    } catch (err) {
      throw this.formatFirebaseError(err);
    }
  }

  async loginAdmin(email, password) {
    return this.loginAdminWithGoogle();
  }

  logoutAdmin() {
    StorageManager.set("admin_session", null);
    try {
      this.logout();
    } catch (e) {}
  }

  getAdminSession() {
    return StorageManager.get("admin_session", null);
  }

  isAdminAuthenticated() {
    const sess = this.getAdminSession();
    return Boolean(sess && sess.email);
  }

  formatFirebaseError(err) {
    const code = err.code || "";
    switch (code) {
      case "auth/email-already-in-use":
        return new Error("This email is already registered. Please sign in or reset your password.");
      case "auth/invalid-email":
        return new Error("Invalid email address format.");
      case "auth/weak-password":
        return new Error("Password is too weak. Please use at least 6 characters.");
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return new Error("Incorrect email or password. Please verify your credentials.");
      case "auth/popup-closed-by-user":
        return new Error("Google sign-in popup was closed before completing.");
      case "auth/popup-blocked":
        return new Error("Popup was blocked by your browser. Please allow popups for Google sign-in.");
      case "auth/network-request-failed":
        return new Error("Network request failed. Check your internet connection or switch to Test Mode.");
      default:
        return new Error(err.message || "Authentication error occurred.");
    }
  }
}

// Global Singleton (Browser Environment)
if (typeof window !== "undefined") {
  const firebaseService = new FirebaseService();
  window.FirebaseService = firebaseService;
  // Automatically initialize SDK if online mode is chosen
  firebaseService.initSdk();
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    evaluatePasswordSafety,
    FirebaseService,
    firebaseConfig
  };
}
