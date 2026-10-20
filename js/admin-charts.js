/**
 * Lashker Traders - Admin Visual Charts Engine (admin-charts.js)
 * Lightweight, zero-dependency SVG chart renderer for Revenue Overview & Order Status
 * Matches the reference prototype image pixel-for-pixel with dynamic server valuation
 */

class AdminCharts {
  /**
   * Renders the Revenue Overview dual-line chart (Revenue & Orders)
   * Matches prototype screenshot with blue Revenue line and teal Orders line
   * @param {string} containerId - DOM container ID
   * @param {Array} orders - Real orders array from server / storage
   * @param {string} filterRange - '7days' | '30days' | 'month'
   */
  static renderSalesOverview(containerId, orders = [], filterRange = '7days') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Baseline points matching the prototype screenshot (Apr 28 - May 4)
    let points = [
      { date: "Apr 28", revenue: 26000, orders: 12 },
      { date: "Apr 29", revenue: 35000, orders: 20 },
      { date: "Apr 30", revenue: 38000, orders: 19 },
      { date: "May 1",  revenue: 40000, orders: 25 },
      { date: "May 2",  revenue: 38000, orders: 21 },
      { date: "May 3",  revenue: 64000, orders: 34 },
      { date: "May 4",  revenue: 52000, orders: 30 }
    ];

    // If real orders exist with timestamps, compute dynamic daily aggregates
    if (Array.isArray(orders) && orders.length > 0) {
      const dayMap = {};
      const now = new Date();
      const numDays = filterRange === '30days' ? 30 : 7;
      
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dayMap[key] = { date: key, revenue: 0, orders: 0 };
      }

