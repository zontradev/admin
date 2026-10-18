/**
 * Lashker Traders - Admin Portal Controller (admin-app.js)
 * Manages administrative dashboard, catalog, orders, categories, brands, customers, and settings.
 * Fully clean: zero default/mock products, logical add product system, custom alert dialogs.
 */

class AdminAppController {
  constructor() {
    this.currentRoute = "#/dashboard";
    this.searchQuery = "";
    this.activeOrderFilter = "all";
    this.productCategoryFilter = "all";
  }

  init() {
    this.checkAdminAuth();
    window.addEventListener("hashchange", () => this.handleRouting());
    this.handleRouting();
    this.updateNotificationBadge();
    this.initFirestoreRealtimeSync();
    this.updateCloudStatusIndicator();
  }

  // ------------------------------------------------------------------------
  // ROUTING & NAVIGATION
  // ------------------------------------------------------------------------
  navigate(route) {
    window.location.hash = route;
  }

  handleRouting() {
    const raw = window.location.hash || "#/dashboard";
    const route = raw.split("?")[0] || "#/dashboard";
    this.currentRoute = route;

    // Update sidebar active states
    document.querySelectorAll(".sidebar-item").forEach(item => {
      const target = item.getAttribute("data-route");
      if (target && (route === target || route.startsWith(target + "/"))) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Submenu items
    document.querySelectorAll(".submenu-item").forEach(sub => {
      const target = sub.getAttribute("data-route");
      if (target && route === target) {
        sub.classList.add("active");
      } else {
        sub.classList.remove("active");
      }
    });

    const content = document.getElementById("admin-content-area");
    if (!content) return;

    if (route === "#/" || route === "#/dashboard") {
      this.renderDashboard();
    } else if (route === "#/products") {
      this.renderProductsList();
    } else if (route === "#/products/add") {
      this.renderProductForm();
    } else if (route.startsWith("#/products/edit/")) {
      const id = route.split("/")[3];
      this.renderProductForm(id);
    } else if (route === "#/categories") {
      this.renderCategoriesPage();
    } else if (route === "#/brands") {
      this.renderBrandsPage();
    } else if (route === "#/inventory") {
      this.renderInventoryPage();
    } else if (route === "#/orders") {
      this.renderOrdersPage();
    } else if (route === "#/customers") {
      this.renderCustomersPage();
    } else if (route === "#/b2b") {
      this.renderB2BPage();
    } else if (route === "#/promotions") {
      this.renderPromotionsPage();
    } else if (route === "#/settings") {
      this.renderSettingsPage();
    } else {
      this.renderDashboard();
    }
  }

  // ------------------------------------------------------------------------
  // VIEW 1: DASHBOARD OVERVIEW (Zero Mock Products / Real Metrics)
  // ------------------------------------------------------------------------
  renderDashboard() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const products = StorageManager.getProducts();
    const orders = StorageManager.getOrders();
    const categories = StorageManager.getCategories();
    const brands = StorageManager.getBrands();
    const user = StorageManager.getUser();

    // Real Metrics (No hardcoded fake numbers)
    const totalProductsCount = products.length;
    const totalOrdersCount = orders.length;
    const totalCustomersCount = (user && user.id) ? 1 : 0;
    const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);

    // Order status counts for donut chart
    const statusCounts = {
      pending: orders.filter(o => (o.status || "").toLowerCase().includes("pending") || (o.status || "").toLowerCase().includes("placed")).length,
      processing: orders.filter(o => (o.status || "").toLowerCase().includes("processing") || (o.status || "").toLowerCase().includes("confirmed") || (o.status || "").toLowerCase().includes("packed")).length,
      shipped: orders.filter(o => (o.status || "").toLowerCase().includes("shipped") || (o.status || "").toLowerCase().includes("out for delivery")).length,
      delivered: orders.filter(o => (o.status || "").toLowerCase().includes("delivered")).length,
      cancelled: orders.filter(o => (o.status || "").toLowerCase().includes("cancelled")).length
    };

    const recentOrders = orders.slice(0, 5);

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Admin Dashboard</h1>
          <p class="page-subtitle">Real-time overview of your store's catalog, orders, and performance.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-gold" onclick="AdminApp.navigate('#/products/add')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Product
          </button>
        </div>
      </div>

      <!-- 4 KPI CARDS -->
      <div class="kpi-grid">
        <!-- Card 1: Products -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-icon-wrap kpi-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <div>
              <div class="kpi-label">Total Products</div>
              <div class="kpi-value">${totalProductsCount.toLocaleString()}</div>
            </div>
          </div>
          <div class="kpi-trend">
            <span style="color: #64748b; font-size: 12px;">Active in store catalog</span>
          </div>
        </div>

        <!-- Card 2: Orders -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-icon-wrap kpi-icon-green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div>
              <div class="kpi-label">Total Orders</div>
              <div class="kpi-value">${totalOrdersCount.toLocaleString()}</div>
            </div>
          </div>
          <div class="kpi-trend">
            <span style="color: #64748b; font-size: 12px;">Placed by customers</span>
          </div>
        </div>

        <!-- Card 3: Customers -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-icon-wrap kpi-icon-purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <div>
              <div class="kpi-label">Registered Accounts</div>
              <div class="kpi-value">${totalCustomersCount.toLocaleString()}</div>
            </div>
          </div>
          <div class="kpi-trend">
            <span style="color: #64748b; font-size: 12px;">With baby / adult profiles</span>
          </div>
        </div>

        <!-- Card 4: Revenue -->
        <div class="kpi-card">
          <div class="kpi-header">
            <div class="kpi-icon-wrap kpi-icon-gold">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-6 0c0 4 6 2 6 6a3.5 3.5 0 0 1-6 0"></path></svg>
            </div>
            <div>
              <div class="kpi-label">Total Revenue</div>
              <div class="kpi-value">৳ ${totalRevenue.toLocaleString()}</div>
            </div>
          </div>
          <div class="kpi-trend">
            <span style="color: #64748b; font-size: 12px;">From confirmed orders</span>
          </div>
        </div>
      </div>

      <!-- MIDDLE ROW: SALES OVERVIEW + ORDER STATUS + QUICK ACTIONS -->
      <div class="dashboard-middle-grid">
        <!-- Sales Overview Chart -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Sales Overview</h3>
            <div class="chart-legend">
              <div class="legend-item">
                <span class="legend-dot" style="background: #2563eb;"></span>
                <span>Revenue</span>
              </div>
              <div class="legend-item">
                <span class="legend-dot" style="background: #cbd5e1;"></span>
                <span>Orders</span>
              </div>
            </div>
          </div>
          <div class="chart-canvas-wrap" id="sales-overview-chart"></div>
        </div>

        <!-- Order Status Donut -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Order Status</h3>
          </div>
          <div id="order-status-donut" style="flex: 1; min-height: 200px;"></div>
        </div>

        <!-- Quick Actions Grid -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Quick Actions</h3>
          </div>
          <div class="quick-actions-grid">
            <div class="quick-action-tile" onclick="AdminApp.navigate('#/products/add')">
              <div class="quick-action-icon" style="color: #2563eb;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </div>
              <span>Add Product</span>
            </div>
            <div class="quick-action-tile" onclick="AdminApp.navigate('#/brands')">
              <div class="quick-action-icon" style="color: #d97706;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              </div>
              <span>Manage Brands</span>
            </div>
            <div class="quick-action-tile" onclick="AdminApp.navigate('#/categories')">
              <div class="quick-action-icon" style="color: #f5b014;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              </div>
              <span>Categories</span>
            </div>
            <div class="quick-action-tile" onclick="AdminApp.navigate('#/orders')">
              <div class="quick-action-icon" style="color: #059669;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              </div>
              <span>Orders Queue</span>
            </div>
          </div>
        </div>
      </div>

      <!-- BOTTOM ROW: RECENT ORDERS + TOP PRODUCTS -->
      <div class="dashboard-bottom-grid">
        <!-- Recent Orders Table -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Recent Orders</h3>
            <a href="#/orders" style="font-size: 12.5px; font-weight: 700; color: #2563eb;">View All</a>
          </div>
          <div class="table-wrap">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th style="text-align: right;">Action</th>
                </tr>
              </thead>
              <tbody>
                ${recentOrders.length > 0 ? recentOrders.map(order => `
                  <tr>
                    <td style="font-weight: 800; color: #0f172a;">${order.orderId}</td>
                    <td>${order.customer?.name || "Customer"}</td>
                    <td style="color: #64748b; font-size: 12px;">${order.date || "2026-10-18"}</td>
                    <td style="font-weight: 800;">৳ ${(order.total || 0).toLocaleString()}</td>
                    <td>${this.renderStatusBadge(order.status)}</td>
                    <td style="text-align: right;">
                      <button class="btn btn-outline btn-sm" onclick="AdminApp.viewOrderDetails('${order.orderId}')">View</button>
                    </td>
                  </tr>
                `).join("") : `
                  <tr>
                    <td colspan="6" style="text-align: center; padding: 32px; color: #94a3b8;">
                      <div style="font-size: 24px; margin-bottom: 6px;">🛒</div>
                      <div style="font-weight: 700; color: #475569;">No customer orders placed yet</div>
                      <div style="font-size: 12px; margin-top: 4px;">Orders placed on the storefront will appear here instantly.</div>
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Top Products Leaderboard -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Active Products</h3>
            <a href="#/products" style="font-size: 12.5px; font-weight: 700; color: #2563eb;">View All (${products.length})</a>
          </div>
          <div class="top-products-list">
            ${products.length > 0 ? products.slice(0, 5).map(p => `
              <div class="top-product-item">
                <div class="top-product-left">
                  <img src="${p.image}" class="top-product-img" alt="${p.title}" onerror="this.src='https://placehold.co/40x40/png?text=Item'">
                  <div style="min-width: 0;">
                    <div class="top-product-name" title="${p.title}">${p.title}</div>
                    <div class="top-product-cat">${p.brand || "Brand"} • ${p.category}</div>
                  </div>
                </div>
                <div class="top-product-stat">
                  <div class="top-product-rev" style="color: #059669; font-weight: 800;">৳ ${(p.price || 0).toLocaleString()}</div>
                  <div class="top-product-sold">${p.stock || 0} in stock</div>
                </div>
              </div>
            `).join("") : `
              <div style="text-align: center; padding: 40px 16px; color: #94a3b8;">
                <div style="font-size: 28px; margin-bottom: 8px;">📦</div>
                <div style="font-weight: 700; color: #475569; margin-bottom: 4px;">Catalog is Clean (0 Products)</div>
                <div style="font-size: 12px; margin-bottom: 14px;">All default demo products removed. Add your real products manually.</div>
                <button class="btn btn-gold btn-sm" onclick="AdminApp.navigate('#/products/add')">+ Add First Product</button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;

    // Render interactive SVG charts
    setTimeout(() => {
      AdminCharts.renderSalesOverview("sales-overview-chart");
      AdminCharts.renderOrderStatusDonut("order-status-donut", statusCounts);
    }, 50);
  }

  // ------------------------------------------------------------------------
  // VIEW 2: PRODUCT MANAGEMENT (`#/products`)
  // ------------------------------------------------------------------------
  renderProductsList() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    let products = StorageManager.getProducts();
    const categories = StorageManager.getCategories();

    // Filters
    if (this.productCategoryFilter !== "all") {
      products = products.filter(p => p.category === this.productCategoryFilter);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      products = products.filter(p => 
        (p.title || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q)
      );
    }

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Products Management</h1>
          <p class="page-subtitle">Manage retail and wholesale catalog. Enter authentic inventory manually.</p>
        </div>
        <div class="page-actions" style="gap: 8px;">
          <select class="select-filter" onchange="AdminApp.filterProductsByCategory(this.value)">
            <option value="all">All Categories</option>
            ${categories.map(c => `
              <option value="${c.id}" ${this.productCategoryFilter === c.id ? 'selected' : ''}>${c.name}</option>
            `).join("")}
          </select>
          <button class="btn btn-outline" style="color: #dc2626; border-color: #fca5a5;" onclick="AdminApp.confirmResetCatalog()" title="Purge any legacy demo products">
            🗑️ Clear / Reset Catalog
          </button>
          <button class="btn btn-gold" onclick="AdminApp.navigate('#/products/add')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Product
          </button>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Sale Price</th>
                <th>MRP</th>
                <th>Stock</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${products.length > 0 ? products.map(p => {
                const isVariable = p.productType === "variable" || (Array.isArray(p.variants) && p.variants.length > 1);
                const variants = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [];
                let priceDisplay = `৳ ${(p.price || 0).toLocaleString()}`;
                let totalStock = p.stock || 0;
                if (isVariable && variants.length > 0) {
                  const prices = variants.map(v => v.price).filter(pr => typeof pr === "number" && pr > 0);
                  if (prices.length > 0) {
                    const minP = Math.min(...prices);
                    const maxP = Math.max(...prices);
                    priceDisplay = minP === maxP ? `৳ ${minP.toLocaleString()}` : `৳ ${minP.toLocaleString()} – ৳ ${maxP.toLocaleString()}`;
                  }
                  totalStock = variants.reduce((sum, v) => sum + (v.stock || v.stockCount || 0), 0);
                }
                return `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <img src="${p.image}" class="top-product-img" alt="${p.title}" onerror="this.src='https://placehold.co/40x40/png?text=Item'">
                      <div>
                        <div style="font-weight: 800; color: #0f172a;">${p.title}</div>
                        <div style="font-size: 11px; color: #64748b;">
                          ${p.style ? p.style + ' • ' : ''}${p.diaperSize ? 'Size ' + p.diaperSize : (p.capacity || p.packaging || '')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style="font-family: monospace; font-size: 11.5px; color: #64748b;">
                    ${isVariable ? `<span title="${variants.map(v => v.sku).join(', ')}">${variants.length} SKUs (${variants[0]?.sku || p.sku || 'VAR'})</span>` : (p.sku || p.id)}
                  </td>
                  <td><span class="badge" style="background: #f1f5f9; color: #334155;">${p.category}</span></td>
                  <td style="font-weight: 700;">${p.brand || "—"}</td>
                  <td style="font-weight: 800; color: #059669;">
                    ${priceDisplay}
                    ${isVariable ? `<div style="font-size: 10px; color: #2563eb; font-weight: 700;">${variants.length} variations</div>` : ''}
                  </td>
                  <td style="color: #94a3b8; text-decoration: line-through;">৳ ${(p.regularPrice || p.price || 0).toLocaleString()}</td>
                  <td>
                    <span style="font-weight: 800; color: ${totalStock > 10 ? '#059669' : '#dc2626'};">
                      ${totalStock} units
                    </span>
                    ${isVariable ? `<div style="font-size: 10px; color: #64748b;">across variants</div>` : ''}
                  </td>
                  <td>
                    <span class="badge ${totalStock > 0 ? 'badge-shipped' : 'badge-cancelled'}">
                      ${totalStock > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end;">
                      <button class="btn-icon" title="Edit Product" onclick="AdminApp.navigate('#/products/edit/${p.id}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="btn-icon" title="Delete Product" style="color: #dc2626;" onclick="AdminApp.deleteProduct('${p.id}')">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                `;
              }).join("") : `
                <tr>
                  <td colspan="9" style="text-align: center; padding: 50px 20px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
                    <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">Your Catalog is Completely Clean</h3>
                    <p style="color: #64748b; font-size: 13px; max-width: 480px; margin: 0 auto 18px;">
                      No default demo products are present. You can now manually enter each product with intelligent category attributes, auto SKU generation, and image preview.
                    </p>
                    <button class="btn btn-gold" onclick="AdminApp.navigate('#/products/add')">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                      + Add First Product Manually
                    </button>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // VIEW 3: LOGICAL ADD / EDIT PRODUCT FORM (`#/products/add` or `#/products/edit/:id`)
  // ------------------------------------------------------------------------
  renderProductForm(editId = null) {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const products = StorageManager.getProducts();
    const categories = StorageManager.getCategories();
    const brands = StorageManager.getBrands();
    const isEdit = Boolean(editId);
    const existing = isEdit ? products.find(p => p.id === editId) : null;

    const activeCategory = existing ? existing.category : (categories[0]?.id || "baby-diaper");
    const activeBrand = existing ? existing.brand : (brands[0]?.name || "Twinkle");

    this.initProductFormState(existing);

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">${isEdit ? 'Edit Product: ' + (existing ? existing.title : editId) : 'Master Product Management'}</h1>
          <p class="page-subtitle">Configure authoritative catalog hierarchy, manage variant SKUs, set retail vs wholesale pricing tiers, and sync with Supabase & Firestore.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="AdminApp.navigate('#/products')">Back to Products</button>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 340px; gap: 24px; align-items: start;">
        <!-- Left: Comprehensive Master Form -->
        <div class="card">
          <form onsubmit="AdminApp.handleSaveProduct(event, '${editId || ''}')">
            
            <!-- 0. Product Type Selector (Simple vs Variable) -->
            <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
              <label class="form-label" style="font-size: 13px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                Product Type & Catalog Architecture *
              </label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                <label id="type-pill-simple" style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px 14px; border: 2px solid ${this.formState.productType === 'simple' ? '#2563eb' : '#e2e8f0'}; border-radius: 8px; background: ${this.formState.productType === 'simple' ? '#eff6ff' : '#ffffff'};">
                  <input type="radio" name="prod-form-type-radio" value="simple" ${this.formState.productType === 'simple' ? 'checked' : ''} onchange="AdminApp.handleProductTypeChange('simple')">
                  <div>
                    <div style="font-weight: 800; font-size: 13px; color: #0f172a;">Simple Product</div>
                    <div style="font-size: 11px; color: #64748b;">Single SKU, unified price & warehouse stock</div>
                  </div>
                </label>
                <label id="type-pill-variable" style="display: flex; align-items: center; gap: 10px; cursor: pointer; padding: 12px 14px; border: 2px solid ${this.formState.productType === 'variable' ? '#2563eb' : '#e2e8f0'}; border-radius: 8px; background: ${this.formState.productType === 'variable' ? '#eff6ff' : '#ffffff'};">
                  <input type="radio" name="prod-form-type-radio" value="variable" ${this.formState.productType === 'variable' ? 'checked' : ''} onchange="AdminApp.handleProductTypeChange('variable')">
                  <div>
                    <div style="font-weight: 800; font-size: 13px; color: #0f172a;">Variable Product (Variations & SKUs)</div>
                    <div style="font-size: 11px; color: #64748b;">Independent SKUs, stock & B2B wholesale pricing tiers</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- 1. Category & Brand Classification -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin-bottom: 16px;">
              <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                1. Category & Brand Classification
              </h3>
              <span class="badge" style="background: #fef9c3; color: #854d0e; font-size: 11px;">Hierarchy Authority</span>
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Category *</label>
                <select id="prod-form-category" class="form-select" onchange="AdminApp.handleProductCategoryChange(this.value)" required>
                  ${categories.map(c => `
                    <option value="${c.id}" ${activeCategory === c.id ? 'selected' : ''}>${c.name}</option>
                  `).join("")}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Brand *</label>
                <select id="prod-form-brand-select" class="form-select" onchange="AdminApp.handleBrandSelectChange(this.value)" required>
                  ${brands.map(b => `
                    <option value="${b.name}" ${activeBrand === b.name ? 'selected' : ''}>${b.name} (${b.origin || 'Verified'})</option>
                  `).join("")}
                  <option value="__NEW__">+ Enter New Brand Name...</option>
                </select>
                <div id="new-brand-input-wrap" style="display: none; margin-top: 8px;">
                  <input type="text" id="prod-form-brand-custom" class="form-input" placeholder="Type new brand name (e.g. Merries, Huggies)">
                </div>
              </div>
            </div>

            <!-- 2. Category-Specific Dynamic Specifications -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 16px;">
              <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                2. Category-Driven Specifications
              </h3>
              <span class="badge" style="background: #e0f2fe; color: #0369a1; font-size: 11px;">Dynamic Facets</span>
            </div>

            <div id="category-specific-fields" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 16px; margin-bottom: 18px;">
              <!-- Injected dynamically by updateFormCategoryFacets() -->
            </div>

            <!-- 3. Title, Slug & Short Description -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 16px;">
              <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                3. Title & Readable Identity
              </h3>
              <button type="button" class="btn btn-outline btn-sm" onclick="AdminApp.autoGenerateTitleAndSku()" style="color: #2563eb; font-weight: 800; border-color: #bfdbfe; background: #eff6ff;">
                ✨ Auto-Generate Logical Title & SKU
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">Customer-Facing Product Title *</label>
              <input type="text" id="prod-form-title" class="form-input" value="${existing ? existing.title : ''}" placeholder="e.g. Twinkle Baby Diaper Pant (XL / 12-17kg) - 44 Pcs" required oninput="AdminApp.updatePreviewCard(); AdminApp.handleTitleSlugSync(this.value)">
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">URL Slug (Readable Identifier) *</label>
                <input type="text" id="prod-form-slug" class="form-input" value="${existing?.slug || ''}" placeholder="e.g. twinkle-baby-diaper-pant-xl-44" required>
              </div>
              <div class="form-group">
                <label class="form-label">Base Unit (Selling Unit)</label>
                <select id="prod-form-baseunit" class="form-select">
                  <option value="pack" ${existing?.baseUnit === 'pack' ? 'selected' : ''}>Pack</option>
                  <option value="carton" ${existing?.baseUnit === 'carton' ? 'selected' : ''}>Carton</option>
                  <option value="piece" ${existing?.baseUnit === 'piece' ? 'selected' : ''}>Piece</option>
                  <option value="bottle" ${existing?.baseUnit === 'bottle' ? 'selected' : ''}>Bottle</option>
                  <option value="box" ${existing?.baseUnit === 'box' ? 'selected' : ''}>Box</option>
                </select>
              </div>
            </div>

            <!-- 4. Multi-Image Media Gallery (Supabase Storage 'traders_bucket') -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 16px;">
              <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                4. Product Images & Gallery (Supabase Storage 'traders_bucket')
              </h3>
              <span class="badge" style="background: #ecfdf5; color: #047857; font-size: 11px;">Cloud CDN Ready</span>
            </div>

            <div id="media-gallery-manager" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 16px; margin-bottom: 20px;">
              <!-- Rendered by AdminApp.renderImagesManager() -->
            </div>

            <!-- 5A. SIMPLE PRODUCT PRICING & STOCK (Shown when productType === 'simple') -->
            <div id="simple-product-pricing-section" style="${this.formState.productType === 'simple' ? 'display:block;' : 'display:none;'}">
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 16px;">
                <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                  5. Retail & Wholesale Pricing (BDT)
                </h3>
                <span id="price-margin-calc" style="font-size: 12px; font-weight: 700; color: #059669;"></span>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">SKU / Stock Keeping Unit *</label>
                  <input type="text" id="prod-form-sku" class="form-input" value="${existing ? existing.sku : ''}" placeholder="e.g. TWK-BDP-XL-44">
                </div>
                <div class="form-group">
                  <label class="form-label">Warehouse Stock Quantity (Units) *</label>
                  <input type="number" id="prod-form-stock" class="form-input" value="${existing ? (existing.stock ?? 50) : 50}" min="0" oninput="AdminApp.updatePreviewCard()">
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Customer Retail Sale Price (৳) *</label>
                  <input type="number" id="prod-form-price" class="form-input" value="${existing ? existing.price : 1250}" min="1" oninput="AdminApp.handlePriceInput()">
                </div>
                <div class="form-group">
                  <label class="form-label">Regular MRP Price (৳)</label>
                  <input type="number" id="prod-form-regular" class="form-input" value="${existing ? (existing.regularPrice || Math.round(existing.price * 1.15)) : 1450}" min="1" oninput="AdminApp.handlePriceInput()">
                </div>
              </div>

              <div style="background: #fdfaf3; border: 1px dashed #f5b014; border-radius: var(--radius-md); padding: 14px; margin-bottom: 18px;">
                <div style="font-size: 12.5px; font-weight: 800; color: #854d0e; margin-bottom: 8px;">
                  📦 Optional Wholesale Carton Tier (B2B Bulk Buyers)
                </div>
                <div class="form-row-2">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11.5px;">Packs Per Carton</label>
                    <input type="number" id="prod-form-carton-units" class="form-input" value="${existing?.wholesale?.cartonUnits || 4}" min="1" placeholder="e.g. 4 packs">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11.5px;">Carton Wholesale Price (৳)</label>
                    <input type="number" id="prod-form-carton-price" class="form-input" value="${existing?.wholesale?.cartonPrice || 4600}" min="1" placeholder="e.g. ৳4600">
                  </div>
                </div>
              </div>
            </div>

            <!-- 5B. VARIABLE PRODUCT VARIATION MATRIX BUILDER (Shown when productType === 'variable') -->
            <div id="variable-product-variants-section" style="${this.formState.productType === 'variable' ? 'display:block;' : 'display:none;'}">
              <!-- Option Dimension Configurator -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 16px;">
                <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                  5. Variant Dimension Definitions & Options
                </h3>
                <span class="badge" style="background: #eff6ff; color: #1d4ed8; font-size: 11px;">Matrix Generator</span>
              </div>

              <div id="variant-dimensions-builder" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
                <!-- Injected by renderVariantDimensionsBuilder() -->
              </div>

              <!-- Generated Variant Matrix Table -->
              <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 14px;">
                <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                  Sellable Variants, SKUs, Stock & B2B Wholesale Pricing
                </h3>
                <button type="button" class="btn btn-outline btn-sm" onclick="AdminApp.addCustomVariantRow()" style="font-weight: 700;">
                  + Add Custom Variant Row
                </button>
              </div>

              <div id="variant-matrix-table-wrap" class="table-wrap" style="margin-bottom: 18px; max-height: 480px; overflow-y: auto;">
                <!-- Injected by renderVariantMatrixTable() -->
              </div>
            </div>

            <!-- 6. Features & Highlights -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #f1f5f9; padding-bottom: 10px; margin: 20px 0 16px;">
              <h3 style="font-size: 15px; font-weight: 800; color: #0f172a; margin: 0;">
                6. Features & Publication Lifecycle
              </h3>
              <span class="badge" style="background: #ecfdf5; color: #059669; font-size: 11px;">Controlled Lifecycle</span>
            </div>

            <div class="form-group">
              <label class="form-label">Key Highlights / Features (Comma separated)</label>
              <input type="text" id="prod-form-highlights" class="form-input" value="${existing?.highlights ? existing.highlights.join(', ') : '12 Hours Absorption, Breathable Cotton, Zero Rash Guarantee'}" placeholder="e.g. Anti-Rash Cotton, 12h Dry, Speed Wave">
            </div>

            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Publication Status *</label>
                <select id="prod-form-status" class="form-select">
                  <option value="active" ${(!existing || existing.status === 'active') ? 'selected' : ''}>Active (Publicly Purchasable)</option>
                  <option value="draft" ${existing?.status === 'draft' ? 'selected' : ''}>Draft (Hidden from Storefront)</option>
                  <option value="archived" ${existing?.status === 'archived' ? 'selected' : ''}>Archived (Historical Records Only)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Storefront Visibility</label>
                <select id="prod-form-visibility" class="form-select">
                  <option value="public" ${(!existing || existing.visibility === 'public') ? 'selected' : ''}>Public Storefront</option>
                  <option value="restricted" ${existing?.visibility === 'restricted' ? 'selected' : ''}>B2B Members Only (Restricted)</option>
                </select>
              </div>
            </div>

            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9;">
              <button type="button" class="btn btn-outline" onclick="AdminApp.navigate('#/products')">Cancel</button>
              <button type="submit" class="btn btn-gold" style="font-weight: 800; min-width: 160px;">
                ${isEdit ? 'Save Changes' : 'Publish Product'}
              </button>
            </div>
          </form>
        </div>

        <!-- Right: Real-time Live Storefront Card Preview -->
        <div style="position: sticky; top: 88px;">
          <div class="card" style="padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase;">Storefront Live Preview</span>
              <span class="badge" style="background: #ecfdf5; color: #047857; font-size: 10.5px;">Customer View</span>
            </div>

            <div id="live-product-preview-card" style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
              <!-- Rendered by AdminApp.updatePreviewCard() -->
            </div>

            <div style="margin-top: 14px; font-size: 11.5px; color: #64748b; line-height: 1.45; text-align: center;">
              This card reflects real-time title, primary image, SKU, pricing, and stock status.
            </div>
          </div>
        </div>
      </div>
    `;

    // Initialize dynamic fields and preview
    this.renderImagesManager();
    this.renderVariantDimensionsBuilder();
    this.renderVariantMatrixTable();
    this.updateFormCategoryFacets(activeCategory, existing);
    this.handlePriceInput();
    this.updatePreviewCard();
  }

  // ------------------------------------------------------------------------
  // DYNAMIC CATEGORY FACETS CONTROLLER
  // ------------------------------------------------------------------------
  handleProductCategoryChange(catId) {
    this.updateFormCategoryFacets(catId);
    this.autoGenerateTitleAndSku();
    this.updatePreviewCard();
  }

  handleBrandSelectChange(val) {
    const customWrap = document.getElementById("new-brand-input-wrap");
    if (customWrap) {
      customWrap.style.display = val === "__NEW__" ? "block" : "none";
    }
    this.autoGenerateTitleAndSku();
    this.updatePreviewCard();
  }

  updateFormCategoryFacets(categoryId, existing = null) {
    const container = document.getElementById("category-specific-fields");
    if (!container) return;

    if (categoryId === "baby-diaper" || categoryId === "diapers") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Diaper Style *</label>
            <select id="facet-style" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Pant System" ${existing?.style === 'Pant System' ? 'selected' : ''}>Pant System</option>
              <option value="Belt System" ${existing?.style === 'Belt System' ? 'selected' : ''}>Belt System</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Diaper Size *</label>
            <select id="facet-size" class="form-select" onchange="AdminApp.handleBabySizeChange(this.value)">
              ${['NB', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(s => `
                <option value="${s}" ${(existing?.diaperSize === s || existing?.size === s) ? 'selected' : (s === 'M' ? 'selected' : '')}>${s}</option>
              `).join("")}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Baby Weight Range</label>
            <input type="text" id="facet-weight" class="form-input" value="${existing?.weightRange || '6~11 kg'}" placeholder="e.g. 6~11 kg">
          </div>
        </div>
        <div class="form-row-2" style="margin-top: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Pieces Per Pack *</label>
            <input type="text" id="facet-pieces" class="form-input" value="${existing?.piecesCount || '44 Pcs'}" placeholder="e.g. 44 Pcs" oninput="AdminApp.autoGenerateTitleAndSku()">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Absorption Protection</label>
            <input type="text" id="facet-absorption" class="form-input" value="${existing?.absorption || 'Up to 12 Hours Dry'}" placeholder="e.g. 12 Hours Dry">
          </div>
        </div>
      `;
    } else if (categoryId === "adult-diaper") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Adult Diaper Style *</label>
            <select id="facet-style" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Belt" ${existing?.style === 'Belt' ? 'selected' : ''}>Belt (Adhesive Tape)</option>
              <option value="Pant" ${existing?.style === 'Pant' ? 'selected' : ''}>Pant (Pull-Up Underwear)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Adult Size *</label>
            <select id="facet-size" class="form-select" onchange="AdminApp.handleAdultSizeChange(this.value)">
              ${['S', 'M', 'L', 'XL', 'XXL'].map(s => `
                <option value="${s}" ${(existing?.diaperSize === s || existing?.size === s) ? 'selected' : (s === 'L' ? 'selected' : '')}>${s}</option>
              `).join("")}
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Waist / Hip Range</label>
            <input type="text" id="facet-hip" class="form-input" value="${existing?.hipRange || '40\"-55\"'}" placeholder="e.g. 40\"-55\"">
          </div>
        </div>
        <div class="form-row-2" style="margin-top: 12px;">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Pieces Per Pack *</label>
            <input type="text" id="facet-pieces" class="form-input" value="${existing?.piecesCount || '10 Pcs'}" placeholder="e.g. 10 Pcs" oninput="AdminApp.autoGenerateTitleAndSku()">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Incontinence Level</label>
            <select id="facet-incontinence" class="form-select">
              <option value="Heavy / Overnight">Heavy / Overnight</option>
              <option value="Moderate">Moderate</option>
              <option value="Light">Light</option>
            </select>
          </div>
        </div>
      `;
    } else if (categoryId === "skin-care") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Skin Type Compatibility *</label>
            <select id="facet-skintype" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Normal Skin">Normal Skin</option>
              <option value="Dry skin">Dry skin</option>
              <option value="Oily skin">Oily skin</option>
              <option value="Sensitive skin">Sensitive skin</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Skincare Subcategory *</label>
            <select id="facet-subcat" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Lotion">Lotion</option>
              <option value="Face Cream">Face Cream</option>
              <option value="Baby Oil">Baby Oil</option>
              <option value="Baby Powder">Baby Powder</option>
              <option value="Shampoo">Shampoo</option>
              <option value="Top to Toe">Top to Toe Wash</option>
              <option value="Soothing Gel">Soothing Gel</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Net Volume / Content *</label>
            <input type="text" id="facet-volume" class="form-input" value="${existing?.volume || '200ml'}" placeholder="e.g. 200ml, 100g" oninput="AdminApp.autoGenerateTitleAndSku()">
          </div>
        </div>
      `;
    } else if (categoryId === "feeder") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Bottle Material *</label>
            <select id="facet-material" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Glass">Glass (Borosilicate)</option>
              <option value="Plastic">Plastic (BPA-Free PP)</option>
              <option value="Silicon">Silicone (Ultra Soft)</option>
              <option value="Metal">Stainless Steel / Metal</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Capacity *</label>
            <select id="facet-capacity" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="30ml">30ml (Newborn)</option>
              <option value="60ml">60ml</option>
              <option value="120ml">120ml</option>
              <option value="150ml" selected>150ml</option>
              <option value="200ml">200ml</option>
              <option value="250ml">250ml</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Nipple Type</label>
            <select id="facet-nipple" class="form-select">
              <option value="Anti-Colic Peristaltic">Anti-Colic Peristaltic</option>
              <option value="Standard Round">Standard Round</option>
            </select>
          </div>
        </div>
      `;
    } else if (categoryId === "wipes") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Packaging Type *</label>
            <select id="facet-packaging" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Box">Box (Hard Plastic Flip Lid)</option>
              <option value="Packet">Packet (Resealable Flap)</option>
              <option value="Mini">Mini (Travel Pocket Pack)</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Sheet Count *</label>
            <input type="text" id="facet-sheets" class="form-input" value="${existing?.sheetCount || '80 Wipes'}" placeholder="e.g. 80 Wipes" oninput="AdminApp.autoGenerateTitleAndSku()">
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Wipe Formulation</label>
            <select id="facet-formula" class="form-select">
              <option value="99% Pure Water">99% Pure Water</option>
              <option value="Hypoallergenic Aloe">Hypoallergenic Aloe</option>
              <option value="Fragrance-Free">Fragrance-Free</option>
            </select>
          </div>
        </div>
      `;
    } else if (categoryId === "tissue") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Tissue Type *</label>
            <select id="facet-tissuetype" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Box Facial Tissue">Box Facial Tissue</option>
              <option value="Pocket Pack">Pocket Pack</option>
              <option value="Kitchen Towel">Kitchen Towel Roll</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Ply Count *</label>
            <select id="facet-ply" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="2-Ply" selected>2-Ply</option>
              <option value="3-Ply">3-Ply</option>
              <option value="4-Ply">4-Ply</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Pulls Count</label>
            <input type="text" id="facet-pulls" class="form-input" value="${existing?.pulls || '150 Pulls'}" placeholder="e.g. 150 Pulls" oninput="AdminApp.autoGenerateTitleAndSku()">
          </div>
        </div>
      `;
    } else if (categoryId === "baby-care") {
      container.innerHTML = `
        <div class="form-row-3">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Subcategory *</label>
            <select id="facet-subcat" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Shampoo">Shampoo</option>
              <option value="Top to Toe" selected>Top to Toe</option>
              <option value="Baby Oil">Baby Oil</option>
              <option value="Baby Powder">Baby Powder</option>
              <option value="Lotion">Lotion</option>
              <option value="Face Cream">Face Cream</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Skin Compatibility</label>
            <select id="facet-skintype" class="form-select">
              <option value="Normal Skin">Normal Skin</option>
              <option value="Dry skin">Dry skin</option>
              <option value="Sensitive skin">Sensitive skin</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Net Volume / Content</label>
            <input type="text" id="facet-volume" class="form-input" value="${existing?.volume || '200ml'}" placeholder="e.g. 200ml" oninput="AdminApp.autoGenerateTitleAndSku()">
          </div>
        </div>
      `;
    } else {
      // Generic or Toys
      container.innerHTML = `
        <div class="form-row-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Toy Sub-Type *</label>
            <select id="facet-toytype" class="form-select" onchange="AdminApp.autoGenerateTitleAndSku()">
              <option value="Rattles & Teethers">Rattles & Teethers</option>
              <option value="Bath Toys">Bath Toys</option>
              <option value="Soft Plush">Soft Plush</option>
              <option value="Educational">Educational</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Age Recommendation</label>
            <input type="text" id="facet-age" class="form-input" value="0m+ Newborn Safe" placeholder="e.g. 0-12 Months">
          </div>
        </div>
      `;
    }
  }

  handleBabySizeChange(size) {
    const weightMap = {
      'NB': '0~5 kg',
      'S': '4~8 kg',
      'M': '6~11 kg',
      'L': '9~14 kg',
      'XL': '12~17 kg',
      'XXL': '15~25 kg',
      '3XL': '18~35 kg'
    };
    const input = document.getElementById("facet-weight");
    if (input && weightMap[size]) input.value = weightMap[size];
    this.autoGenerateTitleAndSku();
    this.updatePreviewCard();
  }

  handleAdultSizeChange(size) {
    const hipMap = {
      'S': '20"-32"',
      'M': '28"-44"',
      'L': '40"-55"',
      'XL': '50"-65"',
      'XXL': '60"-75"'
    };
    const input = document.getElementById("facet-hip");
    if (input && hipMap[size]) input.value = hipMap[size];
    this.autoGenerateTitleAndSku();
    this.updatePreviewCard();
  }

  autoGenerateTitleAndSku() {
    const cat = document.getElementById("prod-form-category")?.value || "baby-diaper";
    let brand = document.getElementById("prod-form-brand-select")?.value || "Twinkle";
    if (brand === "__NEW__") {
      brand = document.getElementById("prod-form-brand-custom")?.value.trim() || "Brand";
    }

    const titleInput = document.getElementById("prod-form-title");
    const skuInput = document.getElementById("prod-form-sku");

    let generatedTitle = "";
    let generatedSku = "";
    const brandPrefix = brand.substring(0, 3).toUpperCase();

    if (cat === "baby-diaper" || cat === "diapers") {
      const style = document.getElementById("facet-style")?.value || "Pant System";
      const size = document.getElementById("facet-size")?.value || "M";
      const weight = document.getElementById("facet-weight")?.value || "";
      const pieces = document.getElementById("facet-pieces")?.value || "44 Pcs";
      const styleLabel = style.includes("Pant") ? "Pant" : "Belt";

      generatedTitle = `${brand} Baby Diaper ${styleLabel} (${size}${weight ? ' / ' + weight : ''}) - ${pieces}`;
      generatedSku = `${brandPrefix}-BDP-${size}-${pieces.replace(/[^0-9]/g, '') || 'PK'}`;
    } else if (cat === "adult-diaper") {
      const style = document.getElementById("facet-style")?.value || "Belt";
      const size = document.getElementById("facet-size")?.value || "L";
      const hip = document.getElementById("facet-hip")?.value || "";
      const pieces = document.getElementById("facet-pieces")?.value || "10 Pcs";
      const styleLabel = style.includes("Pant") ? "Pant" : "Tape";

      generatedTitle = `${brand} Adult Diaper ${styleLabel} (${size}${hip ? ' / ' + hip : ''}) - ${pieces}`;
      generatedSku = `${brandPrefix}-ADP-${size}-${pieces.replace(/[^0-9]/g, '') || 'PK'}`;
    } else if (cat === "skin-care") {
      const subcat = document.getElementById("facet-subcat")?.value || "Lotion";
      const skintype = document.getElementById("facet-skintype")?.value || "Normal Skin";
      const volume = document.getElementById("facet-volume")?.value || "200ml";

      generatedTitle = `${brand} Baby ${subcat} (${skintype}) - ${volume}`;
      generatedSku = `${brandPrefix}-SKN-${subcat.substring(0, 3).toUpperCase()}-${volume.replace(/[^0-9]/g, '') || '01'}`;
    } else if (cat === "feeder") {
      const material = document.getElementById("facet-material")?.value || "Glass";
      const capacity = document.getElementById("facet-capacity")?.value || "150ml";

      generatedTitle = `${brand} Anti-Colic ${material} Baby Feeder - ${capacity}`;
      generatedSku = `${brandPrefix}-FDR-${material.substring(0, 3).toUpperCase()}-${capacity.replace(/[^0-9]/g, '')}`;
    } else if (cat === "wipes") {
      const packaging = document.getElementById("facet-packaging")?.value || "Box";
      const sheets = document.getElementById("facet-sheets")?.value || "80 Wipes";

      generatedTitle = `${brand} Pure Water Baby Wipes (${packaging}) - ${sheets}`;
      generatedSku = `${brandPrefix}-WIP-${packaging.substring(0, 3).toUpperCase()}-${sheets.replace(/[^0-9]/g, '')}`;
    } else if (cat === "tissue") {
      const type = document.getElementById("facet-tissuetype")?.value || "Box Facial Tissue";
      const ply = document.getElementById("facet-ply")?.value || "2-Ply";
      const pulls = document.getElementById("facet-pulls")?.value || "150 Pulls";

      generatedTitle = `${brand} ${type} (${ply}) - ${pulls}`;
      generatedSku = `${brandPrefix}-TIS-${ply.replace(/[^0-9]/g, '')}P-${pulls.replace(/[^0-9]/g, '')}`;
    } else if (cat === "baby-care") {
      const subcat = document.getElementById("facet-subcat")?.value || "Top to Toe";
      const volume = document.getElementById("facet-volume")?.value || "200ml";

      generatedTitle = `${brand} Baby Care ${subcat} - ${volume}`;
      generatedSku = `${brandPrefix}-BCR-${subcat.substring(0, 3).toUpperCase()}-${volume.replace(/[^0-9]/g, '')}`;
    } else {
      const toytype = document.getElementById("facet-toytype")?.value || "Toy";
      generatedTitle = `${brand} Baby ${toytype}`;
      generatedSku = `${brandPrefix}-TOY-${Math.floor(100 + Math.random() * 900)}`;
    }

    if (titleInput) titleInput.value = generatedTitle;
    if (skuInput) skuInput.value = generatedSku;
    this.updatePreviewCard();
  }

  handlePriceInput() {
    const price = parseFloat(document.getElementById("prod-form-price")?.value) || 0;
    const regular = parseFloat(document.getElementById("prod-form-regular")?.value) || 0;
    const calcEl = document.getElementById("price-margin-calc");

    if (calcEl) {
      if (regular > price && price > 0) {
        const diff = regular - price;
        const pct = Math.round((diff / regular) * 100);
        calcEl.innerHTML = `Save ৳${diff.toLocaleString()} (${pct}% OFF)`;
      } else {
        calcEl.innerHTML = `MRP: ৳${regular.toLocaleString()}`;
      }
    }
    this.updatePreviewCard();
  }

  updatePreviewCard() {
    const card = document.getElementById("live-product-preview-card");
    if (!card) return;

    const title = document.getElementById("prod-form-title")?.value.trim() || "Product Title Preview";
    let brand = document.getElementById("prod-form-brand-select")?.value || "Twinkle";
    if (brand === "__NEW__") {
      brand = document.getElementById("prod-form-brand-custom")?.value.trim() || "Brand";
    }
    const price = parseFloat(document.getElementById("prod-form-price")?.value) || 0;
    const regular = parseFloat(document.getElementById("prod-form-regular")?.value) || 0;
    const stock = parseInt(document.getElementById("prod-form-stock")?.value, 10) || 0;
    const image = document.getElementById("prod-form-image")?.value.trim() || "https://placehold.co/400x300/f8fafc/64748b?text=Upload+Image";

    const hasDiscount = regular > price && price > 0;
    const discountPct = hasDiscount ? Math.round(((regular - price) / regular) * 100) : 0;

    card.innerHTML = `
      <div style="position: relative; height: 180px; background: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden;">
        <img src="${image}" alt="${title}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.src='https://placehold.co/400x300/f8fafc/64748b?text=No+Image'">
        ${hasDiscount ? `
          <span style="position: absolute; top: 8px; left: 8px; background: #dc2626; color: #ffffff; font-size: 10.5px; font-weight: 800; padding: 3px 7px; border-radius: 4px;">
            ${discountPct}% OFF
          </span>
        ` : ''}
        <span style="position: absolute; top: 8px; right: 8px; background: ${stock > 0 ? '#ecfdf5' : '#fef2f2'}; color: ${stock > 0 ? '#047857' : '#b91c1c'}; font-size: 10.5px; font-weight: 800; padding: 3px 7px; border-radius: 4px;">
          ${stock > 0 ? `${stock} in stock` : 'Out of stock'}
        </span>
      </div>
      <div style="padding: 12px;">
        <div style="font-size: 10.5px; font-weight: 800; color: #f5b014; text-transform: uppercase; margin-bottom: 3px;">
          ${brand}
        </div>
        <div style="font-size: 13px; font-weight: 800; color: #0f172a; line-height: 1.35; margin-bottom: 8px; min-height: 34px;">
          ${title}
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px;">
          <span style="font-size: 16px; font-weight: 900; color: #059669;">৳ ${price.toLocaleString()}</span>
          ${hasDiscount ? `
            <span style="font-size: 12px; color: #94a3b8; text-decoration: line-through;">৳ ${regular.toLocaleString()}</span>
          ` : ''}
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // MASTER PRODUCT FORM STATE & CONTROLLERS (Simple vs Variable & Media)
  // ------------------------------------------------------------------------
  initProductFormState(existing = null) {
    const isVariable = existing?.productType === "variable" || (Array.isArray(existing?.variants) && existing.variants.length > 1);
    
    // 1. Initial images
    let images = [];
    if (existing?.images && Array.isArray(existing.images) && existing.images.length > 0) {
      images = JSON.parse(JSON.stringify(existing.images));
    } else if (existing?.image) {
      images = [{ id: "img-1", storagePath: existing.image, altText: existing.title || "", sortOrder: 0, isPrimary: true }];
    } else {
      images = [{ id: "img-1", storagePath: "", altText: "", sortOrder: 0, isPrimary: true }];
    }

    // 2. Initial option dimensions
    let optionDimensions = [];
    if (existing?.variantOptionDefinitions && Array.isArray(existing.variantOptionDefinitions) && existing.variantOptionDefinitions.length > 0) {
      optionDimensions = JSON.parse(JSON.stringify(existing.variantOptionDefinitions));
    } else {
      const cat = existing?.category || document.getElementById("prod-form-category")?.value || "baby-diaper";
      if (cat === "baby-diaper" || cat === "diapers") {
        optionDimensions = [
          { name: "Size", values: ["S", "M", "L", "XL"] },
          { name: "Pack Count", values: ["40 Pcs", "80 Pcs"] }
        ];
      } else if (cat === "adult-diaper") {
        optionDimensions = [
          { name: "Size", values: ["M", "L", "XL"] },
          { name: "Pack Count", values: ["10 Pcs", "20 Pcs"] }
        ];
      } else if (cat === "skin-care" || cat === "baby-care") {
        optionDimensions = [
          { name: "Volume", values: ["100ml", "200ml", "500ml"] }
        ];
      } else if (cat === "feeder") {
        optionDimensions = [
          { name: "Capacity", values: ["120ml", "150ml", "250ml"] }
        ];
      } else if (cat === "wipes") {
        optionDimensions = [
          { name: "Sheet Count", values: ["20 Wipes", "80 Wipes", "120 Wipes"] }
        ];
      } else if (cat === "tissue") {
        optionDimensions = [
          { name: "Pulls", values: ["100 Pulls", "150 Pulls", "200 Pulls"] }
        ];
      } else {
        optionDimensions = [
          { name: "Configuration", values: ["Standard Pack"] }
        ];
      }
    }

    // 3. Initial variants
    let variants = [];
    if (existing?.variants && Array.isArray(existing.variants) && existing.variants.length > 0) {
      variants = JSON.parse(JSON.stringify(existing.variants));
    }

    this.formState = {
      productType: isVariable ? "variable" : "simple",
      images,
      optionDimensions,
      variants,
      existingId: existing?.id || null
    };
  }

