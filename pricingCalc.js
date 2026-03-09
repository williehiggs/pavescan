export function getSettings() {
  try {
    return JSON.parse(localStorage.getItem('pavescan_settings') || '{}')
  } catch { return {} }
}

export function calcPricing(lotSqft, services = [], settings = {}) {
  const {
    sealcoatRate = 0.18,
    stripingRate = 0.12,
    crackfillRate = 0.08,
    markupPct = 35,
    subCostPct = 55
  } = settings

  let baseCost = 0
  const breakdown = {}

  if (services.includes('sealcoating') || services.includes('both')) {
    const cost = lotSqft * sealcoatRate
    breakdown.sealcoating = { sqft: lotSqft, rate: sealcoatRate, cost }
    baseCost += cost
  }

  if (services.includes('striping') || services.includes('both')) {
    // Estimate linear feet as ~15% of sqft for typical parking lot
    const linearFt = Math.round(lotSqft * 0.15)
    const cost = linearFt * stripingRate
    breakdown.striping = { linearFt, rate: stripingRate, cost }
    baseCost += cost
  }

  if (services.includes('crackfill')) {
    const cost = lotSqft * crackfillRate
    breakdown.crackfill = { sqft: lotSqft, rate: crackfillRate, cost }
    baseCost += cost
  }

  const jobLow = Math.round(baseCost)
  const jobHigh = Math.round(baseCost * (1 + markupPct / 100))
  const subCost = Math.round(jobLow * (subCostPct / 100))
  const marginLow = jobLow - subCost
  const marginHigh = jobHigh - subCost
  const marginPct = jobHigh > 0 ? Math.round((marginHigh / jobHigh) * 100) : 0

  return { jobLow, jobHigh, subCost, marginLow, marginHigh, marginPct, breakdown }
}

export function formatCurrency(n) {
  if (!n && n !== 0) return '—'
  return '$' + n.toLocaleString()
}
