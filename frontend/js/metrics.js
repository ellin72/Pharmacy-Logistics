/**
 * metrics.js — Pharmacy Operating Metrics
 *
 * Computes operational health/readiness scores from inventory data.
 * All percentages are rounded to one decimal place and never produce NaN.
 *
 * METRIC DEFINITIONS
 * ------------------
 * stockAvailability  % = inStockCount / total * 100
 *   — medicines with quantity > 0 regardless of status
 *
 * goodStanding       % = goodStandingCount / total * 100
 *   — medicines that are in stock (qty > minThreshold) AND not expired
 *     AND not expiring within EXPIRY_WARNING_DAYS
 *
 * lowStock           % = lowStockCount / total * 100
 *   — medicines at or below minThreshold but NOT expired
 *
 * expired            % = expiredCount / total * 100
 *   — medicines whose expiryDate is in the past
 *
 * expiringSoon       % = expiringSoonCount / total * 100
 *   — medicines expiring within EXPIRY_WARNING_DAYS (and not yet expired)
 *
 * reorderReady       % = reorderReadyCount / total * 100
 *   — medicines with quantity >= minThreshold * REORDER_READY_MULTIPLIER
 *     (sufficiently stocked relative to threshold)
 *
 * OVERALL OPERATING SCORE
 * -----------------------
 * A weighted combination. Adjust METRIC_WEIGHTS below to tune.
 *   score = (goodStanding% × W_GOOD)
 *         + (stockAvailability% × W_AVAIL)
 *         - (expired% × W_EXPIRED)
 *         - (lowStock% × W_LOW)
 *         clamped to [0, 100]
 *
 * Weights are normalised so they always produce a 0-100 result.
 *
 * COLLECTION: operationalMetricsSnapshots
 * Written by scheduledMetricsSnapshot Cloud Function daily,
 * or by saveMetricsSnapshot() from the frontend when triggered.
 */

// ─── Configuration ──────────────────────────────────────────────────────────

/**
 * Days before expiry to count a medicine as "expiring soon".
 * Must match the value in inventory.js (EXPIRY_WARNING_DAYS).
 */
const METRICS_EXPIRY_DAYS = 90;

/**
 * A medicine is "reorder ready" (sufficiently stocked) when:
 *   quantity >= minThreshold * REORDER_READY_MULTIPLIER
 * Default: 1.5× means stock is 50 % above the minimum – healthy buffer.
 */
const REORDER_READY_MULTIPLIER = 1.5;

/**
 * Weights for the overall operating score (must be positive, will be normalised).
 * Positive weight → increases score when the metric is high.
 * Negative sign is applied in the formula itself (expired/low-stock reduce score).
 */
const METRIC_WEIGHTS = {
  W_GOOD: 0.45, // Good-standing medicines are the strongest signal
  W_AVAIL: 0.3, // Stock availability matters a lot
  W_EXPIRED: 0.15, // Expired stock is a strong negative signal
  W_LOW: 0.1, // Low-stock is a mild negative signal
};

// ─── Core Calculation ────────────────────────────────────────────────────────

/**
 * Compute all operational metrics from an array of medicine objects.
 *
 * @param {Array}  medicines  — full list (already filtered by caller if needed)
 * @param {object} opts       — { categoryFilter, statusFilter }
 * @returns {object}          — metrics object (all percentages 0-100, integers or 1dp)
 */
