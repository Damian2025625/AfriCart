// lib/vendor/generateAnalyticsPDF.js
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// ─────────────────────────────────────────────────────────────────────────────
// Brand Palette
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  darkBg:     rgb(0.09, 0.11, 0.13),
  white:      rgb(1, 1, 1),
  lightGray:  rgb(0.96, 0.96, 0.96),
  midGray:    rgb(0.78, 0.78, 0.78),
  darkGray:   rgb(0.2,  0.2,  0.2),
  orange:     rgb(1,    0.49, 0.0),
  green:      rgb(0.06, 0.72, 0.51),
  purple:     rgb(0.56, 0.27, 0.68),
  blue:       rgb(0.2,  0.4,  0.8),
  yellow:     rgb(0.95, 0.77, 0.06),
  red:        rgb(0.87, 0.27, 0.27),
  teal:       rgb(0.0,  0.6,  0.7),
};

const PERIOD_META = {
  daily:     { label: "Daily Report",     sub: "Last 24 Hours",    accent: C.orange  },
  weekly:    { label: "Weekly Report",    sub: "Last 7 Days",      accent: C.green   },
  monthly:   { label: "Monthly Report",   sub: "Last 30 Days",     accent: C.blue    },
  quarterly: { label: "Quarterly Report", sub: "Last 90 Days",     accent: C.purple  },
  yearly:    { label: "Yearly Report",    sub: "Last 365 Days",    accent: C.yellow  },
};

const ORDER = ["daily", "weekly", "monthly", "quarterly", "yearly"];

