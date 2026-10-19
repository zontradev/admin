/**
 * Lashker Traders - Models, Schemas & Runtime Validators (models.js)
 * Strict validation and business calculation logic.
 * Universal Module Definition (UMD) compatible with Browser and Node.js testing.
 */

(function (root, factory) {
  const lib = factory();
  if (typeof root !== "undefined") root.LashkerModels = lib;
  if (typeof window !== "undefined") window.LashkerModels = lib;
  if (typeof globalThis !== "undefined") globalThis.LashkerModels = lib;
  if (typeof module === "object" && module.exports) {
    module.exports = lib;
  }
})(typeof globalThis !== "undefined" ? globalThis : (typeof window !== "undefined" ? window : this), function () {

  const PHONE_REGEX = /^01[3-9]\d{8}$/;
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Validates Bangladesh mobile numbers: 11 digits starting with 013-019
   */
  function isValidBDPhone(phone) {
    if (!phone || typeof phone !== "string") return false;
    const clean = phone.replace(/[\s\-+]/g, "");
    const normalized = clean.startsWith("880") ? clean.slice(2) : clean;
    return PHONE_REGEX.test(normalized);
  }

  /**
   * Validates email format
   */
  function isValidEmail(email) {
    if (!email || typeof email !== "string") return false;
    return EMAIL_REGEX.test(email.trim());
  }

  /**
   * Validates Quantity Tiers for Wholesale Pricing
   */
  function validateWholesaleTiers(tiers) {
    if (!Array.isArray(tiers)) return { isValid: true, errors: [] };
    const errors = [];
    const sorted = [...tiers].sort((a, b) => (a.minQuantity || 0) - (b.minQuantity || 0));
    
    for (let i = 0; i < sorted.length; i++) {
      const t = sorted[i];
      if (typeof t.minQuantity !== "number" || t.minQuantity < 1) {
        errors.push(`Tier #${i + 1}: Minimum quantity must be at least 1`);
      }
      if (typeof t.unitPrice !== "number" || t.unitPrice <= 0) {
        errors.push(`Tier #${i + 1}: Unit price must be a positive number`);
      }
      if (t.maxQuantity !== undefined && t.maxQuantity !== null) {
        if (typeof t.maxQuantity !== "number" || t.maxQuantity < t.minQuantity) {
          errors.push(`Tier #${i + 1}: Maximum quantity (${t.maxQuantity}) cannot be less than minimum quantity (${t.minQuantity})`);
        }
      }
      // Check for overlap with next tier
      if (i < sorted.length - 1) {
        const next = sorted[i + 1];
        if (t.maxQuantity === undefined || t.maxQuantity === null || t.maxQuantity >= next.minQuantity) {
          errors.push(`Quantity tiers overlap between tier #${i + 1} and tier #${i + 2}`);
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates a Product Variant Entity
   */
  function validateProductVariant(variant, existingSkus = []) {
    const errors = [];
    if (!variant || typeof variant !== "object") {
      return { isValid: false, errors: ["Variant must be an object"] };
    }
    if (!variant.sku || typeof variant.sku !== "string" || variant.sku.trim().length < 2) {
      errors.push("Variant SKU is required (min 2 characters)");
    } else {
      const cleanSku = variant.sku.trim().toUpperCase();
      if (existingSkus.includes(cleanSku)) {
        errors.push(`Duplicate SKU detected: ${cleanSku}. Each variant must have a unique SKU.`);
      }
    }
    const price = variant.retailPrice !== undefined ? variant.retailPrice : variant.price;
    if (typeof price !== "number" || price <= 0 || !Number.isFinite(price)) {
      errors.push("Variant price must be a positive number");
    }
    const stock = variant.stock !== undefined ? variant.stock : variant.quantityOnHand;
    if (stock !== undefined && (typeof stock !== "number" || stock < 0 || !Number.isInteger(stock))) {
      errors.push("Variant stock must be an integer >= 0");
    }
    if (variant.wholesaleTiers && Array.isArray(variant.wholesaleTiers)) {
      const tierRes = validateWholesaleTiers(variant.wholesaleTiers);
      if (!tierRes.isValid) {
        errors.push(...tierRes.errors);
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates a Product entity (supports simple and variable products)
   */
  function validateProduct(prod) {
    const errors = [];
    if (!prod || typeof prod !== "object") {
      return { isValid: false, errors: ["Product must be an object"] };
    }
    if (!prod.id || typeof prod.id !== "string") errors.push("Product id is required and must be a string");
    
    const name = prod.name || prod.title;
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      errors.push("Product name must be at least 3 characters");
    }

    const category = prod.category || prod.categoryId;
    if (!category || typeof category !== "string") {
      errors.push("Product category is required");
    }

    // Variable product vs Simple product
    if (prod.productType === "variable" && Array.isArray(prod.variants) && prod.variants.length > 0) {
      const seenSkus = [];
      const seenCombinations = [];
      prod.variants.forEach((v, idx) => {
        const vRes = validateProductVariant(v, seenSkus);
        if (!vRes.isValid) {
          errors.push(`Variant #${idx + 1}: ${vRes.errors.join(", ")}`);
        }
        if (v.sku) seenSkus.push(v.sku.trim().toUpperCase());

        if (v.optionValues && typeof v.optionValues === "object") {
          const comboKey = Object.entries(v.optionValues).sort(([a], [b]) => a.localeCompare(b)).map(([k, val]) => `${k}:${val}`).join("|");
          if (seenCombinations.includes(comboKey)) {
            errors.push(`Duplicate variant option combination detected: ${comboKey}`);
          } else {
            seenCombinations.push(comboKey);
          }
        }
      });
    } else {
      // Simple product
      if (typeof prod.price !== "number" || prod.price <= 0 || !Number.isFinite(prod.price)) {
        errors.push("Product price must be a positive number");
      }
      if (prod.originalPrice && (typeof prod.originalPrice !== "number" || prod.originalPrice < prod.price)) {
        errors.push("Original price must be greater than current price if present");
      }
      if (prod.stockCount !== undefined && (typeof prod.stockCount !== "number" || prod.stockCount < 0)) {
        errors.push("Stock count cannot be negative");
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Universal Pricing Engine:
   * Deterministic pricing precedence according to customer eligibility, wholesale tiers, and MOQs.
   */
  function calculateVariantPrice(product, variant, quantity = 1, customer = null) {
    if (!variant) {
      variant = product; // Fallback to base product for simple products
    }
    const q = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    const baseRetail = variant.retailPrice || variant.price || product?.price || 0;
    const regular = variant.regularPrice || product?.regularPrice || baseRetail;

    const isB2B = Boolean(
      customer && (
        customer.isB2BApproved === true ||
        customer.role === "B2B_PARTNER" ||
        customer.role === "WHOLESALE" ||
        customer.b2bApproved === true
      )
    );

    // B2B Wholesale Pricing
    if (isB2B) {
      // 1. Quantity-tiered wholesale pricing
      if (Array.isArray(variant.wholesaleTiers) && variant.wholesaleTiers.length > 0) {
        const matchingTier = variant.wholesaleTiers.find(t => 
          q >= t.minQuantity && (!t.maxQuantity || q <= t.maxQuantity)
        );
        if (matchingTier) {
          const unitPrice = matchingTier.unitPrice;
          return {
            unitPrice,
            totalPrice: unitPrice * q,
            regularPrice: regular,
            priceType: "wholesale",
            isWholesale: true,
            tierMatched: matchingTier,
            minQuantity: 1,
            savingsPerUnit: Math.max(0, regular - unitPrice),
            totalSavings: Math.max(0, (regular - unitPrice) * q),
            currency: "BDT"
          };
        }
      }

      // 2. Base wholesale price
      if (variant.wholesalePrice && variant.wholesalePrice > 0) {
        const moq = variant.wholesaleMinQuantity || 1;
        if (q >= moq) {
          const unitPrice = variant.wholesalePrice;
          return {
            unitPrice,
            totalPrice: unitPrice * q,
            regularPrice: regular,
            priceType: "wholesale",
            isWholesale: true,
            tierMatched: null,
            minQuantity: moq,
            savingsPerUnit: Math.max(0, regular - unitPrice),
            totalSavings: Math.max(0, (regular - unitPrice) * q),
            currency: "BDT"
          };
        }
      }

      // 3. Carton wholesale fallback
      if (product?.wholesale && product.wholesale.cartonPrice && product.wholesale.cartonUnits) {
        const cartonUnits = product.wholesale.cartonUnits;
        const cartonPrice = product.wholesale.cartonPrice;
        if (q >= cartonUnits) {
          const perUnitPrice = Math.round(cartonPrice / cartonUnits);
          return {
            unitPrice: perUnitPrice,
            totalPrice: perUnitPrice * q,
            regularPrice: regular,
            priceType: "wholesale",
            isWholesale: true,
            tierMatched: { minQuantity: cartonUnits, unitPrice: perUnitPrice },
            minQuantity: cartonUnits,
            savingsPerUnit: Math.max(0, regular - perUnitPrice),
            totalSavings: Math.max(0, (regular - perUnitPrice) * q),
            currency: "BDT"
          };
        }
      }
    }

    // Retail Pricing
    const unitPrice = baseRetail;
    return {
      unitPrice,
      totalPrice: unitPrice * q,
      regularPrice: regular,
      priceType: "retail",
      isWholesale: false,
      tierMatched: null,
      savingsPerUnit: Math.max(0, regular - unitPrice),
      totalSavings: Math.max(0, (regular - unitPrice) * q),
      currency: "BDT"
    };
  }

  /**
   * Concurrency-safe inventory decrement
   */
  function decrementVariantInventory(product, variantId, quantity = 1) {
    const q = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    let target = null;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      target = product.variants.find(v => v.id === variantId || v.sku === variantId);
    }
    if (!target) {
      target = product;
    }
    const currentStock = target.stock !== undefined ? target.stock : (target.stockCount || 0);
    if (currentStock < q) {
      return {
        success: false,
        error: `Insufficient warehouse stock for SKU ${target.sku || target.id}. Available: ${currentStock}, requested: ${q}`,
        availableStock: currentStock
      };
    }
    const newStock = currentStock - q;
    target.stock = newStock;
    target.stockCount = newStock;
    target.inStock = newStock > 0;
    
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      product.stock = product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
      product.stockCount = product.stock;
      product.inStock = product.stock > 0;
    }

    return {
      success: true,
      newStock,
      target
    };
  }

  /**
   * Inventory restore (e.g. on order cancellation)
   */
  function restoreVariantInventory(product, variantId, quantity = 1) {
    const q = Number.isInteger(quantity) && quantity > 0 ? quantity : 1;
    let target = null;
    if (Array.isArray(product.variants) && product.variants.length > 0) {
      target = product.variants.find(v => v.id === variantId || v.sku === variantId);
    }
    if (!target) {
      target = product;
    }
    const currentStock = target.stock !== undefined ? target.stock : (target.stockCount || 0);
    const newStock = currentStock + q;
    target.stock = newStock;
    target.stockCount = newStock;
    target.inStock = newStock > 0;

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      product.stock = product.variants.reduce((acc, v) => acc + (v.stock || 0), 0);
      product.stockCount = product.stock;
      product.inStock = product.stock > 0;
    }

    return {
      success: true,
      newStock,
      target
    };
  }

  /**
   * Validates a Cart Item before insertion or mutation
   */
  function validateCartItem(item) {
    const errors = [];
    if (!item || typeof item !== "object") return { isValid: false, errors: ["Cart item must be an object"] };
    if (!item.id) errors.push("Cart item id is required");
    if (!item.name) errors.push("Cart item name is required");
    if (typeof item.price !== "number" || item.price <= 0) errors.push("Item price must be positive");
    if (!Number.isInteger(item.quantity) || item.quantity < 1) errors.push("Quantity must be an integer >= 1");
    if (item.maxStock !== undefined && item.quantity > item.maxStock) {
      errors.push(`Quantity (${item.quantity}) exceeds available warehouse stock (${item.maxStock})`);
    }
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Calculates Cart financials with exact integer arithmetic
   */
  function calculateCartTotals(items, coupon = null, deliveryZone = "inside-dhaka", freeThreshold = 1200) {
    if (!Array.isArray(items)) items = [];
    
    // Subtotal
    const subtotal = items.reduce((acc, item) => {
      const q = Number.isInteger(item.quantity) && item.quantity > 0 ? item.quantity : 1;
      const p = typeof item.price === "number" && item.price > 0 ? item.price : 0;
      return acc + (p * q);
    }, 0);

    // Coupon discount
    let discount = 0;
    if (coupon && coupon.discountPercent && coupon.discountPercent > 0) {
      discount = Math.round((subtotal * coupon.discountPercent) / 100);
    }

    // Shipping fee setup: Dhaka 60tk - Dhaka Sub-City 80tk - Outside Dhaka 120tk - 1200 spend = free
    let shippingFee = 0;
    const isFreeShipping = items.length > 0 && subtotal >= freeThreshold;

    if (items.length > 0) {
      if (isFreeShipping) {
        shippingFee = 0;
      } else {
        const zone = (deliveryZone || "").toLowerCase();
        if (zone === "inside-dhaka" || zone === "dhaka" || zone === "dhaka-city") {
          shippingFee = 60;
        } else if (zone === "dhaka-subcity" || zone === "subcity" || zone.includes("sub-city") || zone.includes("subcity")) {
          shippingFee = 80;
        } else {
          // outside-dhaka or other districts
          shippingFee = 120;
        }
      }
    }

    const grandTotal = Math.max(0, subtotal - discount + shippingFee);

    return {
      subtotal,
      discount,
      shippingFee,
      isFreeShipping,
      freeDeliveryRemaining: Math.max(0, freeThreshold - subtotal),
      freeThreshold,
      grandTotal
    };
  }

  /**
   * Validates Order Placement Data
   */
  function validateOrderInput(orderData) {
    const errors = [];
    if (!orderData || typeof orderData !== "object") return { isValid: false, errors: ["Order data must be an object"] };

    if (!orderData.name || typeof orderData.name !== "string" || orderData.name.trim().length < 2) {
      errors.push("Full customer name is required (min 2 characters)");
    }
    if (!isValidBDPhone(orderData.phone)) {
      errors.push("Valid Bangladesh mobile number is required (e.g. 017XXXXXXXX)");
    }
    if (!orderData.address || typeof orderData.address !== "string" || orderData.address.trim().length < 5) {
      errors.push("Detailed delivery address is required (min 5 characters)");
    }
    if (!Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push("Cannot place order with an empty cart");
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validates Customer Review Submission
   */
  function validateReview(review) {
    const errors = [];
    if (!review || typeof review !== "object") return { isValid: false, errors: ["Review must be an object"] };
    if (!review.authorName || review.authorName.trim().length < 2) errors.push("Your name is required");
    if (!Number.isInteger(review.rating) || review.rating < 1 || review.rating > 5) errors.push("Rating must be between 1 and 5 stars");
    if (!review.comment || review.comment.trim().length < 5) errors.push("Review comment must be at least 5 characters");
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Recalculates product rating summary from review array
   */
  function calculateRatingSummary(reviews) {
    if (!Array.isArray(reviews) || reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
      };
    }
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    reviews.forEach(r => {
      const val = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
      distribution[val] = (distribution[val] || 0) + 1;
      sum += val;
    });
    const avg = Number((sum / reviews.length).toFixed(1));
    return {
      averageRating: avg,
      totalReviews: reviews.length,
      distribution
    };
  }

  /**
   * Validates B2B Wholesale Partner Application
   */
  function validateB2BApplication(appData) {
    const errors = [];
    if (!appData || typeof appData !== "object") return { isValid: false, errors: ["Application data must be an object"] };
    if (!appData.businessName || appData.businessName.trim().length < 3) errors.push("Registered business name is required (min 3 chars)");
    if (!appData.tradeLicenseNumber || appData.tradeLicenseNumber.trim().length < 4) errors.push("Valid Trade License number is required");
    if (!isValidBDPhone(appData.phone)) errors.push("Valid business contact phone is required");
    if (!appData.district || appData.district.trim().length < 2) errors.push("Business district/city is required");
    if (!appData.businessType) errors.push("Business category must be selected");
    if (typeof appData.monthlyVolume !== "number" || appData.monthlyVolume < 20) {
      errors.push("Wholesale volume requirement is minimum 20 packs monthly");
    }
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Smart Guess Classifier for New Products Entry & Search Intent
   * Infers category, brand, diaper size, pieces, weight range, and suggested badge from product title/description.
   */
  function smartGuessProductMetadata(text, existingBrands = []) {
    if (!text || typeof text !== "string") {
      return { category: "diapers", brand: "Generic", size: null, pieces: null, badge: "New" };
    }
    const clean = text.trim();
    const lower = clean.toLowerCase();

    // 1. Guess Brand
    const defaultBrandList = [
      "Twinkle", "MamyPoko", "Huggies", "Pampers", "Johnson's Baby", "Johnson's",
      "Merries", "Chu Chu", "Aveeno Baby", "Aveeno", "Pigeon", "Chicco", "Curash", "Pureen"
    ];
    const candidateBrands = [...new Set([...existingBrands, ...defaultBrandList])];
    let detectedBrand = "Lashker Select";
    for (const b of candidateBrands) {
      const bLower = b.toLowerCase();
      if (lower.includes(bLower)) {
        detectedBrand = b.includes("Johnson") ? "Johnson's Baby" : b;
        break;
      }
    }

    // 2. Guess Category
    let detectedCategory = "diapers";
    if (/\b(wipe|wipes|tissue|cleansing sheet|wet sheet|napkin)\b/i.test(lower)) {
      detectedCategory = "wipes-tissue";
    } else if (/\b(bottle|feeder|nipple|teat|pacifier|soother|anti-colic|spoon|sippy cup|warmer)\b/i.test(lower)) {
      detectedCategory = "feeding";
    } else if (/\b(lotion|cream|shampoo|wash|bath|soap|powder|oil|massage oil|moistur)\b/i.test(lower)) {
      detectedCategory = "bath-skincare";
    } else if (/\b(diaper|diapers|pant|pants|nappy|nappies|tape|pull-up)\b/i.test(lower)) {
      detectedCategory = "diapers";
    } else if (/\b(pin|mat|changing pad|rattle|teether|thermometer|nail clipper|grooming)\b/i.test(lower)) {
      detectedCategory = "accessories";
    } else {
      detectedCategory = "baby-care";
    }

    // 3. Guess Size (Diapers)
    let detectedSize = null;
    if (detectedCategory === "diapers" || /\b(diaper|nappy|pant|tape)\b/i.test(lower)) {
      const textWithoutPossessive = lower.replace(/'s\b/g, "");
      if (/\b(nb|newborn|new born)\b/i.test(textWithoutPossessive)) {
        detectedSize = "NB";
      } else if (/\b(xxl|xx-large|2xl)\b/i.test(textWithoutPossessive)) {
        detectedSize = "XXL";
      } else if (/\b(xl|extra large|x-large)\b/i.test(textWithoutPossessive) || /\(xl\)/i.test(textWithoutPossessive)) {
        detectedSize = "XL";
      } else if (/\b(l|large)\b/i.test(textWithoutPossessive) || /\(l\)/i.test(textWithoutPossessive)) {
        detectedSize = "L";
      } else if (/\b(m|medium)\b/i.test(textWithoutPossessive) || /\(m\)/i.test(textWithoutPossessive)) {
        detectedSize = "M";
      } else if (/\b(s|small)\b/i.test(textWithoutPossessive) || /\(s\)/i.test(textWithoutPossessive)) {
        detectedSize = "S";
      }
    }

    // 4. Guess Pieces / Count
    const pcsMatch = lower.match(/(\d{1,3})\s*(pcs|pieces|sheets|wipes|pack)/i);
    const detectedPieces = pcsMatch ? `${pcsMatch[1]} ${pcsMatch[2]}` : null;

    // 5. Guess Weight Range
    const weightMatch = lower.match(/(\d{1,2}\s*-\s*\d{1,2}\s*kg)/i) || lower.match(/(up to\s*\d{1,2}\s*kg)/i);
    const detectedWeight = weightMatch ? weightMatch[0] : null;

    // 6. Suggest Badge
    let suggestedBadge = "New";
    if (detectedCategory === "diapers" && (detectedBrand === "Twinkle" || detectedBrand === "MamyPoko")) {
      suggestedBadge = "Best Seller";
    } else if (detectedCategory === "wipes-tissue") {
      suggestedBadge = "Pure Water";
    } else if (detectedCategory === "bath-skincare") {
      suggestedBadge = "Pure & Gentle";
    }

    return {
      brand: detectedBrand,
      category: detectedCategory,
      size: detectedSize,
      pieces: detectedPieces,
      weightRange: detectedWeight,
      badge: suggestedBadge,
      suggestedBadge,
      skuSuggestion: `${detectedBrand.slice(0, 3).toUpperCase()}-${detectedCategory.slice(0, 3).toUpperCase()}-${detectedSize || 'STD'}`
    };
  }

  /**
   * Evaluates Dynamic Interdependent Facets
   * When category is selected -> filters brands to available brands only.
   * When brand is selected -> filters categories to available categories only.
   * Provides counts for each facet option.
   */
  function getAvailableFacets(allProducts, activeFilters = {}) {
    if (!Array.isArray(allProducts)) allProducts = [];

    const categoryFilter = activeFilters.category || "all";
    const brandFilter = activeFilters.brand || "all";
    const maxPrice = typeof activeFilters.maxPrice === "number" ? activeFilters.maxPrice : Infinity;
    const inStockOnly = !!activeFilters.inStockOnly;
    const sizeFilter = activeFilters.size || "all";
    const systemFilter = activeFilters.system || activeFilters.diaperSystem || "all";
    const skinTypeFilter = activeFilters.skinType || "all";
    const materialFilter = activeFilters.material || "all";
    const capacityFilter = activeFilters.capacity || "all";
    const tissueTypeFilter = activeFilters.tissueType || "all";
    const plyFilter = activeFilters.ply || "all";
    const packagingFilter = activeFilters.packaging || "all";
    const subcategoryFilter = activeFilters.subcategory || "all";
    const toyTypeFilter = activeFilters.toyType || "all";
    const query = (activeFilters.query || "").toLowerCase().trim();

    function isCategoryMatch(prodCategory, targetCategory) {
      if (!targetCategory || targetCategory === "all") return true;
      if (!prodCategory) return false;
      const p = prodCategory.toLowerCase().trim();
      const t = targetCategory.toLowerCase().trim();
      if (p === t) return true;
      if ((t === "baby-diaper" || t === "diapers") && (p === "baby-diaper" || p === "diapers")) return true;
      if ((t === "adult-diaper" || t === "adult-care") && (p === "adult-diaper" || p === "adult-care")) return true;
      if ((t === "skin-care" || t === "bath-skincare" || t === "skincare") && (p === "skin-care" || p === "bath-skincare" || p === "skincare")) return true;
      if ((t === "feeder" || t === "feeding") && (p === "feeder" || p === "feeding")) return true;
      if ((t === "wipes" || t === "wipes-tissue") && (p === "wipes" || p === "wipes-tissue")) return true;
      if ((t === "toys" || t === "accessories") && (p === "toys" || p === "accessories")) return true;
      return false;
    }

    function isSizeMatch(prodSize, targetSize) {
      if (!targetSize || targetSize === "all") return true;
      if (!prodSize) return false;
      const p = String(prodSize).trim().toUpperCase();
      const t = String(targetSize).trim().toUpperCase();
      if (p === t) return true;
      if ((t === "3XL" && p === "XXXL") || (t === "XXXL" && p === "3XL")) return true;
      if ((t === "2XL" && p === "XXL") || (t === "XXL" && p === "2XL")) return true;
      if (p === `ADULT-${t}` || t === `ADULT-${p}`) return true;
      return false;
    }

    function isSystemMatch(prodSystem, targetSystem) {
      if (!targetSystem || targetSystem === "all") return true;
      if (!prodSystem) return false;
      const p = String(prodSystem).toLowerCase().trim();
      const t = String(targetSystem).toLowerCase().trim();
      if (p === t) return true;
      if ((t === "belt" || t.includes("belt")) && p.includes("belt")) return true;
      if ((t === "pant" || t.includes("pant")) && p.includes("pant")) return true;
      return false;
    }

    // Helper predicate excluding a specific facet key
    function matches(p, excludeKey = null) {
      if (excludeKey !== "category" && categoryFilter !== "all" && !isCategoryMatch(p.category, categoryFilter)) return false;
      if (excludeKey !== "brand" && brandFilter !== "all" && p.brand !== brandFilter) return false;
      if (excludeKey !== "price" && p.price > maxPrice) return false;
      if (excludeKey !== "stock" && inStockOnly && (!p.inStock || p.stockCount <= 0)) return false;
      if (excludeKey !== "size" && sizeFilter !== "all") {
        const matchesSize = isSizeMatch(p.size, sizeFilter) || (Array.isArray(p.variants) && p.variants.some(v => isSizeMatch(v.size, sizeFilter)));
        if (!matchesSize) return false;
      }
      if (excludeKey !== "system" && systemFilter !== "all") {
        if (!isSystemMatch(p.diaperSystem, systemFilter)) return false;
      }
      if (excludeKey !== "skinType" && skinTypeFilter !== "all" && p.skinType && p.skinType.toLowerCase() !== skinTypeFilter.toLowerCase()) return false;
      if (excludeKey !== "material" && materialFilter !== "all" && p.material && p.material.toLowerCase() !== materialFilter.toLowerCase()) return false;
      if (excludeKey !== "capacity" && capacityFilter !== "all" && p.capacity && p.capacity.toLowerCase() !== capacityFilter.toLowerCase()) return false;
      if (excludeKey !== "tissueType" && tissueTypeFilter !== "all" && p.tissueType && p.tissueType.toLowerCase() !== tissueTypeFilter.toLowerCase()) return false;
      if (excludeKey !== "ply" && plyFilter !== "all" && p.ply && p.ply.toLowerCase() !== plyFilter.toLowerCase()) return false;
      if (excludeKey !== "packaging" && packagingFilter !== "all" && p.packaging && p.packaging.toLowerCase() !== packagingFilter.toLowerCase()) return false;
      if (excludeKey !== "subcategory" && subcategoryFilter !== "all" && p.subcategory && p.subcategory.toLowerCase() !== subcategoryFilter.toLowerCase()) return false;
      if (excludeKey !== "toyType" && toyTypeFilter !== "all" && p.toyType && p.toyType.toLowerCase() !== toyTypeFilter.toLowerCase()) return false;

      if (query) {
        const match = p.name.toLowerCase().includes(query) || (p.brand && p.brand.toLowerCase().includes(query)) || (p.category && p.category.toLowerCase().includes(query));
        if (!match) return false;
      }
      return true;
    }

    // 1. Available Categories
    const categoryCounts = {};
    allProducts.forEach(p => {
      if (matches(p, "category") && p.category) {
        categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
      }
    });

    // 2. Available Brands
    const brandCounts = {};
    allProducts.forEach(p => {
      if (matches(p, "brand") && p.brand) {
        brandCounts[p.brand] = (brandCounts[p.brand] || 0) + 1;
      }
    });

    // 3. Available Sizes
    const sizeCounts = {};
    allProducts.forEach(p => {
      if (matches(p, "size")) {
        const sizesForProd = new Set();
        if (p.size) sizesForProd.add(p.size);
        if (Array.isArray(p.variants)) {
          p.variants.forEach(v => { if (v.size) sizesForProd.add(v.size); });
        }
        sizesForProd.forEach(s => {
          sizeCounts[s] = (sizeCounts[s] || 0) + 1;
        });
      }
    });

    // 4. Category-Specific Dynamic Facet Counts
    const systemCounts = {};
    const skinTypeCounts = {};
    const materialCounts = {};
    const capacityCounts = {};
    const tissueTypeCounts = {};
    const plyCounts = {};
    const packagingCounts = {};
    const subcategoryCounts = {};
    const toyTypeCounts = {};

    allProducts.forEach(p => {
      if (matches(p, "system") && p.diaperSystem) {
        systemCounts[p.diaperSystem] = (systemCounts[p.diaperSystem] || 0) + 1;
      }
      if (matches(p, "skinType") && p.skinType) {
        skinTypeCounts[p.skinType] = (skinTypeCounts[p.skinType] || 0) + 1;
      }
      if (matches(p, "material") && p.material) {
        materialCounts[p.material] = (materialCounts[p.material] || 0) + 1;
      }
      if (matches(p, "capacity") && p.capacity) {
        capacityCounts[p.capacity] = (capacityCounts[p.capacity] || 0) + 1;
      }
      if (matches(p, "tissueType") && p.tissueType) {
        tissueTypeCounts[p.tissueType] = (tissueTypeCounts[p.tissueType] || 0) + 1;
      }
      if (matches(p, "ply") && p.ply) {
        plyCounts[p.ply] = (plyCounts[p.ply] || 0) + 1;
      }
      if (matches(p, "packaging") && p.packaging) {
        packagingCounts[p.packaging] = (packagingCounts[p.packaging] || 0) + 1;
      }
      if (matches(p, "subcategory") && p.subcategory) {
        subcategoryCounts[p.subcategory] = (subcategoryCounts[p.subcategory] || 0) + 1;
      }
      if (matches(p, "toyType") && p.toyType) {
        toyTypeCounts[p.toyType] = (toyTypeCounts[p.toyType] || 0) + 1;
      }
    });

    // 5. In Stock Counts & Totals
    let inStockCount = 0;
    let totalMatching = 0;
    allProducts.forEach(p => {
      if (matches(p, "stock")) {
        totalMatching++;
        if (p.inStock && p.stockCount > 0) inStockCount++;
      }
    });

    return {
      availableCategories: Object.keys(categoryCounts),
      categoryCounts,
      availableBrands: Object.keys(brandCounts),
      brandCounts,
      availableSizes: Object.keys(sizeCounts),
      sizeCounts,
      availableSystems: Object.keys(systemCounts),
      systemCounts,
      availableSkinTypes: Object.keys(skinTypeCounts),
      skinTypeCounts,
      availableMaterials: Object.keys(materialCounts),
      materialCounts,
      availableCapacities: Object.keys(capacityCounts),
      capacityCounts,
      availableTissueTypes: Object.keys(tissueTypeCounts),
      tissueTypeCounts,
      availablePlies: Object.keys(plyCounts),
      plyCounts,
      availablePackagings: Object.keys(packagingCounts),
      packagingCounts,
      availableSubcategories: Object.keys(subcategoryCounts),
      subcategoryCounts,
      availableToyTypes: Object.keys(toyTypeCounts),
      toyTypeCounts,
      inStockCount,
      totalMatching
    };
  }

  /**
   * Helper to parse flexible date formats (YYYY-MM-DD, DD.MM.YYYY, Date, Timestamp)
   */
  function parseDate(d) {
    if (!d) return null;
    if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
    if (typeof d === "number") {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    if (typeof d === "string") {
      const dotParts = d.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
      if (dotParts) {
        return new Date(parseInt(dotParts[3], 10), parseInt(dotParts[2], 10) - 1, parseInt(dotParts[1], 10));
      }
      const isoParts = d.trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (isoParts) {
        return new Date(parseInt(isoParts[1], 10), parseInt(isoParts[2], 10) - 1, parseInt(isoParts[3], 10));
      }
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  }

  /**
   * Baby Age Calculation:
   * Increments in steps of 0.5 month (15 days).
   * Range < 1y: 0.5m, 1m, 1.5m, 2m, ..., 11.5m
   * Range 1y to 5.5y: 1y, 1.5y, 2y, ..., 5.5y
   * 6+ to < 8y: Healthy Child (6+) - Never show mature until 8+!
   * 8+ to < 10y: Growing Child (8+) - Option by weight!
   * 10+ y: Mature Child (10y+) - Guidance tip, but browsing is never blocked!
   */
  function calculateBabyAge(birthDateInput, referenceDateInput = new Date()) {
    const birthDate = parseDate(birthDateInput);
    const refDate = parseDate(referenceDateInput) || new Date();

    if (!birthDate) {
      return {
        stepMonths: 0,
        ageDisplay: "0m",
        years: 0,
        isMature: false,
        statusText: "Age not available",
        stage: "infant"
      };
    }

    const diffMs = refDate.getTime() - birthDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Calculation updates only after passing 0.5 month (15 days)
    const halfMonths = Math.floor(diffDays / 15);
    const stepMonths = halfMonths * 0.5;
    const stepYears = Math.floor((stepMonths / 12) * 2) / 2;

    // 10+ years: Mature Child (never stops browsing)
    if (stepMonths >= 120) {
      return {
        stepMonths,
        ageDisplay: `${stepYears}y`,
        years: stepYears,
        isMature: true,
        statusText: "Mature Child (10y+)",
        stage: "mature",
        tipText: "Mature Child: Daytime diapers are usually no longer required, but overnight/special care options are available below."
      };
    }

    // 8+ to < 10 years: Growing Child (give option by weight)
    if (stepMonths >= 96) {
      return {
        stepMonths,
        ageDisplay: `${stepYears}y`,
        years: stepYears,
        isMature: false, // Never show mature until 8+ / 10+
        statusText: "Growing Child (8+)",
        stage: "growing-child",
        tipText: "Growing Child (8+): Diaper sizing depends strictly on weight. Night-time and junior pants available below."
      };
    }

    // 6+ to < 8 years: Healthy Child
    if (stepMonths >= 72) {
      return {
        stepMonths,
        ageDisplay: `${stepYears}y`,
        years: stepYears,
        isMature: false, // 6+ is Healthy child, NOT mature!
        statusText: "Healthy Child (6+)",
        stage: "healthy-child",
        tipText: "Healthy Child (6+): Most children transition to regular underwear, but high-absorbency overnight pants are available."
      };
    }

    // 1 year and above: 1y, 1.5y, 2y, 2.5y, 3y, etc.
    if (stepMonths >= 12) {
      return {
        stepMonths,
        ageDisplay: `${stepYears}y`,
        years: stepYears,
        isMature: false,
        statusText: "Toddler / Growing Child",
        stage: "toddler"
      };
    }

    // Less than 1 year: 0.5m, 1m, 1.5m, etc.
    if (stepMonths > 0) {
      return {
        stepMonths,
        ageDisplay: `${stepMonths}m`,
        years: 0,
        isMature: false,
        statusText: "Infant",
        stage: "infant"
      };
    }

    return {
      stepMonths: 0,
      ageDisplay: "0m",
      years: 0,
      isMature: false,
      statusText: "Newborn (< 0.5m)",
      stage: "newborn"
    };
  }

  /**
   * Estimated Weight Calculation:
   * When user enters a manual weight on recordedDate, it holds until 0.5 month passes.
   * If > 0.5 month has passed since recordedDate, weight is estimated (~ X kg)
   * until user manually updates it.
   * Example: 18.10.2026: 6.2 kg -> 18.10.2027: ~ 7.5 kg
   */
  function calculateBabyEstimatedWeight(babyData, referenceDateInput = new Date()) {
    const refDate = parseDate(referenceDateInput) || new Date();
    const manualWeight = typeof babyData.manualWeight === "number" && babyData.manualWeight > 0
      ? babyData.manualWeight
      : (typeof babyData.currentWeightKg === "number" ? babyData.currentWeightKg : 3.5);

    const recDate = parseDate(babyData.weightRecordedDate) || parseDate(babyData.birthDate) || refDate;
    const diffMs = refDate.getTime() - recDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

    // Weight updates only after passing 0.5 month
    const halfMonthsPassed = Math.floor(diffDays / 15);

    if (halfMonthsPassed === 0) {
      return {
        weight: manualWeight,
        displayWeight: `${manualWeight} kg`,
        isEstimated: false,
        halfMonthsPassed: 0
      };
    }

    // Growth progression: ~0.054 kg per 0.5 month (calibrated so 6.2kg at 18.10.2026 becomes ~7.5kg at 18.10.2027)
    let currentWeight = manualWeight;
    for (let i = 0; i < halfMonthsPassed; i++) {
      currentWeight += 0.054;
    }

    const estimatedWeight = Math.min(45, Math.round(currentWeight * 10) / 10);
    return {
      weight: estimatedWeight,
      displayWeight: `~ ${estimatedWeight.toFixed(1)} kg`,
      isEstimated: true,
      halfMonthsPassed
    };
  }

  /**
   * Diaper Size Recommendation based on weight and age:
   * Rules:
   * - Under 30kg: Diaper will suggest!
   * - 6+ & 20kg+: "Healthy baby, most babies stop using daytime diapers, but night pants available"
   * - 6+ & 12~16.9kg: "Growing Baby" -> XL
   * - 17~23kg: XXL
   * - 24~30kg: XXXL / Junior Pants
   * - Longer baby >30kg (e.g. 32kg): Adult Diaper Size S (Youth / Petite)
   * - Mature (10+) shows tip but NEVER stops from browsing diapers!
   */
  function getBabyRecommendedDiaperSize(weightKg, ageYears = 0, isMature = false) {
    // If over 30kg (e.g. 32kg): Recommend Adult Diaper Size S
    if (weightKg > 30) {
      return {
        size: "Adult-S",
        label: "Adult Diaper Size S (Youth / Small)",
        weightRange: "30 - 45 kg (Hip: 20\" - 32\")",
        targetFilter: "Adult-S",
        isAdultDiaper: true,
        isMature: isMature,
        stageNote: "Weight over 30kg (e.g. 32kg): Baby diapers are too snug; Adult Diaper Size S / Youth Incontinence Pants provide optimal leak protection.",
        tipText: "Child over 30kg comfortably fits Adult Diaper S / Youth pants with elastic waistband."
      };
    }

    // 24 to 30 kg: Size XXXL / Junior Pants
    if (weightKg >= 24) {
      return {
        size: "XXXL",
        label: "Size XXXL (Junior Pants)",
        weightRange: "24 - 30 kg",
        targetFilter: "XXXL",
        isAdultDiaper: false,
        isMature: isMature,
        stageNote: "Junior Pants (24 - 30 kg): Extended comfort fit for older children.",
        tipText: ageYears >= 6 ? "Healthy Child: Overnight junior pants for bedwetting and heavy sleep protection." : null
      };
    }

    // 17 to 23.9 kg: Size XXL
    if (weightKg >= 17) {
      const isHealthyOlder = ageYears >= 6 && weightKg >= 20;
      return {
        size: "XXL",
        label: "Size XXL (Double XL / Night Pants)",
        weightRange: "17 - 23 kg",
        targetFilter: "XXL",
        isAdultDiaper: false,
        isMature: isMature,
        stageNote: isHealthyOlder 
          ? "Healthy Child (6+): Most children stop daytime diapers around this age, but XXL overnight pull-up pants are available."
          : "Growing Baby / Toddler: Size XXL (17 - 23 kg).",
        tipText: isHealthyOlder ? "Healthy baby: Daytime diapering usually ceases, but overnight pull-ups remain recommended." : null
      };
    }

    // 12 to 16.9 kg: Size XL (Growing Baby)
    if (weightKg >= 12) {
      return {
        size: "XL",
        label: "Size XL (Extra Large)",
        weightRange: "12 - 17 kg",
        targetFilter: "XL",
        isAdultDiaper: false,
        isMature: isMature,
        stageNote: ageYears >= 6 ? "Growing Baby (6+): Size XL (12 - 17 kg)." : "Active Toddler: Size XL (12 - 17 kg).",
        tipText: null
      };
    }

    // 8 to 11.9 kg: Size M
    if (weightKg >= 8) {
      return {
        size: "M",
        label: "Size M (Medium)",
        weightRange: "6 - 11 kg",
        targetFilter: "M",
        isAdultDiaper: false,
        isMature: false,
        stageNote: "Infant / Crawler: Size M (6 - 11 kg).",
        tipText: null
      };
    }

    // 5 to 7.9 kg: Size S
    if (weightKg >= 5) {
      return {
        size: "S",
        label: "Size S (Small)",
        weightRange: "4 - 8 kg",
        targetFilter: "S",
        isAdultDiaper: false,
        isMature: false,
        stageNote: "Infant: Size S (4 - 8 kg).",
        tipText: null
      };
    }

    // Under 5 kg: Size NB
    return {
      size: "NB",
      label: "Size NB (Newborn)",
      weightRange: "0 - 5 kg",
      targetFilter: "NB",
      isAdultDiaper: false,
      isMature: false,
      stageNote: "Newborn: Size NB (Up to 5 kg).",
      tipText: null
    };
  }

  /**
   * Comprehensive Baby Milestone Evaluation
   */
  function calculateBabyMilestone(babyData, referenceDateInput = new Date()) {
    const ageResult = calculateBabyAge(babyData.birthDate, referenceDateInput);
    const weightResult = calculateBabyEstimatedWeight(babyData, referenceDateInput);
    const diaperResult = getBabyRecommendedDiaperSize(weightResult.weight, ageResult.years, ageResult.isMature);

    return {
      ageDisplay: ageResult.ageDisplay,
      stepMonths: ageResult.stepMonths,
      years: ageResult.years,
      isMature: ageResult.isMature,
      statusText: ageResult.statusText,
      stage: ageResult.stage,
      ageTipText: ageResult.tipText,
      weight: weightResult.weight,
      displayWeight: weightResult.displayWeight,
      isEstimatedWeight: weightResult.isEstimated,
      halfMonthsPassed: weightResult.halfMonthsPassed,
      recommendedDiaper: diaperResult
    };
  }

  /**
   * Adult Diaper Sizing Engine based on Hip / Waist Measurement:
   * Input: Name, Age, Hip Size (inches)
   * Sizing:
   * - Hip < 32" (20" - 31"): Adult Diaper S (Small)
   * - Hip 32" - 44": Adult Diaper M (Medium)
   * - Hip 44.1" - 55": Adult Diaper L (Large)
   * - Hip > 55" (55" - 65"+): Adult Diaper XL (Extra Large)
   */
  function calculateAdultDiaperRecommendation({ name, age, hipSizeInches, careType }) {
    const hip = parseFloat(hipSizeInches) || 36;
    let size = "Adult-M";
    let label = "Size M (Medium Adult Diaper)";
    let hipRange = "32\" - 44\" (81 - 112 cm)";
    let description = "Designed for moderate to heavy incontinence with odor lock core.";

    if (hip < 32) {
      size = "Adult-S";
      label = "Size S (Small Adult Diaper / Youth)";
      hipRange = "20\" - 32\" (50 - 81 cm)";
      description = "Snug leak-proof fit for petite adults and youth (weight 30 - 45 kg).";
    } else if (hip <= 44) {
      size = "Adult-M";
      label = "Size M (Medium Adult Diaper)";
      hipRange = "32\" - 44\" (81 - 112 cm)";
      description = "Standard comfortable fit for average adult waist/hip size with dual leak guards.";
    } else if (hip <= 55) {
      size = "Adult-L";
      label = "Size L (Large Adult Diaper)";
      hipRange = "40\" - 55\" (101 - 140 cm)";
      description = "Extra-wide absorbent core with resealable refastenable side tapes.";
    } else {
      size = "Adult-XL";
      label = "Size XL (Extra Large Adult Diaper)";
      hipRange = "50\" - 65\"+ (127 - 165+ cm)";
      description = "Maxi heavy-duty absorption for extended night-time & hospital care.";
    }

    return {
      name: name || "Adult",
      age: parseInt(age) || 60,
      hipSizeInches: hip,
      careType: careType || "Tape Diaper (Bedridden / Incontinence)",
      recommendedSize: size,
      sizeLabel: label,
      hipRange,
      description,
      targetCatalogUrl: `#/catalog?category=diapers&size=${size}`
    };
  }

  return {
    isValidBDPhone,
    isValidEmail,
    validateProduct,
    validateCartItem,
    calculateCartTotals,
    validateOrderInput,
    validateReview,
    calculateRatingSummary,
    validateB2BApplication,
    smartGuessProductMetadata,
    getAvailableFacets,
    parseDate,
    calculateBabyAge,
    calculateBabyEstimatedWeight,
    getBabyRecommendedDiaperSize,
    calculateBabyMilestone,
    calculateAdultDiaperRecommendation,
    validateProductVariant,
    validateWholesaleTiers,
    calculateVariantPrice,
    decrementVariantInventory,
    restoreVariantInventory
  };
});