function computeMetrics(medicines, opts = {}) {
  // Apply optional filters
  let meds = medicines.filter((m) => !m.deleted); // exclude soft-deleted

  if (opts.categoryFilter && opts.categoryFilter !== "all") {
    meds = meds.filter(
      (m) => (m.category || "Uncategorised") === opts.categoryFilter,
    );
  }

  if (opts.statusFilter && opts.statusFilter !== "all") {
    meds = meds.filter((m) => m.status === opts.statusFilter);
  }

  const total = meds.length;

  if (total === 0) {
    // Return zero-state so UI never shows NaN
    return {
      total: 0,
      inStockCount: 0,
      goodStandingCount: 0,
      lowStockCount: 0,
      expiredCount: 0,
      expiringSoonCount: 0,
      reorderReadyCount: 0,
      stockAvailabilityPercent: 0,
      goodStandingPercent: 0,
      lowStockPercent: 0,
      expiredPercent: 0,
      expiringSoonPercent: 0,
      reorderReadyPercent: 0,
      overallOperatingScore: 0,
      computedAt: new Date(),
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let inStockCount = 0;
  let goodStandingCount = 0;
  let lowStockCount = 0;
  let expiredCount = 0;
  let expiringSoonCount = 0;
  let reorderReadyCount = 0;

  meds.forEach((med) => {
    const qty = med.quantity || 0;
    const min = med.minThreshold || 0;

    const expiryRaw = med.expiryDate;
    const expiry = expiryRaw ? new Date(expiryRaw) : null;
    if (expiry) expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = expiry
      ? Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
      : Infinity;

    const isExpired = expiry ? daysUntilExpiry < 0 : false;
    const isExpireSoon = !isExpired && daysUntilExpiry <= METRICS_EXPIRY_DAYS;
    const isLowStock = !isExpired && qty <= min;

    // In stock: has any quantity at all
    if (qty > 0) inStockCount++;

    // Good standing: quantity above threshold, not expired, not expiring soon
    if (!isExpired && !isExpireSoon && qty > min) goodStandingCount++;

    // Low stock (not expired)
    if (isLowStock) lowStockCount++;

    // Expired
    if (isExpired) expiredCount++;

    // Expiring soon
    if (isExpireSoon) expiringSoonCount++;

    // Reorder ready: sufficiently above minimum threshold
    if (!isExpired && qty >= min * REORDER_READY_MULTIPLIER)
      reorderReadyCount++;
  });

  // Convert to percentages, round to 1 dp
  const pct = (count) =>
    total > 0 ? Math.round((count / total) * 1000) / 10 : 0;

  const stockAvailabilityPercent = pct(inStockCount);
  const goodStandingPercent = pct(goodStandingCount);
  const lowStockPercent = pct(lowStockCount);
  const expiredPercent = pct(expiredCount);
  const expiringSoonPercent = pct(expiringSoonCount);
  const reorderReadyPercent = pct(reorderReadyCount);

  // Overall operating score
  // score = goodStanding×0.45 + stockAvail×0.30 - expired×0.15 - lowStock×0.10
  // Result is already 0-100 because each term is a 0-100 percentage multiplied by its weight.
  const raw =
    goodStandingPercent * METRIC_WEIGHTS.W_GOOD +
    stockAvailabilityPercent * METRIC_WEIGHTS.W_AVAIL -
    expiredPercent * METRIC_WEIGHTS.W_EXPIRED -
    lowStockPercent * METRIC_WEIGHTS.W_LOW;

  const overallOperatingScore = Math.min(
    100,
    Math.max(0, Math.round(raw * 10) / 10),
  );

  return {
    total,
    inStockCount,
    goodStandingCount,
    lowStockCount,
    expiredCount,
    expiringSoonCount,
    reorderReadyCount,
    stockAvailabilityPercent,
    goodStandingPercent,
    lowStockPercent,
    expiredPercent,
    expiringSoonPercent,
    reorderReadyPercent,
    overallOperatingScore,
    computedAt: new Date(),
  };
}

/**
 * Determine a colour class ('good', 'warning', 'danger') for a given percentage
 * and metric type.
 *
 * @param {string} metricKey  — e.g. 'goodStandingPercent'
 * @param {number} value      — the percentage value 0-100
 * @returns {string}          — 'good' | 'warning' | 'danger'
 */
function metricColour(metricKey, value) {
  // For negative metrics (high value is bad)
  if (
    ["expiredPercent", "lowStockPercent", "expiringSoonPercent"].includes(
      metricKey,
    )
  ) {
    if (value === 0) return "good";
    if (value <= 10) return "warning";
    return "danger";
  }
  // For positive metrics (high value is good)
  if (value >= 80) return "good";
  if (value >= 50) return "warning";
  return "danger";
}

/**
 * Determine score grade for display.
 * @param {number} score 0-100
 * @returns {{ grade: string, colour: string }}
 */
function scoreGrade(score) {
  if (score >= 85) return { grade: "Excellent", colour: "good" };
  if (score >= 70) return { grade: "Good", colour: "good" };
  if (score >= 50) return { grade: "Fair", colour: "warning" };
  if (score >= 30) return { grade: "At Risk", colour: "danger" };
  return { grade: "Critical", colour: "danger" };
}

// ─── Snapshot Persistence ────────────────────────────────────────────────────

/**
 * Save a metrics snapshot to Firestore for historical trending.
 * Keyed by YYYY-MM-DD so daily snapshots don't duplicate.
 *
 * @param {object} metrics  — result of computeMetrics()
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function saveMetricsSnapshot(metrics) {
  try {
    if (typeof db === "undefined")
      return { success: false, error: "Firestore not ready" };

    const dateKey = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const docRef = db.collection("operationalMetricsSnapshots").doc(dateKey);

    await docRef.set(
      {
        date: dateKey,
        totalMedicines: metrics.total,
        inStockCount: metrics.inStockCount,
        goodStandingCount: metrics.goodStandingCount,
        lowStockCount: metrics.lowStockCount,
        expiredCount: metrics.expiredCount,
        expiringSoonCount: metrics.expiringSoonCount,
        reorderReadyCount: metrics.reorderReadyCount,
        stockAvailabilityPercent: metrics.stockAvailabilityPercent,
        goodStandingPercent: metrics.goodStandingPercent,
        lowStockPercent: metrics.lowStockPercent,
        expiredPercent: metrics.expiredPercent,
        expiringSoonPercent: metrics.expiringSoonPercent,
        reorderReadyPercent: metrics.reorderReadyPercent,
        overallOperatingScore: metrics.overallOperatingScore,
        savedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    ); // merge so repeated calls on same day update rather than overwrite

    return { success: true, id: dateKey };
  } catch (error) {
    console.error("Error saving metrics snapshot:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Load the last N daily snapshots (for trend display).
 *
 * @param {number} days  — number of recent days to fetch (default 30)
 * @returns {Promise<Array>}
 */
async function loadMetricsHistory(days = 30) {
  try {
    if (typeof db === "undefined") return [];

    const snapshot = await db
      .collection("operationalMetricsSnapshots")
      .orderBy("date", "desc")
      .limit(days)
      .get();

    return snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .reverse();
  } catch (error) {
    console.error("Error loading metrics history:", error);
    return [];
  }
}

/**
 * Get all unique categories from a medicines array.
 * Returns ['all', 'Uncategorised', ...sorted categories]
 *
 * @param {Array} medicines
 * @returns {string[]}
 */
function getMedicineCategories(medicines) {
  const cats = new Set();
  medicines.forEach((m) => {
    if (!m.deleted) {
      cats.add(
        m.category && m.category.trim() ? m.category.trim() : "Uncategorised",
      );
    }
  });
  return ["all", ...Array.from(cats).sort()];
}

// ─── UI Renderer ─────────────────────────────────────────────────────────────

/**
 * Render the operating metrics section into the given container element.
 *
 * @param {HTMLElement} container  — target DOM element
 * @param {object}      metrics   — result of computeMetrics()
 * @param {object}      opts      — { showHistory: boolean, history: Array }
 */
function renderMetricsSection(container, metrics, opts = {}) {
  const { grade, colour } = scoreGrade(metrics.overallOperatingScore);

  const bar = (pct, type) => `
    <div class="progress-bar-wrap" title="${pct}%">
      <div class="progress-bar-fill fill-${type}" style="width:${Math.min(100, pct)}%"></div>
    </div>`;

  const kpi = (label, value, sub, colour, barType) => `
    <div class="metric-card metric-${colour}">
      <div class="metric-card-label">${label}</div>
      <div class="metric-card-value">${value}%</div>
      <div class="metric-card-sub">${sub}</div>
      ${bar(value, barType)}
    </div>`;

  // Trend sparkline (last 7 days)
  let trendHtml = "";
  if (opts.showHistory && opts.history && opts.history.length > 0) {
    const last7 = opts.history.slice(-7);
    const maxScore = 100;
    const pts = last7
      .map((h, i) => {
        const x = Math.round((i / Math.max(last7.length - 1, 1)) * 180) + 10;
        const y = Math.round(60 - (h.overallOperatingScore / maxScore) * 50);
        return `${x},${y}`;
      })
      .join(" ");

    trendHtml = `
      <div style="margin-top:1rem;">
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:0.5rem;">
          📈 7-Day Operating Score Trend
        </div>
        <svg viewBox="0 0 200 70" style="width:100%;height:60px;background:#f9fafb;border-radius:0.375rem;" role="img" aria-label="Score trend chart">
          <polyline points="${pts}" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linejoin="round"/>
          ${last7
            .map((h, i) => {
              const x =
                Math.round((i / Math.max(last7.length - 1, 1)) * 180) + 10;
              const y = Math.round(
                60 - (h.overallOperatingScore / maxScore) * 50,
              );
              return `<circle cx="${x}" cy="${y}" r="3" fill="var(--primary-color)">
              <title>${h.date}: ${h.overallOperatingScore}%</title>
            </circle>`;
            })
            .join("")}
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--text-secondary);margin-top:0.2rem;">
          <span>${last7[0]?.date || ""}</span>
          <span>${last7[last7.length - 1]?.date || ""}</span>
        </div>
      </div>`;
  }

  container.innerHTML = `
    <!-- Overall Score Card -->
    <div class="metric-card metric-score" style="margin-bottom:1rem;">
      <div class="metric-card-label">⚡ Overall Operating Score</div>
      <div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap;">
        <div>
          <div class="metric-card-value">${metrics.overallOperatingScore}%</div>
          <div class="metric-card-sub">
            <span class="badge badge-${colour === "good" ? "in-stock" : colour === "warning" ? "low-stock" : "expired"}">${grade}</span>
            &nbsp;${metrics.total} medicines tracked
          </div>
        </div>
        <div style="flex:1;min-width:200px;">
          ${bar(metrics.overallOperatingScore, colour === "good" ? "good" : colour === "warning" ? "warning" : "danger")}
          <div class="weights-legend" style="margin-top:0.5rem;">
            Formula: GoodStanding×0.45 + Availability×0.30 − Expired×0.15 − LowStock×0.10
          </div>
        </div>
      </div>
      ${trendHtml}
    </div>

    <!-- KPI Grid -->
    <div class="metrics-grid">
      ${kpi(
        "✅ Good Standing",
        metrics.goodStandingPercent,
        `${metrics.goodStandingCount} of ${metrics.total} medicines`,
        metricColour("goodStandingPercent", metrics.goodStandingPercent),
        metricColour("goodStandingPercent", metrics.goodStandingPercent) ===
          "good"
          ? "good"
          : metricColour("goodStandingPercent", metrics.goodStandingPercent) ===
              "warning"
            ? "warning"
            : "danger",
      )}
      ${kpi(
        "📦 Stock Availability",
        metrics.stockAvailabilityPercent,
        `${metrics.inStockCount} medicines have stock`,
        metricColour(
          "stockAvailabilityPercent",
          metrics.stockAvailabilityPercent,
        ),
        metricColour(
          "stockAvailabilityPercent",
          metrics.stockAvailabilityPercent,
        ) === "good"
          ? "good"
          : "warning",
      )}
      ${kpi(
        "🔄 Reorder Ready",
        metrics.reorderReadyPercent,
        `${metrics.reorderReadyCount} above 1.5× minimum`,
        metricColour("reorderReadyPercent", metrics.reorderReadyPercent),
        "info",
      )}
      ${kpi(
        "📉 Low Stock",
        metrics.lowStockPercent,
        `${metrics.lowStockCount} below minimum threshold`,
        metricColour("lowStockPercent", metrics.lowStockPercent),
        "warning",
      )}
      ${kpi(
        "⚠️ Expiring Soon",
        metrics.expiringSoonPercent,
        `${metrics.expiringSoonCount} within ${METRICS_EXPIRY_DAYS} days`,
        metricColour("expiringSoonPercent", metrics.expiringSoonPercent),
        "warning",
      )}
      ${kpi(
        "🚨 Expired",
        metrics.expiredPercent,
        `${metrics.expiredCount} expired medicines`,
        metricColour("expiredPercent", metrics.expiredPercent),
        "danger",
      )}
    </div>
  `;
}