// ─────────────────────────────────────────────────────────────────────────────
// Entry – legacy single-period export (kept for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────────
export async function generateAnalyticsPDF({ vendor, analytics, timeRange }) {
  return generateFullAnalyticsPDF({
    vendor,
    allPeriods: { [timeRange]: analytics },
    singleMode: true,
    singleRange: timeRange,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry – full multi-period export
// ─────────────────────────────────────────────────────────────────────────────
export async function generateFullAnalyticsPDF({ vendor, allPeriods, singleMode = false, singleRange = null }) {
  const doc    = await PDFDocument.create();
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const reg    = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);

  const ctx = { doc, bold, reg, italic };

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const totalPages = singleMode ? 2 : 1 + ORDER.filter(r => allPeriods[r]).length * 2;

  let pageNum = 1;

  // ── COVER PAGE ──────────────────────────────────────────────────────────────
  const cover = addPage(doc);
  drawCover(cover, ctx, vendor, dateStr, singleMode, singleRange, allPeriods);
  drawFooter(cover, ctx, pageNum++, totalPages);

  // ── PER-PERIOD PAGES ────────────────────────────────────────────────────────
  const ranges = singleMode ? [singleRange] : ORDER;

  for (const range of ranges) {
    const analytics = allPeriods[range];
    if (!analytics) continue;
    const meta = PERIOD_META[range] || PERIOD_META.weekly;

    // Page A – Overview + Revenue Chart + Settlements
    const pgA = addPage(doc);
    drawPeriodHeader(pgA, ctx, meta, range, vendor);
    let y = pgA.getSize().height - 140;
    y = drawKPIRow(pgA, ctx, analytics, meta, y);
    y = drawSettlementSummary(pgA, ctx, analytics, meta, y);
    y = drawRevenueTable(pgA, ctx, analytics, meta, y);
    drawFooter(pgA, ctx, pageNum++, totalPages);

    // Page B – Products + Orders + Insights
    const pgB = addPage(doc);
    drawPeriodHeader(pgB, ctx, meta, range, vendor, "continued");
    y = pgB.getSize().height - 140;
    y = drawTopProducts(pgB, ctx, analytics, meta, y);
    y = drawOrderStatus(pgB, ctx, analytics, meta, y);
    y = drawInsights(pgB, ctx, analytics, meta, y);
    drawFooter(pgB, ctx, pageNum++, totalPages);
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function addPage(doc) {
  return doc.addPage([595, 842]); // A4
}

function W(page) { return page.getSize().width; }
function H(page) { return page.getSize().height; }

// ── COVER ────────────────────────────────────────────────────────────────────
function drawCover(page, { bold, reg }, vendor, dateStr, singleMode, singleRange, allPeriods) {
  const w = W(page), h = H(page);

  // Dark header block
  page.drawRectangle({ x: 0, y: h - 280, width: w, height: 280, color: C.darkBg });

  // Rainbow accent bar
  const bW = w / 5;
  [[C.orange],[C.yellow],[C.purple],[C.blue],[C.green]].forEach(([c], i) =>
    page.drawRectangle({ x: bW * i, y: h - 282, width: bW, height: 3, color: c })
  );

  // Brand mark
  page.drawRectangle({ x: 47, y: h - 90, width: 4, height: 42, color: C.orange });
  page.drawText("AFRICART", { x: 62, y: h - 65, size: 26, font: bold, color: C.white });
  page.drawText("VENDOR ANALYTICS REPORT", { x: 62, y: h - 84, size: 9, font: reg, color: C.midGray });

  // Report title
  const title = singleMode
    ? `${vendor.businessName} — ${PERIOD_META[singleRange]?.label || "Report"}`
    : `${vendor.businessName} — Comprehensive Report`;
  page.drawText(title, { x: 47, y: h - 140, size: 19, font: bold, color: C.white, maxWidth: w - 94 });
  page.drawText(`Generated: ${dateStr}`, { x: 47, y: h - 175, size: 11, font: reg, color: C.midGray });
  page.drawText(`Data Source: Paystack Live API`, { x: 47, y: h - 195, size: 11, font: reg, color: C.midGray });

  // Cover table of contents
  let y = h - 320;
  page.drawText("Report Contents", { x: 47, y, size: 14, font: bold, color: C.darkGray });
  page.drawRectangle({ x: 47, y: y - 6, width: 60, height: 2, color: C.orange });
  y -= 28;

  const ranges = singleMode ? [singleRange] : ORDER;
  ranges.forEach((r, i) => {
    const meta = PERIOD_META[r];
    const analytics = allPeriods[r];
    const revenue = analytics?.overview?.totalRevenue ?? 0;

    // Row background alternating
    if (i % 2 === 0) {
      page.drawRectangle({ x: 44, y: y - 8, width: w - 88, height: 26, color: C.lightGray });
    }

    // Accent dot
    page.drawRectangle({ x: 47, y: y + 4, width: 3, height: 14, color: meta.accent });

    page.drawText(meta.label, { x: 58, y: y + 6, size: 11, font: bold, color: C.darkGray });
    page.drawText(meta.sub, { x: 58, y: y - 6, size: 8,  font: reg,  color: C.midGray });
    page.drawText(`Revenue: ${formatCurrency(revenue)}`, {
      x: w - 180, y: y + 2, size: 10, font: bold, color: meta.accent
    });
    y -= 34;
  });

  // Bottom note
  page.drawText("All monetary values are in Nigerian Naira (NGN). Paystack fees and platform commissions are already deducted.", {
    x: 47, y: 60, size: 8, font: reg, color: C.midGray, maxWidth: w - 94
  });
  page.drawText("Vendor Net = Gross Amount - Paystack Fee (1.5%, capped NGN 2,000) - Platform Fee (3%)", {
    x: 47, y: 46, size: 8, font: reg, color: C.midGray, maxWidth: w - 94
  });
}

// ── PERIOD SECTION HEADER ────────────────────────────────────────────────────
function drawPeriodHeader(page, { bold, reg }, meta, range, vendor, suffix = "") {
  const w = W(page), h = H(page);

  // Accent strip
  page.drawRectangle({ x: 0, y: h - 100, width: w, height: 100, color: C.darkBg });
  page.drawRectangle({ x: 0, y: h - 102, width: w, height: 3, color: meta.accent });

  // Period name badge
  const badgeTxt = meta.label.toUpperCase() + (suffix ? ` (${suffix.toUpperCase()})` : "");
  page.drawRectangle({ x: 47, y: h - 52, width: badgeTxt.length * 6.8 + 16, height: 24, color: meta.accent });
  page.drawText(badgeTxt, { x: 55, y: h - 44, size: 10, font: bold, color: C.white });

  // Vendor name
  page.drawText(vendor.businessName, { x: 47, y: h - 78, size: 13, font: bold, color: C.white });
  page.drawText(meta.sub, { x: 47, y: h - 93, size: 9, font: reg, color: C.midGray });
}

// ── KPI ROW ──────────────────────────────────────────────────────────────────
function drawKPIRow(page, { bold, reg }, analytics, meta, y) {
  const w = W(page);
  const cards = [
    {
      label: "NET REVENUE",
      value: formatCurrency(analytics.overview?.totalRevenue),
      sub: `${analytics.overview?.revenueChange >= 0 ? "+" : ""}${(analytics.overview?.revenueChange || 0).toFixed(1)}% vs prev`,
      color: meta.accent,
    },
    {
      label: "TOTAL ORDERS",
      value: String(analytics.overview?.totalOrders ?? 0),
      sub: `${analytics.overview?.ordersChange >= 0 ? "+" : ""}${(analytics.overview?.ordersChange || 0).toFixed(1)}% vs prev`,
      color: C.blue,
    },
    {
      label: "PENDING PAYOUT",
      value: formatCurrency(analytics.settlements?.pendingBalance),
      sub: "Paystack wallet (T+1)",
      color: C.purple,
    },
    {
      label: "TOTAL SETTLED",
      value: formatCurrency(analytics.settlements?.totalSettled),
      sub: `${analytics.settlements?.settlementCount ?? 0} settlements`,
      color: C.green,
    },
  ];

  const cW = (w - 110) / 4;
  const cH = 90;
  const gap = 10;

  cards.forEach((c, i) => {
    const x = 47 + i * (cW + gap);
    // Card background
    page.drawRectangle({ x, y: y - cH, width: cW, height: cH, color: C.lightGray });
    // Left accent
    page.drawRectangle({ x, y: y - cH, width: 3, height: cH, color: c.color });
    // Label
    page.drawText(c.label, { x: x + 10, y: y - 18, size: 7, font: reg, color: C.midGray });
    // Value (truncate if too long)
    const valSize = c.value.length > 10 ? 14 : 18;
    page.drawText(c.value, { x: x + 10, y: y - 45, size: valSize, font: bold, color: C.darkGray, maxWidth: cW - 14 });
    // Sub label
    const isPositive = c.sub.startsWith("+");
    const isNegative = c.sub.startsWith("-");
    page.drawText(c.sub, {
      x: x + 10, y: y - cH + 10, size: 7.5, font: reg,
      color: isPositive ? C.green : isNegative ? C.red : C.midGray,
    });
  });

  return y - cH - 24;
}

// ── SETTLEMENT SUMMARY ───────────────────────────────────────────────────────
function drawSettlementSummary(page, { bold, reg }, analytics, meta, y) {
  const w = W(page);
  const s = analytics.settlements || {};

  page.drawText("Settlement Summary", { x: 47, y, size: 13, font: bold, color: C.darkGray });
  page.drawRectangle({ x: 47, y: y - 5, width: 50, height: 2, color: meta.accent });
  y -= 24;

  const rowH = 20;
  const colA = 47, colB = 220, colC = 370, colD = 480;
  const headers = ["METRIC", "AMOUNT (NGN)", "STATUS", "NOTE"];

  // Header
  page.drawRectangle({ x: 44, y: y - 2, width: w - 88, height: rowH + 4, color: C.darkBg });
  [headers[0], headers[1], headers[2], headers[3]].forEach((h, i) => {
    page.drawText(h, { x: [colA, colB, colC, colD][i] + 5, y: y + 4, size: 8, font: bold, color: C.white });
  });
  y -= rowH;

  const rows = [
    ["Total Earned (Net)", formatCurrency(s.ledgerBalance), "All-time", "After fees & platform cut"],
    ["Settled to Bank", formatCurrency(s.totalSettled), statusBadge(s.totalSettled), "Paystack /settlement records"],
    ["Pending (In Wallet)", formatCurrency(s.pendingBalance), "In Transit", `Next: ${s.nextSettlementDate || "—"}`],
    ["Platform Fee Rate", `${s.platformFee || 3}%`, "Per transaction", "Deducted by Paystack"],
    // FIX: Replaced ₦ (Unicode Naira sign, U+20A6) with "NGN" — WinAnsi fonts cannot encode it
    ["Paystack Fee Rate", "1.5% (max NGN 2,000)", "Per transaction", "Borne by subaccount"],
    ["Your Net %", `${s.splitPercentage || 97}%`, "Of each sale", "After all deductions"],
  ];

  rows.forEach((row, i) => {
    const bg = i % 2 === 0 ? C.lightGray : C.white;
    page.drawRectangle({ x: 44, y: y - 4, width: w - 88, height: rowH, color: bg });
    const cols = [colA, colB, colC, colD];
    row.forEach((val, j) => {
      const isAmount = j === 1;
      page.drawText(sanitizeText(String(val)), {
        x: cols[j] + 5, y: y + 2, size: 8.5,
        font: isAmount ? bold : reg,
        color: j === 2 ? meta.accent : C.darkGray,
        maxWidth: j < 3 ? 130 : 100,
      });
    });
    y -= rowH;
  });

  return y - 16;
}

// ── REVENUE DATA TABLE ───────────────────────────────────────────────────────
function drawRevenueTable(page, { bold, reg }, analytics, meta, y) {
  const w = W(page);
  const data = analytics.revenueData || [];
  if (!data.length) return y;

  page.drawText("Revenue Breakdown", { x: 47, y, size: 13, font: bold, color: C.darkGray });
  page.drawRectangle({ x: 47, y: y - 5, width: 60, height: 2, color: meta.accent });
  y -= 24;

  // Find max for bar chart
  const maxRev = Math.max(...data.map(d => d.revenue), 1);
  const colPeriod = 80, colOrders = 60, colRev = 100, barStart = 340;
  const barMaxW = w - 88 - barStart + 44;

  // Header
  page.drawRectangle({ x: 44, y: y - 2, width: w - 88, height: 20, color: C.darkBg });
  page.drawText("PERIOD", { x: 50, y: y + 3, size: 8, font: bold, color: C.white });
  page.drawText("ORDERS", { x: 50 + colPeriod, y: y + 3, size: 8, font: bold, color: C.white });
  page.drawText("NET REVENUE", { x: 50 + colPeriod + colOrders, y: y + 3, size: 8, font: bold, color: C.white });
  page.drawText("TREND", { x: 360, y: y + 3, size: 8, font: bold, color: C.white });
  y -= 20;

  const maxRows = Math.min(data.length, 14);
  data.slice(0, maxRows).forEach((d, i) => {
    const rowH = 18;
    const bg = i % 2 === 0 ? C.lightGray : C.white;
    page.drawRectangle({ x: 44, y: y - 2, width: w - 88, height: rowH, color: bg });

    page.drawText(sanitizeText(String(d.date)), { x: 50, y: y + 3, size: 8, font: reg, color: C.darkGray });
    page.drawText(sanitizeText(String(d.orders)), { x: 50 + colPeriod, y: y + 3, size: 8, font: reg, color: C.darkGray });
    page.drawText(formatCurrency(d.revenue), { x: 50 + colPeriod + colOrders, y: y + 3, size: 8, font: bold, color: meta.accent });

    // Mini bar
    const barW = Math.max((d.revenue / maxRev) * barMaxW, d.revenue > 0 ? 3 : 0);
    if (barW > 0) {
      page.drawRectangle({ x: 340, y: y + 2, width: barW, height: 10, color: meta.accent });
    }
    y -= rowH;
  });

  return y - 16;
}

// ── TOP PRODUCTS ─────────────────────────────────────────────────────────────
function drawTopProducts(page, { bold, reg }, analytics, meta, y) {
  const w = W(page);
  const products = analytics.topProducts || [];

  page.drawText("Top Performing Products", { x: 47, y, size: 13, font: bold, color: C.darkGray });
  page.drawRectangle({ x: 47, y: y - 5, width: 70, height: 2, color: meta.accent });
  y -= 24;

  if (!products.length) {
    page.drawText("No product sales in this period.", { x: 47, y, size: 10, font: reg, color: C.midGray });
    return y - 24;
  }

  // Header
  page.drawRectangle({ x: 44, y: y - 2, width: w - 88, height: 20, color: C.darkBg });
  page.drawText("#",       { x: 50,  y: y + 3, size: 8, font: bold, color: C.white });
  page.drawText("PRODUCT", { x: 80,  y: y + 3, size: 8, font: bold, color: C.white });
  page.drawText("UNITS",   { x: 340, y: y + 3, size: 8, font: bold, color: C.white });
  page.drawText("REVENUE", { x: 410, y: y + 3, size: 8, font: bold, color: C.white });
  y -= 20;

  products.slice(0, 6).forEach((p, i) => {
    const rowH = 22;
    const bg = i % 2 === 0 ? C.lightGray : C.white;
    page.drawRectangle({ x: 44, y: y - 2, width: w - 88, height: rowH, color: bg });

    // Rank badge
    const rankColor = [C.yellow, C.midGray, rgb(0.72,0.45,0.2)][i] || C.lightGray;
    page.drawRectangle({ x: 50, y: y + 2, width: 20, height: 14, color: rankColor });
    page.drawText(String(i + 1), { x: i < 9 ? 58 : 55, y: y + 5, size: 8, font: bold, color: C.white });

    page.drawText(truncate(p.name, 34), { x: 80, y: y + 5, size: 9, font: i === 0 ? bold : reg, color: C.darkGray });
    page.drawText(sanitizeText(String(p.sales)),     { x: 340, y: y + 5, size: 9, font: reg, color: C.darkGray });
    page.drawText(formatCurrency(p.revenue), { x: 410, y: y + 5, size: 9, font: bold, color: meta.accent });
    y -= rowH;
  });

  return y - 16;
}

// ── ORDER STATUS ─────────────────────────────────────────────────────────────
function drawOrderStatus(page, { bold, reg }, analytics, meta, y) {
  const statuses = analytics.orderStatus || [];
  if (!statuses.length) return y;

  page.drawText("Order Status Distribution", { x: 47, y, size: 13, font: bold, color: C.darkGray });
  page.drawRectangle({ x: 47, y: y - 5, width: 70, height: 2, color: meta.accent });
  y -= 28;

  const total = statuses.reduce((s, x) => s + x.value, 0) || 1;
  const barMaxW = 240;

  statuses.forEach((s) => {
    const pct = ((s.value / total) * 100).toFixed(0);
    const barW = (s.value / total) * barMaxW;
    const color = hexToRgb(s.color) || C.midGray;

    page.drawText(sanitizeText(s.name), { x: 47, y: y + 3, size: 9, font: reg, color: C.darkGray });
    page.drawRectangle({ x: 170, y, width: barMaxW, height: 14, color: C.lightGray });
    if (barW > 0) page.drawRectangle({ x: 170, y, width: barW, height: 14, color });
    page.drawText(sanitizeText(`${s.value} (${pct}%)`), { x: 420, y: y + 2, size: 9, font: bold, color: C.darkGray });
    y -= 22;
  });

  return y - 12;
}

// ── SMART INSIGHTS ───────────────────────────────────────────────────────────
function drawInsights(page, { bold, reg }, analytics, meta, y) {
  const insights = analytics.smartInsights || [];
  if (!insights.length) return y;

  page.drawText("Smart Insights", { x: 47, y, size: 13, font: bold, color: C.darkGray });
  page.drawRectangle({ x: 47, y: y - 5, width: 50, height: 2, color: meta.accent });
  y -= 28;

  insights.forEach((insight) => {
    // Background pill
    const w = W(page);
    page.drawRectangle({ x: 44, y: y - 4, width: w - 88, height: 22, color: rgb(0.98, 0.98, 0.98) });
    page.drawRectangle({ x: 44, y: y - 4, width: 3, height: 22, color: meta.accent });
    page.drawText("-", { x: 52, y: y + 3, size: 12, font: bold, color: meta.accent });
    page.drawText(truncate(insight, 90), { x: 62, y: y + 3, size: 9, font: reg, color: C.darkGray, maxWidth: w - 100 });
    y -= 28;
  });

  return y - 12;
}

// ── FOOTER ───────────────────────────────────────────────────────────────────
function drawFooter(page, { reg }, pageNum, totalPages) {
  const w = W(page);
  const h = H(page);
  page.drawRectangle({ x: 0, y: 0, width: w, height: 38, color: C.darkBg });
  page.drawRectangle({ x: 0, y: 37, width: w, height: 1, color: C.orange });
  page.drawText("Powered by Africart  |  Data Source: Paystack API", {
    x: 47, y: 13, size: 8, font: reg, color: C.midGray
  });
  page.drawText(`Page ${pageNum} of ${totalPages}`, {
    x: w - 80, y: 13, size: 8, font: reg, color: C.midGray
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function formatCurrency(amount) {
  return `NGN ${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)}`;
}

/**
 * Replaces characters outside the WinAnsi (Latin-1) range that pdf-lib's
 * standard fonts cannot encode. Catches ₦ (U+20A6) and any other Unicode
 * symbols that might appear in API-sourced strings.
 */
function sanitizeText(str) {
  if (!str) return "";
  return String(str)
    .replace(/₦/g, "NGN")        // Naira sign → NGN
    .replace(/[^\x00-\xFF]/g, "?"); // any other non-Latin-1 → ?
}

function truncate(str, len) {
  if (!str) return "";
  str = sanitizeText(String(str));
  return str.length > len ? str.substring(0, len - 2) + "..." : str;
}

function statusBadge(amount) {
  return amount > 0 ? "Received" : "None yet";
}

function hexToRgb(hex) {
  if (!hex) return null;
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? rgb(parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255)
    : null;
}