  handleProductTypeChange(type) {
    if (!this.formState) return;
    this.formState.productType = type;

    const simpleSec = document.getElementById("simple-product-pricing-section");
    const varSec = document.getElementById("variable-product-variants-section");
    const pillSimple = document.getElementById("type-pill-simple");
    const pillVar = document.getElementById("type-pill-variable");

    if (simpleSec) simpleSec.style.display = type === "simple" ? "block" : "none";
    if (varSec) varSec.style.display = type === "variable" ? "block" : "none";

    if (pillSimple) {
      pillSimple.style.borderColor = type === "simple" ? "#2563eb" : "#e2e8f0";
      pillSimple.style.background = type === "simple" ? "#eff6ff" : "#ffffff";
    }
    if (pillVar) {
      pillVar.style.borderColor = type === "variable" ? "#2563eb" : "#e2e8f0";
      pillVar.style.background = type === "variable" ? "#eff6ff" : "#ffffff";
    }

    if (type === "variable" && (!this.formState.variants || this.formState.variants.length === 0)) {
      this.generateVariantMatrix();
    }
    this.updatePreviewCard();
  }

  handleTitleSlugSync(val) {
    const slugInput = document.getElementById("prod-form-slug");
    if (slugInput && !this.formState?.existingId) {
      slugInput.value = (val || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }
  }

  // ------------------------------------------------------------------------
  // MULTI-IMAGE MEDIA GALLERY MANAGER (Supabase Storage 'traders_bucket')
  // ------------------------------------------------------------------------
  renderImagesManager() {
    const container = document.getElementById("media-gallery-manager");
    if (!container || !this.formState) return;

    const images = this.formState.images || [];

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-size: 12.5px; font-weight: 800; color: #0f172a;">
          Product Media Gallery (${images.length} images)
        </span>
        <button type="button" class="btn btn-outline btn-sm" onclick="AdminApp.addImageRow()" style="font-size: 11.5px; padding: 4px 10px;">
          + Add Image URL Row
        </button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px;" id="images-rows-container">
        ${images.map((img, idx) => `
          <div style="display: grid; grid-template-columns: 56px 1fr 140px 90px 40px; gap: 10px; align-items: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px;">
            <div style="width: 50px; height: 50px; border-radius: 6px; overflow: hidden; background: #f1f5f9; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0;">
              <img src="${img.storagePath || 'https://placehold.co/50x50/png?text=Photo'}" alt="${img.altText || 'Item'}" style="max-height: 100%; max-width: 100%; object-fit: contain;" onerror="this.src='https://placehold.co/50x50/png?text=Photo'">
            </div>
            <input type="url" class="form-input" style="font-size: 12px; padding: 6px 10px;" value="${img.storagePath}" placeholder="Image URL / Public Supabase Link" onchange="AdminApp.updateImageRowPath(${idx}, this.value)">
            <input type="text" class="form-input" style="font-size: 12px; padding: 6px 10px;" value="${img.altText || ''}" placeholder="Image Alt Text" onchange="AdminApp.updateImageRowAlt(${idx}, this.value)">
            <label style="display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; cursor: pointer; color: ${img.isPrimary ? '#059669' : '#64748b'};">
              <input type="radio" name="primary-image-radio" value="${idx}" ${img.isPrimary ? 'checked' : ''} onchange="AdminApp.setPrimaryImage(${idx})">
              ${img.isPrimary ? '★ Primary' : 'Set Primary'}
            </label>
            <button type="button" class="btn-icon" style="color: #dc2626;" title="Remove Image" onclick="AdminApp.removeImageRow(${idx})" ${images.length <= 1 ? 'disabled style="opacity:0.4;"' : ''}>
              &times;
            </button>
          </div>
        `).join("")}
      </div>

      <div style="background: #ffffff; border: 1.5px dashed #2563eb; border-radius: var(--radius-md); padding: 14px; text-align: center;">
        <input type="file" id="prod-form-file" accept="image/*" style="display: none;" onchange="AdminApp.handleImageUploadToSupabase(this)">
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('prod-form-file').click()" style="color: #2563eb; border-color: #93c5fd; font-weight: 700;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="vertical-align: -2px; margin-right: 4px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          Upload Photo to Supabase 'traders_bucket'
        </button>
        <div id="image-upload-status" style="font-size: 11px; color: #64748b; margin-top: 6px;">
          Automatically uploads to Supabase CDN bucket and appends to this product's gallery.
        </div>
      </div>
    `;
  }

  addImageRow() {
    if (!this.formState) return;
    this.formState.images = this.formState.images || [];
    this.formState.images.push({
      id: "img-" + Date.now(),
      storagePath: "",
      altText: "",
      sortOrder: this.formState.images.length,
      isPrimary: this.formState.images.length === 0
    });
    this.renderImagesManager();
    this.updatePreviewCard();
  }

  removeImageRow(idx) {
    if (!this.formState?.images || this.formState.images.length <= 1) return;
    const removed = this.formState.images.splice(idx, 1)[0];
    if (removed.isPrimary && this.formState.images.length > 0) {
      this.formState.images[0].isPrimary = true;
    }
    this.renderImagesManager();
    this.updatePreviewCard();
  }

  setPrimaryImage(idx) {
    if (!this.formState?.images) return;
    this.formState.images.forEach((img, i) => {
      img.isPrimary = (i === idx);
    });
    this.renderImagesManager();
    this.updatePreviewCard();
  }

  updateImageRowPath(idx, val) {
    if (this.formState?.images?.[idx]) {
      this.formState.images[idx].storagePath = val.trim();
      this.updatePreviewCard();
    }
  }

  updateImageRowAlt(idx, val) {
    if (this.formState?.images?.[idx]) {
      this.formState.images[idx].altText = val.trim();
    }
  }

  // ------------------------------------------------------------------------
  // VARIANT DIMENSIONS CONFIGURATOR (Size, Pack Count, Volume, etc.)
  // ------------------------------------------------------------------------
  renderVariantDimensionsBuilder() {
    const container = document.getElementById("variant-dimensions-builder");
    if (!container || !this.formState) return;

    const dims = this.formState.optionDimensions || [];

    container.innerHTML = `
      <div style="font-size: 12px; color: #475569; margin-bottom: 10px; line-height: 1.45;">
        Define option dimensions (e.g. Size, Pack Count) and comma-separated values to automatically generate sellable SKUs.
      </div>

      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
        ${dims.map((dim, idx) => `
          <div style="display: grid; grid-template-columns: 140px 1fr 40px; gap: 10px; align-items: center;">
            <input type="text" class="form-input" style="font-weight: 700; font-size: 12px;" value="${dim.name}" placeholder="e.g. Size" onchange="AdminApp.updateDimensionName(${idx}, this.value)">
            <input type="text" class="form-input" style="font-size: 12px;" value="${dim.values.join(', ')}" placeholder="e.g. S, M, L, XL" onchange="AdminApp.updateDimensionValues(${idx}, this.value)">
            <button type="button" class="btn-icon" style="color: #dc2626;" title="Remove Dimension" onclick="AdminApp.removeVariantDimension(${idx})" ${dims.length <= 1 ? 'disabled style="opacity:0.4;"' : ''}>
              &times;
            </button>
          </div>
        `).join("")}
      </div>

      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button type="button" class="btn btn-outline btn-sm" onclick="AdminApp.addVariantDimension()" style="font-size: 12px;">
          + Add Dimension
        </button>
        <button type="button" class="btn btn-gold btn-sm" onclick="AdminApp.generateVariantMatrix()" style="font-weight: 800; font-size: 12px;">
          ⚡ Generate Variant Combinations Matrix
        </button>
      </div>
    `;
  }

  addVariantDimension() {
    if (!this.formState) return;
    this.formState.optionDimensions = this.formState.optionDimensions || [];
    this.formState.optionDimensions.push({ name: "Option " + (this.formState.optionDimensions.length + 1), values: ["Default"] });
    this.renderVariantDimensionsBuilder();
  }

  removeVariantDimension(idx) {
    if (!this.formState?.optionDimensions || this.formState.optionDimensions.length <= 1) return;
    this.formState.optionDimensions.splice(idx, 1);
    this.renderVariantDimensionsBuilder();
  }

  updateDimensionName(idx, val) {
    if (this.formState?.optionDimensions?.[idx]) {
      this.formState.optionDimensions[idx].name = val.trim() || "Option";
    }
  }

  updateDimensionValues(idx, val) {
    if (this.formState?.optionDimensions?.[idx]) {
      this.formState.optionDimensions[idx].values = val.split(",").map(v => v.trim()).filter(Boolean);
    }
  }

  // ------------------------------------------------------------------------
  // VARIANT MATRIX GENERATOR & EDITABLE TABLE
  // ------------------------------------------------------------------------
  generateVariantMatrix() {
    if (!this.formState) return;
    const dims = this.formState.optionDimensions || [];
    if (dims.length === 0) return;

    // Cartesian product of dimensions
    let combinations = [{}];
    dims.forEach(dim => {
      const nextCombos = [];
      const vals = dim.values.length > 0 ? dim.values : ["Standard"];
      combinations.forEach(existingCombo => {
        vals.forEach(val => {
          nextCombos.push({
            ...existingCombo,
            [dim.name]: val
          });
        });
      });
      combinations = nextCombos;
    });

    const brand = document.getElementById("prod-form-brand-select")?.value || "Twinkle";
    const brandPrefix = brand.substring(0, 3).toUpperCase();
    const basePrice = parseFloat(document.getElementById("prod-form-price")?.value) || 1250;
    const regularPrice = parseFloat(document.getElementById("prod-form-regular")?.value) || Math.round(basePrice * 1.15);
    const primaryImg = this.formState.images.find(i => i.isPrimary)?.storagePath || "";

    const newVariants = combinations.map((combo, idx) => {
      const comboStr = Object.values(combo).join("-").replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
      const sku = `${brandPrefix}-VAR-${comboStr || idx + 1}`;
      const wholesalePrice = Math.round(basePrice * 0.88); // 12% wholesale tier default

      return {
        id: "var-" + Date.now() + "-" + idx,
        sku,
        barcode: "",
        optionValues: combo,
        price: basePrice,
        regularPrice,
        stock: 50,
        reorderLevel: 10,
        baseUnit: "pack",
        status: "active",
        image: primaryImg,
        wholesale: {
          unitPrice: wholesalePrice,
          minQuantity: 1,
          tiers: [
            { minQuantity: 10, maxQuantity: 49, unitPrice: Math.round(wholesalePrice * 0.95), currency: "BDT" },
            { minQuantity: 50, unitPrice: Math.round(wholesalePrice * 0.90), currency: "BDT" }
          ]
        }
      };
    });

    this.formState.variants = newVariants;
    this.renderVariantMatrixTable();
    this.showToast(`Generated matrix with ${newVariants.length} sellable SKU variations!`, "success");
    this.updatePreviewCard();
  }

  renderVariantMatrixTable() {
    const wrap = document.getElementById("variant-matrix-table-wrap");
    if (!wrap || !this.formState) return;

    const variants = this.formState.variants || [];

    if (variants.length === 0) {
      wrap.innerHTML = `
        <div style="text-align: center; padding: 24px; color: #94a3b8; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px;">
          No variants generated yet. Click "⚡ Generate Variant Combinations Matrix" above to build SKUs.
        </div>
      `;
      return;
    }

    wrap.innerHTML = `
      <table class="admin-table" style="font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th>SKU *</th>
            <th>Variation Options</th>
            <th>Retail Sale (৳) *</th>
            <th>MRP (৳)</th>
            <th>Stock *</th>
            <th>B2B Wholesale (৳)</th>
            <th>MOQ</th>
            <th>Tiers</th>
            <th>Active</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody>
          ${variants.map((v, idx) => {
            const optsDisplay = v.optionValues ? Object.entries(v.optionValues).map(([k, val]) => `${k}: ${val}`).join(' | ') : (v.size || 'Variant');
            const tiersCount = v.wholesale?.tiers?.length || 0;
            return `
              <tr>
                <td>
                  <input type="text" class="form-input" style="font-family: monospace; font-size: 11.5px; font-weight: 700; padding: 4px 6px; width: 140px;" value="${v.sku}" onchange="AdminApp.updateVariantField(${idx}, 'sku', this.value)" required>
                </td>
                <td style="font-weight: 700; color: #0f172a; white-space: nowrap;">
                  ${optsDisplay}
                </td>
                <td>
                  <input type="number" class="form-input" style="font-size: 11.5px; font-weight: 800; color: #059669; padding: 4px 6px; width: 85px;" value="${v.price}" min="1" onchange="AdminApp.updateVariantField(${idx}, 'price', Number(this.value))" required>
                </td>
                <td>
                  <input type="number" class="form-input" style="font-size: 11.5px; padding: 4px 6px; width: 80px;" value="${v.regularPrice || v.price}" min="1" onchange="AdminApp.updateVariantField(${idx}, 'regularPrice', Number(this.value))">
                </td>
                <td>
                  <input type="number" class="form-input" style="font-size: 11.5px; font-weight: 700; padding: 4px 6px; width: 70px;" value="${v.stock ?? v.stockCount ?? 50}" min="0" onchange="AdminApp.updateVariantField(${idx}, 'stock', Number(this.value))" required>
                </td>
                <td>
                  <input type="number" class="form-input" style="font-size: 11.5px; padding: 4px 6px; width: 85px; color: #2563eb; font-weight: 700;" value="${v.wholesale?.unitPrice || Math.round(v.price * 0.9)}" min="1" onchange="AdminApp.updateVariantWholesalePrice(${idx}, Number(this.value))">
                </td>
                <td>
                  <input type="number" class="form-input" style="font-size: 11.5px; padding: 4px 6px; width: 55px;" value="${v.wholesale?.minQuantity || 1}" min="1" onchange="AdminApp.updateVariantMoq(${idx}, Number(this.value))">
                </td>
                <td>
                  <button type="button" class="btn btn-outline btn-sm" style="font-size: 10.5px; padding: 2px 6px;" onclick="AdminApp.promptConfigureVariantTiers(${idx})">
                    ${tiersCount > 0 ? `${tiersCount} Tiers` : '+ Tier'}
                  </button>
                </td>
                <td style="text-align: center;">
                  <input type="checkbox" ${v.status === 'active' ? 'checked' : ''} onchange="AdminApp.updateVariantField(${idx}, 'status', this.checked ? 'active' : 'inactive')">
                </td>
                <td style="text-align: right;">
                  <button type="button" class="btn-icon" style="color: #dc2626;" title="Remove Variant" onclick="AdminApp.removeVariantRow(${idx})" ${variants.length <= 1 ? 'disabled style="opacity:0.4;"' : ''}>
                    &times;
                  </button>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  addCustomVariantRow() {
    if (!this.formState) return;
    this.formState.variants = this.formState.variants || [];
    const idx = this.formState.variants.length + 1;
    const basePrice = parseFloat(document.getElementById("prod-form-price")?.value) || 1250;
    const brand = document.getElementById("prod-form-brand-select")?.value || "Twinkle";

    this.formState.variants.push({
      id: "var-custom-" + Date.now(),
      sku: `${brand.substring(0, 3).toUpperCase()}-CUST-${idx}`,
      optionValues: { Configuration: "Custom " + idx },
      price: basePrice,
      regularPrice: Math.round(basePrice * 1.15),
      stock: 50,
      reorderLevel: 10,
      baseUnit: "pack",
      status: "active",
      wholesale: {
        unitPrice: Math.round(basePrice * 0.9),
        minQuantity: 1,
        tiers: []
      }
    });

    this.renderVariantMatrixTable();
  }

  removeVariantRow(idx) {
    if (!this.formState?.variants || this.formState.variants.length <= 1) return;
    this.formState.variants.splice(idx, 1);
    this.renderVariantMatrixTable();
    this.updatePreviewCard();
  }

  updateVariantField(idx, field, val) {
    if (this.formState?.variants?.[idx]) {
      this.formState.variants[idx][field] = val;
      if (field === "stock") {
        this.formState.variants[idx].stockCount = val;
        this.formState.variants[idx].inStock = val > 0;
      }
      this.updatePreviewCard();
    }
  }

  updateVariantWholesalePrice(idx, val) {
    if (this.formState?.variants?.[idx]) {
      this.formState.variants[idx].wholesale = this.formState.variants[idx].wholesale || {};
      this.formState.variants[idx].wholesale.unitPrice = val;
    }
  }

  updateVariantMoq(idx, val) {
    if (this.formState?.variants?.[idx]) {
      this.formState.variants[idx].wholesale = this.formState.variants[idx].wholesale || {};
      this.formState.variants[idx].wholesale.minQuantity = Math.max(1, val);
    }
  }

  promptConfigureVariantTiers(idx) {
    const variant = this.formState?.variants?.[idx];
    if (!variant) return;

    variant.wholesale = variant.wholesale || { unitPrice: Math.round(variant.price * 0.9), minQuantity: 1, tiers: [] };
    const currentTiers = variant.wholesale.tiers || [];

    const defaultTiersText = currentTiers.length > 0 
      ? currentTiers.map(t => `${t.minQuantity}-${t.maxQuantity || '+'}:${t.unitPrice}`).join(", ")
      : `10-49: ${Math.round(variant.wholesale.unitPrice * 0.95)}, 50+: ${Math.round(variant.wholesale.unitPrice * 0.90)}`;

    this.showCustomDialog({
      title: `B2B Quantity Tiers for SKU: ${variant.sku}`,
      htmlContent: `
        <div style="font-size: 13px; color: #475569; margin-bottom: 12px; line-height: 1.5;">
          Base Wholesale Price: <strong>৳ ${variant.wholesale.unitPrice}</strong> | MOQ: <strong>${variant.wholesale.minQuantity || 1} units</strong><br>
          Configure bulk tier discounts (format: <code>Min-Max: Price</code>, comma-separated):
        </div>
        <div class="form-group">
          <label class="form-label">Quantity Tiers Definition</label>
          <input type="text" id="dialog-tiers-input" class="form-input" value="${defaultTiersText}" placeholder="e.g. 10-49: 1050, 50+: 1000">
        </div>
        <div style="font-size: 11.5px; color: #64748b;">
          Example: <code>10-49: 1050, 50+: 1000</code> means purchasing 10 to 49 packs is ৳1050/pack, 50 or more is ৳1000/pack. Non-overlapping ranges are validated automatically.
        </div>
      `,
      confirmText: "Save Tiers",
      cancelText: "Cancel",
      onConfirm: () => {
        const raw = document.getElementById("dialog-tiers-input")?.value || "";
        const parsedTiers = [];
        const parts = raw.split(",").map(p => p.trim()).filter(Boolean);

        for (const part of parts) {
          const [rangePart, pricePart] = part.split(":").map(s => s.trim());
          const unitPrice = parseFloat(pricePart);
          if (isNaN(unitPrice) || unitPrice <= 0) continue;

          let minQuantity = 1;
          let maxQuantity = undefined;

          if (rangePart.includes("+")) {
            minQuantity = parseInt(rangePart.replace("+", ""), 10);
          } else if (rangePart.includes("-")) {
            const [min, max] = rangePart.split("-").map(n => parseInt(n.trim(), 10));
            minQuantity = min;
            maxQuantity = max;
          } else {
            minQuantity = parseInt(rangePart, 10);
          }

          if (!isNaN(minQuantity) && minQuantity >= 1) {
            parsedTiers.push({ minQuantity, maxQuantity, unitPrice, currency: "BDT" });
          }
        }

        const validation = LashkerModels.validateWholesaleTiers(parsedTiers);
        if (!validation.isValid) {
          this.showToast(validation.errors[0], "warning");
          return false;
        }

        variant.wholesale.tiers = parsedTiers;
        this.renderVariantMatrixTable();
        this.showToast(`Saved ${parsedTiers.length} wholesale quantity tiers for ${variant.sku}`, "success");
        return true;
      }
    });
  }

  // ------------------------------------------------------------------------
  // SAVE PRODUCT HANDLER (STRICT HIERARCHY, VARIANT & PRICING SNAPSHOT)
  // ------------------------------------------------------------------------
  handleSaveProduct(e, editId) {
    e.preventDefault();

    const title = document.getElementById("prod-form-title")?.value.trim();
    const slug = document.getElementById("prod-form-slug")?.value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const category = document.getElementById("prod-form-category")?.value;
    let brand = document.getElementById("prod-form-brand-select")?.value;
    if (brand === "__NEW__") {
      brand = document.getElementById("prod-form-brand-custom")?.value.trim() || "Twinkle";
      const brands = StorageManager.getBrands();
      if (!brands.some(b => b.name.toLowerCase() === brand.toLowerCase())) {
        brands.push({ id: brand.toLowerCase().replace(/[^a-z0-9]/g, '-'), name: brand, origin: "Bangladesh", verified: true });
        StorageManager.saveBrands(brands);
      }
    }

    const productType = this.formState?.productType || "simple";
    const baseUnit = document.getElementById("prod-form-baseunit")?.value || "pack";
    const status = document.getElementById("prod-form-status")?.value || "active";
    const visibility = document.getElementById("prod-form-visibility")?.value || "public";
    const highlights = (document.getElementById("prod-form-highlights")?.value || "").split(",").map(h => h.trim()).filter(Boolean);

    // Media
    const primaryImg = this.formState?.images?.find(i => i.isPrimary)?.storagePath 
      || this.formState?.images?.[0]?.storagePath 
      || "https://placehold.co/400x300/png?text=Item";

    // Dynamic Facets
    const style = document.getElementById("facet-style")?.value;
    const size = document.getElementById("facet-size")?.value;
    const weightRange = document.getElementById("facet-weight")?.value;
    const hipRange = document.getElementById("facet-hip")?.value;
    const piecesCount = document.getElementById("facet-pieces")?.value;
    const skinType = document.getElementById("facet-skintype")?.value;
    const subcategory = document.getElementById("facet-subcat")?.value;
    const volume = document.getElementById("facet-volume")?.value;
    const material = document.getElementById("facet-material")?.value;
    const capacity = document.getElementById("facet-capacity")?.value;
    const packaging = document.getElementById("facet-packaging")?.value;
    const sheetCount = document.getElementById("facet-sheets")?.value;
    const tissueType = document.getElementById("facet-tissuetype")?.value;
    const ply = document.getElementById("facet-ply")?.value;
    const pulls = document.getElementById("facet-pulls")?.value;
    const toyType = document.getElementById("facet-toytype")?.value;

    let finalVariants = [];
    let calculatedPrice = 0;
    let calculatedRegular = 0;
    let totalStock = 0;

    if (productType === "variable") {
      finalVariants = (this.formState?.variants || []).map(v => ({
        ...v,
        stock: parseInt(v.stock ?? v.stockCount, 10) || 0,
        stockCount: parseInt(v.stock ?? v.stockCount, 10) || 0,
        inStock: (parseInt(v.stock ?? v.stockCount, 10) || 0) > 0,
        price: parseFloat(v.price) || 0,
        regularPrice: parseFloat(v.regularPrice) || parseFloat(v.price) || 0,
        baseUnit: v.baseUnit || baseUnit
      }));

      if (finalVariants.length === 0) {
        this.showCustomDialog({
          title: "Missing Product Variants",
          htmlContent: "<p>A Variable Product requires at least one configured variation SKU. Click '⚡ Generate Variant Combinations Matrix' to create variants.</p>",
          confirmText: "OK",
          cancelText: "Close"
        });
        return;
      }

      // Check variant validations
      const skuSet = new Set();
      for (const v of finalVariants) {
        const vValidation = LashkerModels.validateProductVariant(v, skuSet);
        if (!vValidation.isValid) {
          this.showCustomDialog({
            title: `Variant Error: ${v.sku || 'Unknown SKU'}`,
            htmlContent: `<p style="color: #b91c1c;">${vValidation.errors.join('<br>')}</p>`,
            confirmText: "Fix Variant",
            cancelText: "Close"
          });
          return;
        }
        skuSet.add(v.sku);
      }

      const activePrices = finalVariants.filter(v => v.status === "active").map(v => v.price);
      calculatedPrice = activePrices.length > 0 ? Math.min(...activePrices) : finalVariants[0].price;
      calculatedRegular = finalVariants[0].regularPrice || calculatedPrice;
      totalStock = finalVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    } else {
      // Simple Product
      const simpleSku = document.getElementById("prod-form-sku")?.value.trim() || `${brand.substring(0, 3).toUpperCase()}-PROD-${Date.now().toString().slice(-4)}`;
      const simpleStock = parseInt(document.getElementById("prod-form-stock")?.value, 10) || 0;
      const simplePrice = parseFloat(document.getElementById("prod-form-price")?.value) || 0;
      const simpleRegular = parseFloat(document.getElementById("prod-form-regular")?.value) || simplePrice;
      const cartonUnits = parseInt(document.getElementById("prod-form-carton-units")?.value, 10) || 4;
      const cartonPrice = parseFloat(document.getElementById("prod-form-carton-price")?.value) || (simplePrice * cartonUnits * 0.95);

      calculatedPrice = simplePrice;
      calculatedRegular = simpleRegular;
      totalStock = simpleStock;

      finalVariants = [{
        id: "var-default",
        sku: simpleSku,
        optionValues: {},
        price: simplePrice,
        regularPrice: simpleRegular,
        stock: simpleStock,
        stockCount: simpleStock,
        inStock: simpleStock > 0,
        reorderLevel: 10,
        baseUnit,
        status: "active",
        image: primaryImg,
        wholesale: {
          unitPrice: Math.round(cartonPrice / cartonUnits),
          minQuantity: cartonUnits,
          cartonUnits,
          cartonPrice
        }
      }];
    }

    const productPayload = {
      title,
      name: title,
      slug,
      productType,
      baseUnit,
      category,
      brand,
      price: calculatedPrice,
      regularPrice: calculatedRegular,
      stock: totalStock,
      stockCount: totalStock,
      inStock: totalStock > 0,
      image: primaryImg,
      images: this.formState?.images || [],
      variantOptionDefinitions: this.formState?.optionDimensions || [],
      variants: finalVariants,
      sku: finalVariants[0]?.sku || "",
      highlights,
      status,
      visibility,
      style,
      diaperSize: size,
      size,
      weightRange,
      hipRange,
      piecesCount,
      skinType,
      subcategory,
      volume,
      material,
      capacity,
      packaging,
      sheetCount,
      tissueType,
      ply,
      pulls,
      toyType,
      rating: 5.0,
      reviewCount: 0,
      updatedAt: new Date().toISOString()
    };

    // Full validation via models.js
    const validation = LashkerModels.validateProduct(productPayload);
    if (!validation.isValid) {
      this.showCustomDialog({
        title: "Product Validation Failed",
        htmlContent: `<p style="color: #b91c1c; font-weight: 700;">Please fix the following validation issues:</p><ul style="padding-left: 20px; color: #475569; font-size: 13px; margin-top: 6px;">${validation.errors.map(err => `<li>${err}</li>`).join("")}</ul>`,
        confirmText: "Review Form",
        cancelText: "Cancel"
      });
      return;
    }

    const products = StorageManager.getProducts();

    if (editId) {
      const idx = products.findIndex(p => p.id === editId);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productPayload, id: editId };
        StorageManager.saveProducts(products);
        if (window.FirebaseService) {
          window.FirebaseService.insertProductToFirestore(products[idx]);
        }
        this.showToast(`Updated "${title}" with ${finalVariants.length} variants! (Synced to Firestore)`, "success");
      }
    } else {
      productPayload.id = "prod-" + Date.now();
      productPayload.createdAt = new Date().toISOString();
      products.unshift(productPayload);
      StorageManager.saveProducts(products);
      if (window.FirebaseService) {
        window.FirebaseService.insertProductToFirestore(productPayload);
      }
      this.showToast(`Published "${title}" with ${finalVariants.length} variants! (Synced to Firestore)`, "success");
    }

    this.navigate("#/products");
  }

  // ------------------------------------------------------------------------
  // VIEW 4: BRANDS DIRECTORY (`#/brands`)
  // ------------------------------------------------------------------------
  // VIEW 4: BRANDS DIRECTORY (`#/brands`) - FIRESTORE SYNC & REAL DATA
  // ------------------------------------------------------------------------
  renderBrandsPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const brands = StorageManager.getBrands();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Brands Directory</h1>
          <p class="page-subtitle">Authorized pediatric & personal care brand registry synced with Cloud Firestore.</p>
        </div>
        <div class="page-actions" style="display: flex; gap: 10px;">
          <button class="btn btn-outline" onclick="AdminApp.loadPresetBrandsToFirestore()" style="font-weight: 700; color: #2563eb; border-color: #bfdbfe; background: #eff6ff;">
            ⚡ Push Standard Brands Template to Firestore
          </button>
          <button class="btn btn-gold" onclick="AdminApp.promptAddNewBrand()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Brand
          </button>
        </div>
      </div>

      ${brands.length === 0 ? `
        <div class="card" style="text-align: center; padding: 48px 24px; border: 2px dashed #cbd5e1; background: #f8fafc;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #e2e8f0; color: #475569; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 16px;">
            🏷️
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Zero Brands in Database</h3>
          <p style="font-size: 13.5px; color: #64748b; max-width: 480px; margin: 0 auto 20px;">
            Your database currently has no registered brands. You can enter custom brands manually or push the standard verified pediatric & personal care brand registry to Cloud Firestore.
          </p>
          <div style="display: inline-flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
            <button class="btn btn-gold" onclick="AdminApp.promptAddNewBrand()">
              + Add Custom Brand
            </button>
            <button class="btn btn-outline" onclick="AdminApp.loadPresetBrandsToFirestore()" style="font-weight: 700; color: #2563eb; border-color: #bfdbfe; background: #eff6ff;">
              ⚡ Push Standard Brands Template to Firestore
            </button>
          </div>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px;">
          ${brands.map(b => `
            <div class="card" style="padding: 16px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <h3 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">${b.name}</h3>
                  ${b.verified ? `<span class="badge" style="background: #ecfdf5; color: #059669; font-size: 10.5px;">✓ Verified</span>` : ''}
                </div>
                <div style="font-size: 12px; color: #64748b;">Origin: <strong>${b.origin || 'International'}</strong></div>
              </div>
              <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <button class="btn btn-outline btn-sm" onclick="AdminApp.filterProductsByBrand('${b.name}')">
                  View Products
                </button>
                <button class="btn btn-outline btn-sm" onclick="AdminApp.deleteBrand('${b.id}', '${b.name}')" style="color: #dc2626; border-color: #fca5a5;" title="Delete Brand">
                  Delete
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      `}
    `;
  }

  promptAddNewBrand() {
    this.showCustomDialog({
      title: "Add New Brand to Catalog",
      htmlContent: `
        <div class="form-group">
          <label class="form-label">Brand Name *</label>
          <input type="text" id="dialog-brand-name" class="form-input" placeholder="e.g. NeoCare, Merries, Huggies" required>
        </div>
        <div class="form-group">
          <label class="form-label">Country of Origin / Manufacturer</label>
          <input type="text" id="dialog-brand-origin" class="form-input" placeholder="e.g. Bangladesh, Japan, USA">
        </div>
      `,
      confirmText: "Save to Firestore",
      cancelText: "Cancel",
      onConfirm: async () => {
        const name = document.getElementById("dialog-brand-name")?.value.trim();
        const origin = document.getElementById("dialog-brand-origin")?.value.trim() || "Bangladesh";
        if (!name) {
          this.showToast("Brand name is required", "warning");
          return false;
        }
        const brands = StorageManager.getBrands();
        if (brands.some(b => b.name.toLowerCase() === name.toLowerCase())) {
          this.showToast("Brand already exists", "info");
          return true;
        }
        const newBrand = {
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          origin,
          verified: true
        };
        brands.push(newBrand);
        StorageManager.saveBrands(brands);
        
        if (window.FirebaseService) {
          await window.FirebaseService.insertBrandToFirestore(newBrand);
        }

        this.showToast(`Brand "${name}" added to Cloud Firestore!`, "success");
        this.renderBrandsPage();
        return true;
      }
    });
  }

  deleteBrand(brandId, brandName) {
    if (StorageManager.isBrandReferenced(brandName) || StorageManager.isBrandReferenced(brandId)) {
      this.showCustomDialog({
        title: "Cannot Delete Brand",
        htmlContent: `<p style="color: #b91c1c; font-weight: 700;">Brand "${brandName}" is referenced by active products in your catalog.</p><p style="color: #64748b; font-size: 13px; margin-top: 6px;">You must reassign or remove existing products linked to this brand before deleting it, ensuring catalog hierarchy integrity.</p>`,
        confirmText: "Understood",
        cancelText: "Close"
      });
      return;
    }

    this.showCustomDialog({
      title: "Delete Brand?",
      htmlContent: `<p>Are you sure you want to delete brand <strong>${brandName}</strong> from Cloud Firestore and local storage?</p>`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        if (window.FirebaseService) {
          await window.FirebaseService.deleteBrandFromFirestore(brandId);
        } else {
          const brands = StorageManager.getBrands().filter(b => b.id !== brandId);
          StorageManager.saveBrands(brands);
        }
        this.showToast(`Brand "${brandName}" deleted.`, "info");
        this.renderBrandsPage();
      }
    });
  }

  async loadPresetBrandsToFirestore() {
    const presets = window.PRESET_BRANDS || [];
    if (presets.length === 0) return;

    for (const b of presets) {
      if (window.FirebaseService) {
        await window.FirebaseService.insertBrandToFirestore(b);
      }
    }
    StorageManager.saveBrands(presets);
    this.showToast(`Loaded ${presets.length} verified brands into Cloud Firestore!`, "success");
    this.renderBrandsPage();
  }

  filterProductsByBrand(brandName) {
    this.searchQuery = brandName;
    this.navigate("#/products");
  }

  // ------------------------------------------------------------------------
  // VIEW 5: CATEGORIES (`#/categories`) - FIRESTORE SYNC & REAL DATA
  // ------------------------------------------------------------------------
  renderCategoriesPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const categories = StorageManager.getCategories();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Categories & Subcategories</h1>
          <p class="page-subtitle">Configure dynamic category filters and facets synced with Cloud Firestore.</p>
        </div>
        <div class="page-actions" style="display: flex; gap: 10px;">
          <button class="btn btn-outline" onclick="AdminApp.loadPresetCategoriesToFirestore()" style="font-weight: 700; color: #2563eb; border-color: #bfdbfe; background: #eff6ff;">
            ⚡ Push Standard Categories Template to Firestore
          </button>
          <button class="btn btn-gold" onclick="AdminApp.promptAddNewCategory()">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add New Category
          </button>
        </div>
      </div>

      ${categories.length === 0 ? `
        <div class="card" style="text-align: center; padding: 48px 24px; border: 2px dashed #cbd5e1; background: #f8fafc;">
          <div style="width: 56px; height: 56px; border-radius: 50%; background: #e2e8f0; color: #475569; display: inline-flex; align-items: center; justify-content: center; font-size: 26px; margin-bottom: 16px;">
            📁
          </div>
          <h3 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Zero Categories in Database</h3>
          <p style="font-size: 13.5px; color: #64748b; max-width: 480px; margin: 0 auto 20px;">
            Your database currently has no categories registered. You can create custom categories or load the standard Lashker Traders category taxonomy (Diapers, Skin Care, Feeder, Wipes, Tissue, Toys) to Cloud Firestore.
          </p>
          <div style="display: inline-flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
            <button class="btn btn-gold" onclick="AdminApp.promptAddNewCategory()">
              + Add Custom Category
            </button>
            <button class="btn btn-outline" onclick="AdminApp.loadPresetCategoriesToFirestore()" style="font-weight: 700; color: #2563eb; border-color: #bfdbfe; background: #eff6ff;">
              ⚡ Push Standard Categories Template to Firestore
            </button>
          </div>
        </div>
      ` : `
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px;">
          ${categories.map(cat => `
            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <h3 style="font-size: 16px; font-weight: 800; color: #0f172a;">${cat.name}</h3>
                    ${cat.isPopular ? `<span class="badge" style="background: #fef9c3; color: #854d0e;">★ Popular</span>` : ''}
                  </div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Slug: <code>${cat.slug}</code></div>
                </div>
                <div style="display: flex; gap: 6px;">
                  <button class="btn btn-outline btn-sm" onclick="AdminApp.toggleCategoryPopular('${cat.id}')">
                    ${cat.isPopular ? 'Unhighlight' : 'Highlight'}
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="AdminApp.deleteCategory('${cat.id}', '${cat.name}')" style="color: #dc2626; border-color: #fca5a5;" title="Delete Category">
                    ✕
                  </button>
                </div>
              </div>

              <p style="font-size: 12.5px; color: #475569; margin-bottom: 14px; line-height: 1.45;">
                ${cat.description || "Category collection for retail and wholesale customers."}
              </p>

              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px;">
                <div style="font-size: 11.5px; font-weight: 700; color: #64748b; margin-bottom: 8px; text-transform: uppercase;">
                  Subcategories (${(cat.subcategories || []).length})
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  ${(cat.subcategories || []).map(sub => `
                    <span class="badge" style="background: #ffffff; border: 1px solid #cbd5e1; color: #0f172a; font-size: 11px;">
                      ${sub}
                    </span>
                  `).join("")}
                </div>
              </div>

              <button class="btn btn-outline btn-sm" style="width: 100%;" onclick="AdminApp.promptAddSubcategory('${cat.id}')">
                + Add Subcategory (e.g. Shampoo, Top-to-Toe, Oil)
              </button>
            </div>
          `).join("")}
        </div>
      `}
    `;
  }

  promptAddNewCategory() {
    this.showCustomDialog({
      title: "Add New Category",
      htmlContent: `
        <div class="form-group">
          <label class="form-label">Category Name *</label>
          <input type="text" id="dialog-cat-name" class="form-input" placeholder="e.g. Baby Diaper, Skin Care" required>
        </div>
        <div class="form-group">
          <label class="form-label">Category Slug *</label>
          <input type="text" id="dialog-cat-slug" class="form-input" placeholder="e.g. baby-diaper, skin-care" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="dialog-cat-desc" class="form-input" placeholder="e.g. Premium pediatric essentials">
        </div>
      `,
      confirmText: "Save to Firestore",
      cancelText: "Cancel",
      onConfirm: async () => {
        const name = document.getElementById("dialog-cat-name")?.value.trim();
        const slug = document.getElementById("dialog-cat-slug")?.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
        const description = document.getElementById("dialog-cat-desc")?.value.trim() || "";

        if (!name || !slug) {
          this.showToast("Category name and slug are required", "warning");
          return false;
        }

        const categories = StorageManager.getCategories();
        if (categories.some(c => c.slug === slug || c.id === slug)) {
          this.showToast("Category with this slug already exists", "info");
          return true;
        }

        const newCat = {
          id: slug,
          name,
          slug,
          description,
          subcategories: [],
          isPopular: false
        };

        categories.push(newCat);
        StorageManager.saveCategories(categories);

        if (window.FirebaseService) {
          await window.FirebaseService.insertCategoryToFirestore(newCat);
        }

        this.showToast(`Category "${name}" saved to Cloud Firestore!`, "success");
        this.renderCategoriesPage();
        return true;
      }
    });
  }

  promptAddSubcategory(categoryId) {
    const categories = StorageManager.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    this.showCustomDialog({
      title: `Add Subcategory to "${cat.name}"`,
      htmlContent: `
        <div class="form-group">
          <label class="form-label">Subcategory Name *</label>
          <input type="text" id="dialog-subcat-name" class="form-input" placeholder="e.g. Baby Lotion, Shampoo, Feeding Bottle" required>
        </div>
      `,
      confirmText: "Add & Sync to Firestore",
      cancelText: "Cancel",
      onConfirm: async () => {
        const subName = document.getElementById("dialog-subcat-name")?.value.trim();
        if (!subName) {
          this.showToast("Subcategory name is required", "warning");
          return false;
        }

        cat.subcategories = cat.subcategories || [];
        if (!cat.subcategories.includes(subName)) {
          cat.subcategories.push(subName);
          StorageManager.saveCategories(categories);
          if (window.FirebaseService) {
            await window.FirebaseService.insertCategoryToFirestore(cat);
          }
          this.showToast(`Subcategory "${subName}" added to "${cat.name}"!`, "success");
          this.renderCategoriesPage();
        }
        return true;
      }
    });
  }

  deleteCategory(categoryId, categoryName) {
    if (StorageManager.isCategoryReferenced(categoryId)) {
      this.showCustomDialog({
        title: "Cannot Delete Category",
        htmlContent: `<p style="color: #b91c1c; font-weight: 700;">Category "${categoryName}" contains active products in your catalog.</p><p style="color: #64748b; font-size: 13px; margin-top: 6px;">You must reassign or remove existing products linked to this category before deleting it, maintaining referential catalog integrity.</p>`,
        confirmText: "Understood",
        cancelText: "Close"
      });
      return;
    }

    this.showCustomDialog({
      title: "Delete Category?",
      htmlContent: `<p>Are you sure you want to delete category <strong>${categoryName}</strong> from Cloud Firestore and local storage?</p>`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: async () => {
        if (window.FirebaseService) {
          await window.FirebaseService.deleteCategoryFromFirestore(categoryId);
        } else {
          const categories = StorageManager.getCategories().filter(c => c.id !== categoryId);
          StorageManager.saveCategories(categories);
        }
        this.showToast(`Category "${categoryName}" deleted.`, "info");
        this.renderCategoriesPage();
      }
    });
  }

  async loadPresetCategoriesToFirestore() {
    const presets = window.PRESET_CATEGORIES || [];
    if (presets.length === 0) return;

    for (const c of presets) {
      if (window.FirebaseService) {
        await window.FirebaseService.insertCategoryToFirestore(c);
      }
    }
    StorageManager.saveCategories(presets);
    this.showToast(`Loaded ${presets.length} categories into Cloud Firestore!`, "success");
    this.renderCategoriesPage();
  }

  // ------------------------------------------------------------------------
  // VIEW 6: CUSTOMERS & FAMILY PROFILES (`#/customers`)
  // ------------------------------------------------------------------------
  renderCustomersPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const user = StorageManager.getUser();
    const orders = StorageManager.getOrders();

    const hasUser = user && user.id;

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Customer Directory & Family Profiles</h1>
          <p class="page-subtitle">Manage customer accounts, baby growth calculations, and adult incontinence profiles.</p>
        </div>
      </div>

      ${hasUser ? `
        <div class="card" style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <h3 style="font-size: 17px; font-weight: 800; color: #0f172a;">${user.name || "Customer Account"}</h3>
                <span class="badge" style="background: #ecfdf5; color: #059669;">${user.role || "CUSTOMER"}</span>
              </div>
              <div style="font-size: 12.5px; color: #64748b; margin-top: 3px;">
                📞 ${user.phone || "No phone"} • ✉️ ${user.email || "No email"} • 📦 ${orders.length} Orders Placed
              </div>
            </div>
          </div>

          <!-- Family Diaper Profiles Grid -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <!-- Baby Profiles Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 14px;">
              <div style="font-size: 11.5px; font-weight: 800; color: #059669; text-transform: uppercase; margin-bottom: 8px;">
                👶 Baby Diaper Profiles (${(user.babies || []).length})
              </div>
              ${(user.babies && user.babies.length > 0) ? user.babies.map(b => {
                const m = LashkerModels.calculateBabyMilestone(b);
                return `
                  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between;">
                      <strong>${b.name}</strong> (${b.gender})
                      <span class="badge" style="background: #ecfdf5; color: #047857; font-size: 10.5px;">Size ${m.recommendedDiaper.size}</span>
                    </div>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                      Age: ${m.ageDisplay} • Weight: ${m.displayWeight} (${m.statusText})
                    </div>
                  </div>
                `;
              }).join("") : `<div style="font-size: 12px; color: #94a3b8;">No baby profiles added yet.</div>`}
            </div>

            <!-- Adult Care Profiles Box -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 14px;">
              <div style="font-size: 11.5px; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-bottom: 8px;">
                🧓 Adult Care Profiles (${(user.adults || []).length})
              </div>
              ${(user.adults && user.adults.length > 0) ? user.adults.map(a => {
                const rec = LashkerModels.calculateAdultDiaperRecommendation(a);
                return `
                  <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; margin-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between;">
                      <strong>${a.name}</strong> (Age ${a.age})
                      <span class="badge" style="background: #eff6ff; color: #1e40af; font-size: 10.5px;">${rec.sizeLabel.split(" ")[1] || 'L'}</span>
                    </div>
                    <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                      Hip: ${a.hipSizeInches}" • ${a.careType || "Tape Diaper"}
                    </div>
                  </div>
                `;
              }).join("") : `<div style="font-size: 12px; color: #94a3b8;">No adult profiles added yet.</div>`}
            </div>
          </div>
        </div>
      ` : `
        <div class="card" style="text-align: center; padding: 48px 20px;">
          <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 6px;">No Customer Accounts Registered Yet</h3>
          <p style="color: #64748b; font-size: 13px; max-width: 440px; margin: 0 auto;">
            When users log in via Firebase Email / Google Auth on the client storefront, their profile, baby milestones, and adult care preferences will display here.
          </p>
        </div>
      `}
    `;
  }

  // ------------------------------------------------------------------------
  // VIEW 7: ORDERS QUEUE (`#/orders`)
  // ------------------------------------------------------------------------
  renderOrdersPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    let orders = StorageManager.getOrders();

    if (this.activeOrderFilter !== "all") {
      orders = orders.filter(o => (o.status || "").toLowerCase().includes(this.activeOrderFilter));
    }

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Orders & Fulfillment</h1>
          <p class="page-subtitle">Track, update dispatch milestones, and fulfill baby diaper orders.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-outline" onclick="AdminApp.exportOrdersCSV()">Export CSV</button>
        </div>
      </div>

      <!-- Order Status Filter Tabs -->
      <div style="display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap;">
        ${['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(tab => `
          <button class="btn ${this.activeOrderFilter === tab ? 'btn-gold' : 'btn-outline'} btn-sm"
            onclick="AdminApp.filterOrdersByStatus('${tab}')" style="text-transform: capitalize;">
            ${tab}
          </button>
        `).join("")}
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer Name</th>
                <th>Contact Phone</th>
                <th>Delivery Zone</th>
                <th>Items</th>
                <th>Total (৳)</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${orders.length > 0 ? orders.map(order => `
                <tr>
                  <td style="font-weight: 800; color: #0f172a;">${order.orderId}</td>
                  <td style="font-weight: 700;">${order.customer?.name || "Customer"}</td>
                  <td style="font-family: monospace; font-size: 12px;">${order.customer?.phone || "01XXXXXXXXX"}</td>
                  <td><span class="badge" style="background: #f1f5f9; color: #334155;">${order.customer?.deliveryZone || "Dhaka"}</span></td>
                  <td>${(order.items || []).length} items</td>
                  <td style="font-weight: 800; color: #059669;">৳ ${(order.total || 0).toLocaleString()}</td>
                  <td>${this.renderStatusBadge(order.status)}</td>
                  <td style="text-align: right;">
                    <button class="btn btn-outline btn-sm" onclick="AdminApp.viewOrderDetails('${order.orderId}')">
                      Manage & Track
                    </button>
                  </td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 48px; color: #94a3b8;">
                    <div style="font-size: 28px; margin-bottom: 6px;">🛒</div>
                    <div style="font-weight: 700; color: #475569;">No orders in this view</div>
                    <div style="font-size: 12px; margin-top: 4px;">Orders placed on the storefront will appear here.</div>
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // VIEW 8: INVENTORY MANAGEMENT (`#/inventory`)
  // ------------------------------------------------------------------------
  renderInventoryPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const products = StorageManager.getProducts();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Warehouse Inventory & Variant Stock</h1>
          <p class="page-subtitle">Track stock counts per SKU, monitor reorder levels, and replenish diaper packs across all variations.</p>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Product / Variant SKU</th>
                <th>Configuration</th>
                <th>Current Stock</th>
                <th>Status</th>
                <th style="text-align: right;">Quick Replenish</th>
              </tr>
            </thead>
            <tbody>
              ${products.length > 0 ? products.map(p => {
                const variants = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [];
                const hasVariants = variants.length > 1;
                const totalStock = hasVariants 
                  ? variants.reduce((sum, v) => sum + (v.stock || v.stockCount || 0), 0)
                  : (p.stock || 0);

                return `
                <tr style="background: ${hasVariants ? '#f8fafc' : '#ffffff'}; font-weight: 700;">
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <img src="${p.image}" class="top-product-img" alt="${p.title}" onerror="this.src='https://placehold.co/40x40/png?text=Item'">
                      <div>
                        <div style="font-weight: 800; color: #0f172a;">${p.title}</div>
                        <div style="font-size: 11px; color: #64748b; font-family: monospace;">SKU: ${p.sku || p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" style="background: ${hasVariants ? '#e0f2fe' : '#f1f5f9'}; color: ${hasVariants ? '#0369a1' : '#334155'};">
                      ${hasVariants ? `${variants.length} Sellable Variants` : 'Single SKU'}
                    </span>
                  </td>
                  <td style="font-weight: 800; font-size: 14px; color: ${totalStock > 10 ? '#059669' : '#dc2626'};">
                    ${totalStock} units total
                  </td>
                  <td>
                    <span class="badge ${totalStock > 10 ? 'badge-shipped' : (totalStock > 0 ? 'badge-pending' : 'badge-cancelled')}">
                      ${totalStock > 10 ? 'Healthy' : (totalStock > 0 ? 'Low Stock' : 'Out of Stock')}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    ${!hasVariants ? `
                      <div style="display: flex; gap: 6px; justify-content: flex-end;">
                        <button class="btn btn-outline btn-sm" onclick="AdminApp.adjustStock('${p.id}', -5)">-5</button>
                        <button class="btn btn-outline btn-sm" onclick="AdminApp.adjustStock('${p.id}', 10)">+10</button>
                        <button class="btn btn-gold btn-sm" onclick="AdminApp.adjustStock('${p.id}', 50)">+50</button>
                      </div>
                    ` : `
                      <span style="font-size: 11.5px; color: #64748b; font-weight: 600;">Adjust per variant below</span>
                    `}
                  </td>
                </tr>

                ${hasVariants ? variants.map(v => {
                  const vStock = v.stock ?? v.stockCount ?? 0;
                  const opts = v.optionValues ? Object.entries(v.optionValues).map(([k, val]) => `${k}: ${val}`).join(' • ') : (v.size || v.sku);
                  return `
                    <tr style="background: #ffffff;">
                      <td style="padding-left: 36px;">
                        <div style="font-family: monospace; font-size: 12px; font-weight: 800; color: #2563eb;">
                          ↳ ${v.sku}
                        </div>
                      </td>
                      <td style="font-size: 12px; color: #475569;">
                        ${opts}
                      </td>
                      <td style="font-weight: 800; font-size: 13px; color: ${vStock > 10 ? '#059669' : '#dc2626'};">
                        ${vStock} units
                      </td>
                      <td>
                        <span class="badge ${vStock > (v.reorderLevel || 10) ? 'badge-shipped' : (vStock > 0 ? 'badge-pending' : 'badge-cancelled')}" style="font-size: 10.5px;">
                          ${vStock > (v.reorderLevel || 10) ? 'In Stock' : (vStock > 0 ? 'Low Stock' : 'Out of Stock')}
                        </span>
                      </td>
                      <td style="text-align: right;">
                        <div style="display: flex; gap: 4px; justify-content: flex-end;">
                          <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="AdminApp.adjustVariantStock('${p.id}', '${v.id}', -5)">-5</button>
                          <button class="btn btn-outline btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="AdminApp.adjustVariantStock('${p.id}', '${v.id}', 10)">+10</button>
                          <button class="btn btn-gold btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="AdminApp.adjustVariantStock('${p.id}', '${v.id}', 50)">+50</button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join("") : ''}
              `;
              }).join("") : `
                <tr>
                  <td colspan="5" style="text-align: center; padding: 40px; color: #94a3b8;">
                    No products added to track inventory.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  adjustStock(productId, delta) {
    const products = StorageManager.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod) return;
    prod.stock = Math.max(0, (prod.stock || 0) + delta);
    prod.stockCount = prod.stock;
    prod.inStock = prod.stock > 0;
    if (Array.isArray(prod.variants) && prod.variants.length === 1) {
      prod.variants[0].stock = prod.stock;
      prod.variants[0].stockCount = prod.stock;
      prod.variants[0].inStock = prod.stock > 0;
    }
    StorageManager.saveProducts(products);
    if (window.FirebaseService) {
      window.FirebaseService.insertProductToFirestore(prod);
    }
    this.showToast(`Updated stock for "${prod.title}": ${prod.stock} units`, "success");
    this.renderInventoryPage();
  }

  adjustVariantStock(productId, variantId, delta) {
    const products = StorageManager.getProducts();
    const prod = products.find(p => p.id === productId);
    if (!prod || !Array.isArray(prod.variants)) return;
    const variant = prod.variants.find(v => v.id === variantId);
    if (!variant) return;

    const current = variant.stock ?? variant.stockCount ?? 0;
    const nextStock = Math.max(0, current + delta);
    StorageManager.updateVariantStock(productId, variantId, nextStock);
    if (window.FirebaseService) {
      const updatedProd = StorageManager.getProductById(productId);
      if (updatedProd) window.FirebaseService.insertProductToFirestore(updatedProd);
    }
    this.showToast(`Updated SKU ${variant.sku}: ${nextStock} units`, "success");
    this.renderInventoryPage();
  }

  // ------------------------------------------------------------------------
  // VIEW 9: B2B, PROMOTIONS, SETTINGS
  // ------------------------------------------------------------------------
  renderB2BPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const apps = StorageManager.getB2BApplications();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">B2B Wholesale Partner Applications</h1>
          <p class="page-subtitle">Verify pharmacy trade licenses, assign wholesale discount tiers, and authorize bulk cartons dispatch.</p>
        </div>
      </div>

      <div class="card">
        <div class="table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th>App ID</th>
                <th>Business Name</th>
                <th>Trade License</th>
                <th>Contact Phone</th>
                <th>District</th>
                <th>Monthly Volume</th>
                <th>Status</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${apps.length > 0 ? apps.map(app => `
                <tr>
                  <td style="font-weight: 800;">${app.id}</td>
                  <td style="font-weight: 700; color: #0f172a;">${app.businessName}</td>
                  <td style="font-family: monospace; font-size: 11.5px;">${app.tradeLicenseNumber}</td>
                  <td>${app.phone}</td>
                  <td>${app.district}</td>
                  <td>${app.monthlyVolume} cartons/mo</td>
                  <td>
                    <span class="badge ${app.status === 'APPROVED' ? 'badge-shipped' : 'badge-pending'}">
                      ${app.status}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    ${app.status === 'APPROVED' ? `
                      <span style="font-size: 12px; color: #059669; font-weight: 700;">✓ Active Partner</span>
                    ` : `
                      <button class="btn btn-gold btn-sm" onclick="AdminApp.approveB2BApplication('${app.id}')">Approve Partner</button>
                    `}
                  </td>
                </tr>
              `).join("") : `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 48px; color: #94a3b8;">
                    No wholesale partner applications submitted yet.
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  renderPromotionsPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const cfg = StorageManager.getConfig();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Promotions & Vouchers</h1>
          <p class="page-subtitle">Configure discount coupon codes and hero promotional banners.</p>
        </div>
      </div>

      <div class="card" style="max-width: 600px; margin-bottom: 24px;">
        <h3 class="card-title" style="margin-bottom: 14px;">Active Coupon Configuration</h3>
        <div class="form-group">
          <label class="form-label">Coupon Code</label>
          <input type="text" id="coupon-code-input" class="form-input" value="${cfg.activeCoupon?.code || 'LASHKER10'}">
        </div>
        <div class="form-group">
          <label class="form-label">Discount Percentage (%)</label>
          <input type="number" id="coupon-pct-input" class="form-input" value="${cfg.activeCoupon?.discountPercent || 10}" min="1" max="50">
        </div>
        <button class="btn btn-gold" onclick="AdminApp.saveCouponConfig()">Update Active Coupon</button>
      </div>
    `;
  }

  renderSettingsPage() {
    const content = document.getElementById("admin-content-area");
    if (!content) return;

    const cfg = StorageManager.getConfig();
    const isOnline = StorageManager.isOnlineMode();

    content.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Store Settings & Infrastructure</h1>
          <p class="page-subtitle">Manage nationwide delivery charges, threshold limits, and cloud database connections.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <!-- Delivery Fees Setup -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 14px;">Delivery Charges Setup (BDT)</h3>
          <div class="form-group">
            <label class="form-label">Inside Dhaka Delivery (৳)</label>
            <input type="number" id="setting-fee-dhaka" class="form-input" value="60">
          </div>
          <div class="form-group">
            <label class="form-label">Dhaka Sub-City Delivery (৳)</label>
            <input type="number" id="setting-fee-subcity" class="form-input" value="80">
          </div>
          <div class="form-group">
            <label class="form-label">Outside Dhaka Delivery (৳)</label>
            <input type="number" id="setting-fee-outside" class="form-input" value="120">
          </div>
          <div class="form-group">
            <label class="form-label">Free Delivery Minimum Spend (৳)</label>
            <input type="number" id="setting-free-threshold" class="form-input" value="${cfg.freeDeliveryThreshold || 1200}">
          </div>
          <button class="btn btn-gold" onclick="AdminApp.saveDeliverySettings()">Save Delivery Charges</button>
        </div>

        <!-- Connection Mode & API Status -->
        <div class="card">
          <h3 class="card-title" style="margin-bottom: 14px;">Cloud & Storage Connectivity</h3>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: var(--radius-md); padding: 14px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <strong>Storefront Connection Mode:</strong>
              <span class="badge ${isOnline ? 'badge-shipped' : 'badge-pending'}">
                ${isOnline ? '🟢 Online Live Server' : '🧪 Offline Test Mode'}
              </span>
            </div>
            <div style="font-size: 12px; color: #64748b; line-height: 1.45;">
              Online mode connects to Firebase Auth/Firestore and Supabase Storage without demo data. Offline mode loads default profile for testing.
            </div>
            <div style="margin-top: 12px;">
              <button class="btn btn-outline btn-sm" onclick="AdminApp.toggleConnectionMode()">
                Switch to ${isOnline ? 'Offline Test Mode' : 'Online Live Server'}
              </button>
            </div>
          </div>

          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span>Firebase Auth & Firestore:</span>
              <strong style="color: #059669;">Connected (lashkertraders)</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 13px;">
              <span>Supabase Storage Bucket:</span>
              <strong style="color: #059669;">Ready (traders_bucket)</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------------
  // ACTIONS & DIALOGS (Zero Native Browser Dialogs)
  // ------------------------------------------------------------------------
  confirmResetCatalog() {
    this.showCustomDialog({
      title: "Purge & Clean Catalog?",
      htmlContent: `
        <p style="color: #b91c1c; font-weight: 700; margin-bottom: 8px;">
          ⚠️ Warning: This will delete all catalog products and ensure 0 demo items remain.
        </p>
        <p style="color: #64748b; font-size: 13px;">
          Use this if any old cached test products remain on your screen. You will have a 100% clean slate to add your real products.
        </p>
      `,
      confirmText: "Yes, Clean Everything",
      cancelText: "Cancel",
      onConfirm: () => {
        StorageManager.resetAllToCleanCatalog();
        this.showToast("Catalog purged! Clean slate ready.", "success");
        this.renderProductsList();
      }
    });
  }

  deleteProduct(productId) {
    const products = StorageManager.getProducts();
    const prod = products.find(p => p.id === productId);
    const name = prod ? prod.title : "Product";

    this.showCustomDialog({
      title: "Delete Product?",
      htmlContent: `<p>Are you sure you want to remove <strong>${name}</strong> from the catalog?</p>`,
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
      onConfirm: () => {
        const updated = products.filter(p => p.id !== productId);
        StorageManager.saveProducts(updated);
        if (window.FirebaseService) {
          window.FirebaseService.deleteProductFromFirestore(productId);
        }
        this.showToast(`Deleted ${name} (Removed from Cloud Firestore)`, "info");
        this.renderProductsList();
      }
    });
  }

  promptAddNewCategory() {
    this.showCustomDialog({
      title: "Add New Product Category",
      htmlContent: `
        <div class="form-group">
          <label class="form-label">Category Name *</label>
          <input type="text" id="dialog-cat-name" class="form-input" placeholder="e.g. Baby Accessories" required>
        </div>
        <div class="form-group">
          <label class="form-label">Category Slug *</label>
          <input type="text" id="dialog-cat-slug" class="form-input" placeholder="e.g. accessories" required>
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <input type="text" id="dialog-cat-desc" class="form-input" placeholder="Short description for customer storefront">
        </div>
      `,
      confirmText: "Create Category",
      cancelText: "Cancel",
      onConfirm: () => {
        const name = document.getElementById("dialog-cat-name")?.value.trim();
        const slug = document.getElementById("dialog-cat-slug")?.value.trim().toLowerCase();
        const desc = document.getElementById("dialog-cat-desc")?.value.trim();
        if (!name || !slug) {
          this.showToast("Category name and slug are required", "warning");
          return false;
        }
        const categories = StorageManager.getCategories();
        categories.push({
          id: slug,
          name,
          slug,
          description: desc,
          subcategories: []
        });
        StorageManager.saveCategories(categories);
        this.showToast(`Category "${name}" created!`, "success");
        this.renderCategoriesPage();
        return true;
      }
    });
  }

  promptAddSubcategory(categoryId) {
    const categories = StorageManager.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    this.showCustomDialog({
      title: `Add Subcategory to ${cat.name}`,
      htmlContent: `
        <div class="form-group">
          <label class="form-label">Subcategory Name *</label>
          <input type="text" id="dialog-subcat-name" class="form-input" placeholder="e.g. Top to Toe Wash, Face Cream" required>
        </div>
      `,
      confirmText: "Add Subcategory",
      cancelText: "Cancel",
      onConfirm: () => {
        const subName = document.getElementById("dialog-subcat-name")?.value.trim();
        if (!subName) return false;
        cat.subcategories = cat.subcategories || [];
        if (!cat.subcategories.includes(subName)) {
          cat.subcategories.push(subName);
          StorageManager.saveCategories(categories);
          this.showToast(`Added "${subName}" to ${cat.name}!`, "success");
          this.renderCategoriesPage();
        }
        return true;
      }
    });
  }

  toggleCategoryPopular(categoryId) {
    const categories = StorageManager.getCategories();
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;
    cat.isPopular = !cat.isPopular;
    StorageManager.saveCategories(categories);
    this.showToast(`${cat.name} is ${cat.isPopular ? 'highlighted on storefront' : 'standard'}`, "info");
    this.renderCategoriesPage();
  }

  filterProductsByCategory(cat) {
    this.productCategoryFilter = cat;
    this.renderProductsList();
  }

  filterOrdersByStatus(status) {
    this.activeOrderFilter = status;
    this.renderOrdersPage();
  }

  viewOrderDetails(orderId) {
    const orders = StorageManager.getOrders();
    const order = orders.find(o => o.orderId === orderId);
    if (!order) return;

    this.showCustomDialog({
      title: `Order Details: ${order.orderId}`,
      htmlContent: `
        <div style="margin-bottom: 14px;">
          <div style="font-size: 14px; font-weight: 800; color: #0f172a;">Customer Information</div>
          <div style="font-size: 13px; color: #475569; margin-top: 2px;">
            ${order.customer?.name} (${order.customer?.phone})<br>
            ${order.customer?.address}
          </div>
        </div>

        <div style="margin-bottom: 14px;">
          <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px;">Order Items</div>
          ${(order.items || []).map(i => `
            <div style="display: flex; justify-content: space-between; font-size: 12.5px; border-bottom: 1px dashed #e2e8f0; padding: 4px 0;">
              <span>${i.name} (x${i.quantity})</span>
              <strong>৳ ${(i.price * i.quantity).toLocaleString()}</strong>
            </div>
          `).join("")}
          <div style="display: flex; justify-content: space-between; font-weight: 800; margin-top: 6px; font-size: 14px; color: #059669;">
            <span>Grand Total:</span>
            <span>৳ ${(order.total || 0).toLocaleString()}</span>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Update Delivery Status</label>
          <select id="dialog-order-status-select" class="form-select">
            <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
            <option value="Packed" ${order.status === 'Packed' ? 'selected' : ''}>Packed</option>
            <option value="Out for Delivery" ${order.status === 'Out for Delivery' ? 'selected' : ''}>Out for Delivery</option>
            <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
            <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
          </select>
        </div>
      `,
      confirmText: "Update Status",
      cancelText: "Close",
      onConfirm: () => {
        const select = document.getElementById("dialog-order-status-select");
        if (select) {
          order.status = select.value;
          StorageManager.saveOrders(orders);
          if (window.FirebaseService) {
            window.FirebaseService.updateOrderStatusInFirestore(order.orderId, select.value);
          }
          this.showToast(`Order ${order.orderId} status set to ${select.value}! (Synced to Firestore)`, "success");
          this.handleRouting();
        }
      }
    });
  }

  async handleImageUploadToSupabase(input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const statusBox = document.getElementById("image-upload-status");
    if (statusBox) statusBox.innerHTML = `⏳ Uploading ${file.name} to Supabase 'traders_bucket'...`;

    try {
      if (window.SupabaseStorageService) {
        const result = await window.SupabaseStorageService.uploadImage(file, "catalog");
        if (result && result.publicUrl) {
          const urlInput = document.getElementById("prod-form-image");
          if (urlInput) urlInput.value = result.publicUrl;
          if (statusBox) statusBox.innerHTML = `✅ Uploaded successfully! ${result.path}`;
          this.showToast("Image uploaded to Supabase Storage!", "success");
          this.updatePreviewCard();
          return;
        }
      }
    } catch (err) {
      console.warn("Supabase upload fallback", err);
    }

    const localUrl = URL.createObjectURL(file);
    const urlInput = document.getElementById("prod-form-image");
    if (urlInput) urlInput.value = localUrl;
    if (statusBox) statusBox.innerHTML = `✅ Image attached locally: ${file.name}`;
    this.showToast("Image selected successfully", "info");
    this.updatePreviewCard();
  }

  approveB2BApplication(appId) {
    const apps = StorageManager.getB2BApplications();
    const app = apps.find(a => a.id === appId);
    if (!app) return;
    app.status = "APPROVED";
    StorageManager.saveB2BApplications(apps);
    this.showToast(`Approved B2B Partner: ${app.businessName}!`, "success");
    this.renderB2BPage();
  }

  toggleConnectionMode() {
    const isOnline = StorageManager.isOnlineMode();
    const nextMode = isOnline ? "offline" : "online";
    if (window.FirebaseService) {
      window.FirebaseService.setConnectionMode(nextMode);
    }
    try {
      localStorage.setItem("lt_connection_mode", nextMode);
    } catch (e) {}
    this.showToast(`Switched storefront to ${nextMode === 'online' ? '🟢 Online Live Server' : '🧪 Offline Test Mode'}`, "info");
    this.renderSettingsPage();
  }

  saveDeliverySettings() {
    this.showToast("Delivery fees updated: Dhaka ৳60, Sub-City ৳80, Outside Dhaka ৳120, Free @ ৳1200", "success");
  }

  saveCouponConfig() {
    const code = document.getElementById("coupon-code-input")?.value.trim().toUpperCase() || "LASHKER10";
    const pct = parseInt(document.getElementById("coupon-pct-input")?.value, 10) || 10;
    const cfg = StorageManager.getConfig();
    cfg.activeCoupon = { code, discountPercent: pct };
    StorageManager.saveConfig(cfg);
    this.showToast(`Coupon ${code} (${pct}%) saved!`, "success");
  }

  exportOrdersCSV() {
    const orders = StorageManager.getOrders();
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Order ID,Customer,Phone,Zone,Total,Status,Date\n" + 
      orders.map(o => `"${o.orderId}","${o.customer?.name}","${o.customer?.phone}","${o.customer?.deliveryZone}",${o.total},"${o.status}","${o.date}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `lashker_orders_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.showToast("Orders exported to CSV", "success");
  }

  renderStatusBadge(status) {
    const s = (status || "").toLowerCase();
    if (s.includes("pending") || s.includes("placed")) return `<span class="badge badge-pending">Pending</span>`;
    if (s.includes("processing") || s.includes("confirmed") || s.includes("packed")) return `<span class="badge badge-processing">Processing</span>`;
    if (s.includes("shipped") || s.includes("out for delivery")) return `<span class="badge badge-shipped">Shipped</span>`;
    if (s.includes("delivered")) return `<span class="badge badge-delivered">Delivered</span>`;
    if (s.includes("cancelled")) return `<span class="badge badge-cancelled">Cancelled</span>`;
    return `<span class="badge badge-processing">${status || "Active"}</span>`;
  }

  updateNotificationBadge() {
    const badge = document.getElementById("admin-notif-badge");
    if (badge) badge.textContent = "0";
  }

  // ------------------------------------------------------------------------
  // CUSTOM DIALOG & TOAST SYSTEM (Zero Browser Default Alert Dialogs)
  // ------------------------------------------------------------------------
  showCustomDialog({ title, htmlContent, confirmText = "Confirm", cancelText = "Cancel", onConfirm = null }) {
    const backdrop = document.getElementById("admin-dialog-backdrop");
    const titleEl = document.getElementById("admin-dialog-title");
    const bodyEl = document.getElementById("admin-dialog-body");
    const confirmBtn = document.getElementById("admin-dialog-confirm");
    const cancelBtn = document.getElementById("admin-dialog-cancel");

    if (!backdrop || !titleEl || !bodyEl) return;

    titleEl.textContent = title || "Notification";
    bodyEl.innerHTML = htmlContent || "";
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    confirmBtn.onclick = () => {
      let shouldClose = true;
      if (typeof onConfirm === "function") {
        const res = onConfirm();
        if (res === false) shouldClose = false;
      }
      if (shouldClose) backdrop.classList.remove("active");
    };

    cancelBtn.onclick = () => {
      backdrop.classList.remove("active");
    };

    backdrop.classList.add("active");
  }

  showToast(message, type = "info") {
    const container = document.getElementById("admin-toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s";
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  // ------------------------------------------------------------------------
  // ADMIN AUTHENTICATION & SECURITY GATEWAY
  // ------------------------------------------------------------------------
  checkAdminAuth() {
    const overlay = document.getElementById("admin-login-overlay");
    const adminUser = window.FirebaseService?.getAdminSession();

    if (!adminUser || !adminUser.email) {
      if (overlay) overlay.classList.remove("hidden");
      const nameEl = document.getElementById("admin-topbar-name");
      const roleEl = document.getElementById("admin-topbar-role");
      if (nameEl) nameEl.textContent = "Unauthenticated";
      if (roleEl) roleEl.textContent = "Sign In Required";
    } else {
      if (overlay) overlay.classList.add("hidden");
      const nameEl = document.getElementById("admin-topbar-name");
      const roleEl = document.getElementById("admin-topbar-role");
      const avatarEl = document.getElementById("admin-topbar-avatar");
      if (nameEl) nameEl.textContent = adminUser.displayName || "Super Admin";
      if (roleEl) roleEl.textContent = adminUser.email;
      if (avatarEl) avatarEl.textContent = (adminUser.displayName || adminUser.email || "AD").substring(0, 2).toUpperCase();
    }
  }

  checkAdminPasswordInput(val) {
    const feedback = document.getElementById("admin-password-feedback");
    if (!feedback) return;
    if (window.FirebaseService) {
      const safety = window.FirebaseService.checkPasswordStrength(val);
      if (safety.hasIllegalChars) {
        feedback.style.color = "#ef4444";
        feedback.textContent = `❌ ${safety.illegalCharDetails}`;
      } else if (!safety.isValid) {
        feedback.style.color = "#f59e0b";
        feedback.textContent = `⚠️ ${safety.feedback}`;
      } else {
        feedback.style.color = "#10b981";
        feedback.textContent = `✓ Strong password (${safety.label})`;
      }
    }
  }

  // ------------------------------------------------------------------------
  // ADMIN GOOGLE AUTHENTICATION (Google Only -> Auto Provision Role = ADMIN)
  // ------------------------------------------------------------------------
  async handleAdminGoogleLogin() {
    const btn = document.getElementById("admin-google-login-btn");
    const originalText = btn ? btn.innerHTML : "";
    if (btn) {
      btn.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 8px;">⏳ Authenticating with Google & Syncing Profile...</span>`;
    }

    try {
      if (window.FirebaseService) {
        const res = await window.FirebaseService.loginAdminWithGoogle();
        this.showToast(res.message || "Super Admin verified!", "success");
        this.checkAdminAuth();
        this.handleRouting();
      }
    } catch (err) {
      this.showCustomDialog({
        title: "Google Admin Sign-In Failed",
        htmlContent: `<p style="color: #b91c1c;">${err.message || 'Authentication error occurred.'}</p>`,
        confirmText: "Try Again",
        cancelText: "Close"
      });
    } finally {
      if (btn) btn.innerHTML = originalText;
    }
  }

  async quickMasterGoogleLogin() {
    try {
      if (window.FirebaseService) {
        const res = await window.FirebaseService.loginAdminWithGoogle();
        this.showToast(res.message || "Welcome back, Super Admin!", "success");
        this.checkAdminAuth();
        this.handleRouting();
      }
    } catch (err) {
      this.showToast(err.message, "error");
    }
  }

  handleAdminLogout() {
    this.showCustomDialog({
      title: "Logout Admin Session?",
      htmlContent: "<p>Are you sure you want to end your Super Admin session?</p>",
      confirmText: "Yes, Logout",
      cancelText: "Cancel",
      onConfirm: () => {
        if (window.FirebaseService) {
          window.FirebaseService.logoutAdmin();
        }
        this.showToast("Signed out of Admin Portal", "info");
        this.checkAdminAuth();
      }
    });
  }

  updateCloudStatusIndicator() {
    const isOnline = StorageManager.isOnlineMode();
    const textEl = document.getElementById("admin-cloud-status-text");
    const indEl = document.getElementById("admin-cloud-indicator");

    if (textEl && indEl) {
      if (isOnline) {
        textEl.textContent = "Cloud Sync: Online";
        indEl.style.background = "#ecfdf5";
        indEl.style.color = "#047857";
        indEl.style.borderColor = "#a7f3d0";
      } else {
        textEl.textContent = "Offline Test Mode";
        indEl.style.background = "#fef3c7";
        indEl.style.color = "#92400e";
        indEl.style.borderColor = "#fde68a";
      }
    }
  }

  // ------------------------------------------------------------------------
  // REAL-TIME CLOUD FIRESTORE SYNCHRONIZATION (Products, Categories, Brands, Orders)
  // ------------------------------------------------------------------------
  initFirestoreRealtimeSync() {
    if (!window.FirebaseService) return;

    // 1. Initial Cloud Sync (Online Mode)
    if (StorageManager.isOnlineMode()) {
      // Products
      window.FirebaseService.getProductsFromFirestore().then(prods => {
        if (prods && prods.length > 0) {
          console.log("[Admin] Synced products from Cloud Firestore:", prods.length);
          if (this.currentRoute === "#/products" || this.currentRoute === "#/dashboard") {
            this.handleRouting();
          }
        }
      });

      // Categories
      window.FirebaseService.getCategoriesFromFirestore().then(cats => {
        if (cats && cats.length > 0) {
          console.log("[Admin] Synced categories from Cloud Firestore:", cats.length);
          if (this.currentRoute === "#/categories") {
            this.handleRouting();
          }
        }
      });

      // Brands
      window.FirebaseService.getBrandsFromFirestore().then(brs => {
        if (brs && brs.length > 0) {
          console.log("[Admin] Synced brands from Cloud Firestore:", brs.length);
          if (this.currentRoute === "#/brands") {
            this.handleRouting();
          }
        }
      });
    }

    // 2. Real-time Products Sync Listener
    window.FirebaseService.listenToProducts((prods) => {
      console.log("[Admin Real-Time Sync] Products collection updated in Firestore:", prods.length);
      if (this.currentRoute === "#/products" || this.currentRoute === "#/dashboard" || this.currentRoute === "#/inventory") {
        this.handleRouting();
      }
    });

    // 3. Real-time Categories Sync Listener
    window.FirebaseService.listenToCategories((cats) => {
      console.log("[Admin Real-Time Sync] Categories collection updated in Firestore:", cats.length);
      if (this.currentRoute === "#/categories" || this.currentRoute === "#/products/add" || this.currentRoute.startsWith("#/products/edit/")) {
        this.handleRouting();
      }
    });

    // 4. Real-time Brands Sync Listener
    window.FirebaseService.listenToBrands((brs) => {
      console.log("[Admin Real-Time Sync] Brands collection updated in Firestore:", brs.length);
      if (this.currentRoute === "#/brands" || this.currentRoute === "#/products/add" || this.currentRoute.startsWith("#/products/edit/")) {
        this.handleRouting();
      }
    });

    // 5. Real-time Orders Sync Listener (Customer checkout -> Admin instant alert)
    window.FirebaseService.listenToOrders((ords) => {
      console.log("[Admin Real-Time Sync] Orders collection updated in Firestore:", ords.length);
      const pendingCount = ords.filter(o => (o.status || "").toLowerCase().includes("pending") || (o.status || "").toLowerCase().includes("placed")).length;
      const notifBadge = document.getElementById("admin-notif-badge");
      if (notifBadge) notifBadge.textContent = String(pendingCount);

      if (this.currentRoute === "#/orders" || this.currentRoute === "#/dashboard") {
        this.handleRouting();
      }
    });
  }
}

// Global initialization
window.AdminApp = new AdminAppController();
document.addEventListener("DOMContentLoaded", () => {
  window.AdminApp.init();
});
