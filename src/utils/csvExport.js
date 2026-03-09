export function exportToCSV(leads) {
  const headers = [
    'property_address', 'pavement_score', 'priority_level',
    'job_value_low', 'job_value_high', 'margin_low', 'margin_high',
    'lot_size_sqft', 'issues_detected', 'recommended_service',
    'service_sealcoating', 'service_striping',
    'condition_cracking', 'condition_fading', 'condition_potholes',
    'condition_striping_faded', 'condition_drainage', 'condition_notes',
    'owner_name', 'owner_company', 'owner_phone', 'owner_email', 'owner_mailing',
    'enrichment_status', 'scan_date', 'scan_notes'
  ]

  const rows = leads.map(l => {
    const issues = l.analysis?.issues || []
    const services = l.analysis?.recommendedServices || []
    return [
      l.address || '',
      l.analysis?.score || '',
      l.priority || '',
      l.pricing?.jobLow || '',
      l.pricing?.jobHigh || '',
      l.pricing?.marginLow || '',
      l.pricing?.marginHigh || '',
      l.analysis?.lotSqft || '',
      issues.join('; '),
      services.join(' + '),
      services.includes('sealcoating') ? 'Yes' : 'No',
      services.includes('striping') ? 'Yes' : 'No',
      issues.includes('cracking') ? 'Yes' : 'No',
      issues.includes('fading') ? 'Yes' : 'No',
      issues.includes('potholes') ? 'Yes' : 'No',
      issues.includes('striping_faded') ? 'Yes' : 'No',
      issues.includes('drainage') ? 'Yes' : 'No',
      l.analysis?.notes || '',
      l.owner?.name || '',
      l.owner?.company || '',
      l.owner?.phone || '',
      l.owner?.email || '',
      l.owner?.mailing || '',
      l.status || 'New',
      l.scannedAt ? new Date(l.scannedAt).toLocaleDateString() : '',
      l.notes || ''
    ].map(v => `"${String(v).replace(/"/g, '""')}"`)
  })

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `pavescan_leads_${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