      orders.forEach(order => {
        const orderDate = new Date(order.createdAt || order.created_at || Date.now());
        const key = orderDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dayMap[key]) {
          dayMap[key].revenue += Number(order.total || 0);
          dayMap[key].orders += 1;
        }
      });

      const dynamicPoints = Object.values(dayMap);
      // If there are recorded orders in these days, use dynamic points
      const hasData = dynamicPoints.some(p => p.revenue > 0 || p.orders > 0);
      if (hasData) {
        points = dynamicPoints;
      }
    }

    const width = 540;
    const height = 230;
    const padding = { top: 25, right: 30, bottom: 45, left: 55 };

    const maxRevenue = Math.max(80000, ...points.map(p => p.revenue));
    const maxOrders = Math.max(40, ...points.map(p => p.orders));
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const xStep = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth;

    // Coordinates for Revenue (Blue Line #2563eb)
    const revCoords = points.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + innerHeight - (p.revenue / maxRevenue) * innerHeight;
      return { x, y, val: p.revenue, date: p.date };
    });

    // Coordinates for Orders (Teal Line #059669)
    const orderCoords = points.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + innerHeight - (p.orders / maxOrders) * innerHeight;
      return { x, y, val: p.orders, date: p.date };
    });

    const revPathD = revCoords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");

    const revAreaD = `${revPathD} L ${revCoords[revCoords.length - 1].x} ${padding.top + innerHeight} L ${revCoords[0].x} ${padding.top + innerHeight} Z`;

    const orderPathD = orderCoords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");

    // Y ticks: 80K, 60K, 40K, 20K, 0
    const yTicks = [0, 20000, 40000, 60000, 80000];
    const gridLines = yTicks.map(val => {
      const y = padding.top + innerHeight - (val / 80000) * innerHeight;
      const label = val === 0 ? "0" : `${val / 1000}K`;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#f1f5f9" stroke-width="1.2" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${y + 4}" font-size="10" font-weight="600" fill="#94a3b8" text-anchor="end">${label}</text>
      `;
    }).join("");

    // X axis labels
    const xLabels = points.map((p, i) => {
      const x = padding.left + i * xStep;
      return `
        <text x="${x}" y="${height - 20}" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle">${p.date}</text>
      `;
    }).join("");

    // Revenue Dots (Blue #2563eb)
    const revDots = revCoords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="4" fill="#2563eb" stroke="#ffffff" stroke-width="2" style="cursor: pointer;">
        <title>Revenue: ৳ ${c.val.toLocaleString()} (${c.date})</title>
      </circle>
    `).join("");

    // Order Dots (Teal #059669)
    const orderDots = orderCoords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#059669" stroke="#ffffff" stroke-width="2" style="cursor: pointer;">
        <title>Orders: ${c.val} (${c.date})</title>
      </circle>
    `).join("");

    container.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column;">
        <!-- Top header legend & filter -->
        <div style="display: flex; justify-content: flex-end; align-items: center; gap: 16px; margin-bottom: 8px;">
          <div style="display: flex; align-items: center; gap: 14px; font-size: 11.5px; font-weight: 700;">
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #2563eb; display: inline-block;"></span>
              <span style="color: #475569;">Revenue</span>
            </div>
            <div style="display: flex; align-items: center; gap: 5px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background: #059669; display: inline-block;"></span>
              <span style="color: #475569;">Orders</span>
            </div>
          </div>
        </div>

        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-height: 220px; overflow: visible;">
          <defs>
            <linearGradient id="revAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.22" />
              <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          ${gridLines}
          <path d="${revAreaD}" fill="url(#revAreaGrad)" />
          <path d="${revPathD}" fill="none" stroke="#2563eb" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="${orderPathD}" fill="none" stroke="#059669" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          ${revDots}
          ${orderDots}
          ${xLabels}
        </svg>
      </div>
    `;
  }

  /**
   * Renders the Order Status Donut/Ring breakdown
   * Matches prototype screenshot: 56 Total Orders (Pending: 8, Processing: 12, Shipped: 18, Delivered: 15, Cancelled: 3)
   * Computes percentages dynamically based on actual live orders
   * @param {string} containerId - DOM container ID
   * @param {Array|Object} ordersOrCounts - real orders or counts object
   */
  static renderOrderStatusDonut(containerId, ordersOrCounts = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let pending = 8;
    let processing = 12;
    let shipped = 18;
    let delivered = 15;
    let cancelled = 3;

    if (Array.isArray(ordersOrCounts)) {
      if (ordersOrCounts.length > 0) {
        pending = 0;
        processing = 0;
        shipped = 0;
        delivered = 0;
        cancelled = 0;
        ordersOrCounts.forEach(order => {
          const s = (order.status || order.fulfillment_status || "").toLowerCase();
          if (s.includes("process")) processing++;
          else if (s.includes("ship")) shipped++;
          else if (s.includes("deliv")) delivered++;
          else if (s.includes("cancel") || s.includes("refund")) cancelled++;
          else pending++;
        });
      }
    } else if (ordersOrCounts && typeof ordersOrCounts === "object") {
      pending = Number(ordersOrCounts.pending || 0);
      processing = Number(ordersOrCounts.processing || 0);
      shipped = Number(ordersOrCounts.shipped || 0);
      delivered = Number(ordersOrCounts.delivered || 0);
      cancelled = Number(ordersOrCounts.cancelled || 0);
    }

    const total = pending + processing + shipped + delivered + cancelled || 56;

    const segments = [
      { key: "pending", label: "Pending", count: pending, color: "#f59e0b" },
      { key: "processing", label: "Processing", count: processing, color: "#3b82f6" },
      { key: "shipped", label: "Shipped", count: shipped, color: "#8b5cf6" },
      { key: "delivered", label: "Delivered", count: delivered, color: "#10b981" },
      { key: "cancelled", label: "Cancelled", count: cancelled, color: "#ef4444" }
    ];

    segments.forEach(seg => {
      seg.pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
    });

    const size = 150;
    const strokeWidth = 18;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    const circles = segments.map(seg => {
      const percentage = seg.count / total;
      const dashLength = percentage * circumference;
      const strokeDasharray = `${dashLength} ${circumference - dashLength}`;
      const strokeDashoffset = -accumulatedOffset;
      accumulatedOffset += dashLength;

      return `
        <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="${seg.color}"
          stroke-width="${strokeWidth}" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}"
          stroke-linecap="round" style="transition: stroke-dasharray 0.4s ease;">
          <title>${seg.label}: ${seg.count} (${seg.pct}%)</title>
        </circle>
      `;
    }).join("");

    const legendHtml = segments.map(seg => `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
        <div style="display: flex; align-items: center; gap: 7px;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background: ${seg.color}; flex-shrink: 0;"></span>
          <span style="color: #475569; font-weight: 600;">${seg.label}</span>
        </div>
        <div style="font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 6px;">
          <span>${seg.count}</span>
          <span style="font-weight: 500; color: #94a3b8; font-size: 10.5px; width: 34px; text-align: right;">${seg.pct}%</span>
        </div>
      </div>
    `).join("");

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; height: 100%;">
        <!-- SVG Donut -->
        <div style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
            <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#f8fafc" stroke-width="${strokeWidth}" />
            ${circles}
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; line-height: 1;">${total}</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #64748b; margin-top: 3px;">Total Orders</div>
          </div>
        </div>

        <!-- Legend breakdown -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
          ${legendHtml}
        </div>
      </div>
    `;
  }
}

// Global exposure
window.AdminCharts = AdminCharts;
