const STORAGE_KEY = 'pavescan_leads'

export function getLeads() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch { return [] }
}

export function saveLead(lead) {
  const leads = getLeads()
  const idx = leads.findIndex(l => l.id === lead.id)
  if (idx >= 0) leads[idx] = lead
  else leads.unshift(lead)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
  return leads
}

export function saveLeads(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
}

export function deleteLead(id) {
  const leads = getLeads().filter(l => l.id !== id)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads))
  return leads
}

export function clearLeads() {
  localStorage.setItem(STORAGE_KEY, '[]')
}

export function generateId() {
  return `lead_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export function getPriority(score) {
  if (score >= 8) return 'A'
  if (score >= 5) return 'B'
  return 'C'
}

export function getPriorityLabel(priority) {
  return { A: 'Priority A', B: 'Priority B', C: 'Priority C' }[priority] || 'Unknown'
}
