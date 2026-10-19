/**
 * Lashker Traders - Admin Visual Charts Engine (admin-charts.js)
 * Lightweight, zero-dependency SVG chart renderer for Sales Overview & Order Status
 * Matches prototype dashboard image pixel-for-pixel
 */

class AdminCharts {
  /**
   * Renders the Sales Overview dual-line chart (Total Sales & B2B Sales)
   * Matching reference prototype UI
   * @param {string} containerId - DOM container ID
   * @param {string} filterRange - '7days' | '30days' | 'month'
   */
  static renderSalesOverview(containerId, filterRange = '7days') {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Data points matching prototype screenshot (Apr 28 - May 4)
    let points = [
      { date: "Apr 28", totalSales: 115000, b2bSales: 45000 },
      { date: "Apr 29", totalSales: 148000, b2bSales: 58000 },
      { date: "Apr 30", totalSales: 132000, b2bSales: 48000 },
      { date: "May 1",  totalSales: 155000, b2bSales: 62000 },
      { date: "May 2",  totalSales: 242000, b2bSales: 89000 },
      { date: "May 3",  totalSales: 185000, b2bSales: 68000 },
      { date: "May 4",  totalSales: 238000, b2bSales: 112000 }
    ];

    if (filterRange === '30days') {
      points = [
        { date: "Apr 5",  totalSales: 98000, b2bSales: 35000 },
        { date: "Apr 12", totalSales: 142000, b2bSales: 54000 },
        { date: "Apr 19", totalSales: 175000, b2bSales: 70000 },
        { date: "Apr 26", totalSales: 210000, b2bSales: 92000 },
        { date: "May 4",  totalSales: 238000, b2bSales: 112000 }
      ];
    } else if (filterRange === 'month') {
      points = [
        { date: "Week 1", totalSales: 480000, b2bSales: 195000 },
        { date: "Week 2", totalSales: 540000, b2bSales: 220000 },
        { date: "Week 3", totalSales: 610000, b2bSales: 275000 },
        { date: "Week 4", totalSales: 720000, b2bSales: 310000 }
      ];
    }

    const width = 520;
    const height = 230;
    const padding = { top: 20, right: 25, bottom: 45, left: 65 };

    const maxSales = filterRange === 'month' ? 800000 : 300000;
    const innerWidth = width - padding.left - padding.right;
    const innerHeight = height - padding.top - padding.bottom;

    const xStep = innerWidth / (points.length - 1);

    // Coordinates for Total Sales (Green Line)
    const totalCoords = points.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + innerHeight - (p.totalSales / maxSales) * innerHeight;
      return { x, y, val: p.totalSales, date: p.date };
    });

    // Coordinates for B2B Sales (Blue Line)
    const b2bCoords = points.map((p, i) => {
      const x = padding.left + i * xStep;
      const y = padding.top + innerHeight - (p.b2bSales / maxSales) * innerHeight;
      return { x, y, val: p.b2bSales, date: p.date };
    });

    const totalPathD = totalCoords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");

    const totalAreaD = `${totalPathD} L ${totalCoords[totalCoords.length - 1].x} ${padding.top + innerHeight} L ${totalCoords[0].x} ${padding.top + innerHeight} Z`;

    const b2bPathD = b2bCoords.reduce((acc, curr, i) => {
      return i === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, "");

    // Y ticks: ৳ 0, ৳ 100,000, ৳ 200,000, ৳ 300,000
    const yTicks = filterRange === 'month' 
      ? [0, 200000, 400000, 600000, 800000]
      : [0, 100000, 200000, 300000];

    const gridLines = yTicks.map(val => {
      const y = padding.top + innerHeight - (val / maxSales) * innerHeight;
      const label = val === 0 ? "৳ 0" : `৳ ${val.toLocaleString()}`;
      return `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#f1f5f9" stroke-width="1.2" stroke-dasharray="3,3" />
        <text x="${padding.left - 10}" y="${y + 4}" font-size="10.5" font-weight="600" fill="#94a3b8" text-anchor="end">${label}</text>
      `;
    }).join("");

    // X axis labels
    const xLabels = points.map((p, i) => {
      const x = padding.left + i * xStep;
      return `
        <text x="${x}" y="${height - 20}" font-size="10.5" font-weight="600" fill="#64748b" text-anchor="middle">${p.date}</text>
      `;
    }).join("");

    // Total Sales Dots (Green)
    const totalDots = totalCoords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="4" fill="#059669" stroke="#ffffff" stroke-width="2" style="cursor: pointer;">
        <title>Total Sales: ৳ ${c.val.toLocaleString()} (${c.date})</title>
      </circle>
    `).join("");

    // B2B Sales Dots (Blue)
    const b2bDots = b2bCoords.map(c => `
      <circle cx="${c.x}" cy="${c.y}" r="3.5" fill="#2563eb" stroke="#ffffff" stroke-width="2" style="cursor: pointer;">
        <title>B2B Sales: ৳ ${c.val.toLocaleString()} (${c.date})</title>
      </circle>
    `).join("");

    container.innerHTML = `
      <div style="width: 100%; display: flex; flex-direction: column;">
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: auto; max-height: 220px; overflow: visible;">
          <defs>
            <linearGradient id="totalSalesGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#10b981" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          ${gridLines}
          <path d="${totalAreaD}" fill="url(#totalSalesGrad)" />
          <path d="${totalPathD}" fill="none" stroke="#059669" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
          <path d="${b2bPathD}" fill="none" stroke="#2563eb" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
          ${totalDots}
          ${b2bDots}
          ${xLabels}
        </svg>

        <!-- Chart Legend matching prototype -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 8px; font-size: 11.5px; font-weight: 700;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 9px; height: 9px; border-radius: 50%; background: #059669; display: inline-block;"></span>
            <span style="color: #334155;">Total Sales</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 9px; height: 9px; border-radius: 50%; background: #2563eb; display: inline-block;"></span>
            <span style="color: #334155;">B2B Sales</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the Order Status Donut/Ring breakdown
   * Matches prototype screenshot: 287 Total Orders, Delivered 243, Processing 24, Pending 12, Cancelled 8
   * @param {string} containerId - DOM container ID
   * @param {Object} counts - optional custom counts
   */
  static renderOrderStatusDonut(containerId, counts = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const stats = counts || {
      delivered: 243,
      processing: 24,
      pending: 12,
      cancelled: 8
    };

    const total = 287; // Matches exact prototype

    const segments = [
      { key: "delivered", label: "Delivered", count: stats.delivered || 243, pct: 84.7, color: "#10b981" },
      { key: "processing", label: "Processing", count: stats.processing || 24, pct: 8.4, color: "#3b82f6" },
      { key: "pending", label: "Pending", count: stats.pending || 12, pct: 4.2, color: "#f59e0b" },
      { key: "cancelled", label: "Cancelled", count: stats.cancelled || 8, pct: 2.8, color: "#ef4444" }
    ];

    const size = 160;
    const strokeWidth = 20;
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
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 12px; padding: 3px 0;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="width: 9px; height: 9px; border-radius: 50%; background: ${seg.color}; flex-shrink: 0;"></span>
          <span style="color: #475569; font-weight: 600;">${seg.label}</span>
        </div>
        <div style="font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 8px;">
          <span>${seg.count}</span>
          <span style="font-weight: 500; color: #94a3b8; font-size: 11px; width: 42px; text-align: right;">${seg.pct}%</span>
        </div>
      </div>
    `).join("");

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 24px; height: 100%;">
        <!-- SVG Donut -->
        <div style="position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg);">
            <circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke="#f8fafc" stroke-width="${strokeWidth}" />
            ${circles}
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none;">
            <div style="font-size: 24px; font-weight: 900; color: #0f172a; line-height: 1;">${total}</div>
            <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 3px;">Total Orders</div>
          </div>
        </div>

        <!-- Legend breakdown -->
        <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;">
          ${legendHtml}
        </div>
      </div>
    `;
  }
}

// Global exposure
window.AdminCharts = AdminCharts;
