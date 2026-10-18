/**
 * Lashker Traders - Admin Visual Charts Engine (admin-charts.js)
 * Lightweight, zero-dependency SVG chart renderer for Sales Overview & Order Status
 */

class AdminCharts {
  /**
   * Renders the Sales Overview dual-line chart (Revenue & Orders)
   * @param {string} containerId - DOM container ID
   * @param {Array} data - [{ date: 'Apr 24', revenue: 28000, orders: 18 }, ...]
   */
  static renderSalesOverview(containerId, data = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const defaultData = [
      { date: "Apr 24", revenue: 28000, orders: 14 },
      { date: "Apr 25", revenue: 38500, orders: 22 },
      { date: "Apr 26", revenue: 35000, orders: 19 },
      { date: "Apr 27", revenue: 52000, orders: 28 },
      { date: "Apr 28", revenue: 58000, orders: 31 },
      { date: "Apr 29", revenue: 51500, orders: 26 },
      { date: "Apr 30", revenue: 76000, orders: 38 }
    ];

    const points = data && data.length ? data : defaultData;
    const width = 560;
    const height = 210;
    const padding = { top: 20, right: 25, bottom: 35, left: 65 };

    const maxRevenue = 100000;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const xStep = innerWidth / (points.length - 1);

    // Calculate line coordinates
    const revCoords = points.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + innerHeight - (p.revenue / maxRevenue) * innerHeight;
      return { x, y, val: p.revenue, date: p.date };
    });

    const pathD = revCoords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");

    const areaD = `${pathD} L ${revCoords[revCoords.length - 1].x} ${padding.top + innerHeight} L ${revCoords[0].x} ${padding.top + innerHeight} Z`;

    // Horizontal grid lines
    const yTicks = [0, 25000, 50000, 75000, 100000];
    const gridLines = yTicks.map(val => {
      const y = padding.top + innerHeight - (val / maxRevenue) * innerHeight;
      const label = val === 0 ? "৳ 0" : `৳ ${(val / 1000).toLocaleString()}k`;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#f1f5f9" stroke-width="1.2" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${y + 4}" font-size="10" font-weight="600" fill="#94a3b8" text-anchor="end">${label}</text>
      `;
    }).join("");

    // X axis labels
    const xLabels = revCoords.map(c => `
      <text x="${c.x}" y="${height - 10}" font-size="10.5" font-weight="600" fill="#64748b" text-anchor="middle">${c.date}</text>
    `).join("");

    // SVG Circles with tooltips
    const dots = revCoords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="4.5" fill="#2563eb" stroke="#ffffff" stroke-width="2.5" class="chart-dot" style="cursor: pointer;">
        <title>${c.date}: ৳ ${c.val.toLocaleString()}</title>
      </circle>
    `).join("");

    container.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
        <defs>
          <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#2563eb" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#2563eb" stop-opacity="0.0" />
          </linearGradient>
        </defs>
        ${gridLines}
        <path d="${areaD}" fill="url(#salesGrad)" />
        <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
        ${dots}
        ${xLabels}
      </svg>
    `;
  }

  /**
   * Renders the Order Status Donut/Ring breakdown
   * @param {string} containerId - DOM container ID
   * @param {Object} counts - { pending: 32, processing: 48, shipped: 54, delivered: 18, cancelled: 4 }
   */
  static renderOrderStatusDonut(containerId, counts = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = counts || {
      pending: 32,
      processing: 48,
      shipped: 54,
      delivered: 18,
      cancelled: 4
    };

    const total = Object.values(stats).reduce((a, b) => a + b, 0) || 156;

    const segments = [
      { key: "pending", label: "Pending", count: stats.pending, color: "#f5b014" },
      { key: "processing", label: "Processing", count: stats.processing, color: "#2563eb" },
      { key: "shipped", label: "Shipped", count: stats.shipped, color: "#10b981" },
      { key: "delivered", label: "Delivered", count: stats.delivered, color: "#9333ea" },
      { key: "cancelled", label: "Cancelled", count: stats.cancelled, color: "#ef4444" }
    ];

    const size = 180;
    const strokeWidth = 24;
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
          <title>${seg.label}: ${seg.count} (${((seg.count / total) * 100).toFixed(1)}%)</title>
        </circle>
      `;
    }).join("");

    const legendHtml = segments.map(seg => {
      const pct = ((seg.count / total) * 100).toFixed(1);
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; padding: 2px 0;">
          <div style="display: flex; align-items: center; gap: 7px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${seg.color};"></span>
            <span style="color: #64748b; font-weight: 600;">${seg.label}</span>
          </div>
          <div style="font-weight: 800; color: #0f172a;">${seg.count} <span style="font-weight: 500; color: #94a3b8; font-size: 10.5px;">(${pct}%)</span></div>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 20px; height: 100%;">
        <div style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
            <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#f1f5f9" stroke-width="${strokeWidth}" />
            ${circles}
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
            <div style="font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1;">${total}</div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 2px;">Total Orders</div>
          </div>
        </div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
          ${legendHtml}
        </div>
      </div>
    `;
  }
}

// Global exposure
window.AdminCharts = AdminCharts;
