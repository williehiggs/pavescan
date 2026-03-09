import { useState, useRef } from 'react'
import { MapPin, Upload, Hash, ChevronRight, AlertTriangle, CheckCircle, Loader, X, Play, Pause } from 'lucide-react'
import { saveLead, generateId, getPriority } from '../utils/leadStorage.js'
import { calcPricing, getSettings } from '../utils/pricingCalc.js'

const MODE = { single: 'single', csv: 'csv', zip: 'zip' }

async function apiPost(path, body) {
  const r = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const data = await r.json()
  if (!r.ok) throw new Error(data.error || 'API error')
  return data
}

async function scanAddress(address) {
  const geo = await apiPost('/api/geocode', { address })
  const imgs = await apiPost('/api/streetview', { lat: geo.lat, lng: geo.lng })
  const analysis = await apiPost('/api/analyze', {
    imageUrls: imgs.imageUrls,
    satelliteUrl: imgs.satelliteUrl,
    address: geo.formatted
  })
  return { geo, imgs, analysis }
}

export default function ScanTab({ onLeadSaved }) {
  const [mode, setMode] = useState(MODE.single)
  const [input, setInput] = useState('')
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [batchQueue, setBatchQueue] = useState([])
  const [batchProgress, setBatchProgress] = useState(null)
  const [batchPaused, setBatchPaused] = useState(false)
  const [completedScans, setCompletedScans] = useState([])
  const pauseRef = useRef(false)
  const fileRef = useRef()

  async function handleSingleScan() {
    if (!input.trim()) return
    setScanning(true)
    setError(null)
    setResult(null)
    try {
      const { geo, analysis } = await scanAddress(input.trim())
      const settings = getSettings()
      const services = analysis.recommendedServices || []
      const pricing = calcPricing(analysis.lotSqft || 5000, services, settings)
      const priority = getPriority(analysis.score)

      const lead = {
        id: generateId(),
        address: geo.formatted,
        lat: geo.lat, lng: geo.lng,
        analysis, pricing, priority,
        status: 'New',
        scannedAt: Date.now()
      }

      // Auto-enrich Priority A
      if (priority === 'A') {
        try {
          const owner = await apiPost('/api/enrich-lead', { address: geo.formatted })
          lead.owner = owner
          lead.status = 'Enriched'
        } catch (e) {
          console.warn('Auto-enrich failed:', e.message)
        }
      }

      saveLead(lead)
      setResult(lead)
      onLeadSaved()
    } catch (e) {
      setError(e.message)
    } finally {
      setScanning(false)
    }
  }

  function handleCSV(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').map(l => l.trim()).filter(Boolean)
      // Try to extract addresses — skip header if present
      const addresses = lines
        .map(l => l.replace(/^["']|["']$/g, '').split(',')[0].trim())
        .filter(a => a.length > 5 && !a.toLowerCase().includes('address'))
      setBatchQueue(addresses)
      setCompletedScans([])
    }
    reader.readAsText(file)
  }

  async function runBatch(queue) {
    pauseRef.current = false
    setBatchPaused(false)
    const settings = getSettings()
    const results = []

    for (let i = 0; i < queue.length; i++) {
      if (pauseRef.current) {
        setBatchPaused(true)
        break
      }

      setBatchProgress({ current: i + 1, total: queue.length, address: queue[i] })

      try {
        const { geo, analysis } = await scanAddress(queue[i])
        const services = analysis.recommendedServices || []
        const pricing = calcPricing(analysis.lotSqft || 5000, services, settings)
        const priority = getPriority(analysis.score)

        const lead = {
          id: generateId(),
          address: geo.formatted,
          lat: geo.lat, lng: geo.lng,
          analysis, pricing, priority,
          status: 'New',
          scannedAt: Date.now()
        }

        if (priority === 'A') {
          try {
            const owner = await apiPost('/api/enrich-lead', { address: geo.formatted })
            lead.owner = owner
            lead.status = 'Enriched'
          } catch (e) {}
        }

        saveLead(lead)
        results.push(lead)
        setCompletedScans([...results])
        onLeadSaved()
      } catch (e) {
        results.push({ address: queue[i], error: e.message })
        setCompletedScans([...results])
      }

      // Rate limiting - 1 scan per 2 seconds to control API costs
      await new Promise(r => setTimeout(r, 2000))
    }

    setBatchProgress(null)
  }

  async function handleZipScan() {
    if (!input.trim()) return
    setScanning(true)
    setError(null)
    try {
      const data = await apiPost('/api/places', { zipCode: input.trim() })
      const addresses = data.places.map(p => p.address + ', Austin, TX')
      setBatchQueue(addresses)
      setCompletedScans([])
      setMode(MODE.csv) // Switch to batch view
    } catch (e) {
      setError(e.message)
    } finally {
      setScanning(false)
    }
  }

  const priorityCounts = completedScans.reduce((acc, s) => {
    if (s.priority) acc[s.priority] = (acc[s.priority] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Mode selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[
          { id: MODE.single, icon: MapPin, label: 'Single Address' },
          { id: MODE.csv, icon: Upload, label: 'CSV Upload' },
          { id: MODE.zip, icon: Hash, label: 'Zip Code Scan' },
        ].map(m => {
          const Icon = m.icon
          const active = mode === m.id
          return (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setResult(null); setError(null); setInput(''); setBatchQueue([]) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 18px',
                background: active ? 'var(--accent)' : 'var(--surface)',
                color: active ? 'white' : 'var(--text2)',
                border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 8, fontSize: 13, fontWeight: active ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s'
              }}
            >
              <Icon size={14} />
              {m.label}
            </button>
          )
        })}
      </div>

      {/* Single address */}
      {mode === MODE.single && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label">Property Address</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. 2121 W Parmer Ln, Austin, TX"
              onKeyDown={e => e.key === 'Enter' && handleSingleScan()}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleSingleScan}
              disabled={scanning || !input.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >
              {scanning ? <Loader size={14} className="animate-spin" /> : <Scan size={14} />}
              {scanning ? 'Scanning...' : 'Run Scan'}
            </button>
          </div>
          {scanning && (
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text2)', fontSize: 13 }}>
              <Loader size={14} className="animate-spin" style={{ color: 'var(--accent)' }} />
              Fetching imagery and running AI analysis...
            </div>
          )}
        </div>
      )}

      {/* CSV Upload */}
      {mode === MODE.csv && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label">Upload Address List</div>
          <div style={{
            border: '2px dashed var(--border2)', borderRadius: 8,
            padding: '32px', textAlign: 'center', cursor: 'pointer',
            background: 'var(--surface2)'
          }}
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={24} color="var(--text3)" style={{ margin: '0 auto 8px' }} />
            <div style={{ color: 'var(--text2)', fontSize: 13 }}>Click to upload CSV</div>
            <div style={{ color: 'var(--text3)', fontSize: 12, marginTop: 4 }}>First column = addresses. One per row.</div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleCSV} style={{ display: 'none' }} />
          </div>

          {batchQueue.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ color: 'var(--text2)', fontSize: 13 }}>{batchQueue.length} addresses loaded</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  {batchProgress && !batchPaused && (
                    <button className="btn-secondary" onClick={() => { pauseRef.current = true }}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {batchPaused && (
                    <button className="btn-secondary" onClick={() => runBatch(batchQueue.slice(completedScans.length))}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Play size={13} /> Resume
                    </button>
                  )}
                  {!batchProgress && (
                    <button className="btn-primary" onClick={() => runBatch(batchQueue)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Play size={13} /> Start Batch Scan
                    </button>
                  )}
                </div>
              </div>

              {batchProgress && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text2)' }}>
                    <span>{batchProgress.address}</span>
                    <span>{batchProgress.current} / {batchProgress.total}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', background: 'var(--accent)', borderRadius: 2,
                      width: `${(batchProgress.current / batchProgress.total) * 100}%`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                </div>
              )}

              {completedScans.length > 0 && (
                <BatchSummary scans={completedScans} priorityCounts={priorityCounts} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Zip Code */}
      {mode === MODE.zip && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="label">Austin Zip Code</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="e.g. 78757"
              maxLength={5}
              style={{ flex: 1 }}
            />
            <button
              className="btn-primary"
              onClick={handleZipScan}
              disabled={scanning || input.length !== 5}
              style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
            >
              {scanning ? <Loader size={14} className="animate-spin" /> : <Hash size={14} />}
              {scanning ? 'Finding properties...' : 'Find Properties'}
            </button>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
            Finds all commercial properties in this zip code via Google Places, then runs full AI scan on each.
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
            Heavy commercial Austin zips: 78757, 78758, 78753, 78741, 78704, 78745
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--red-dim)', border: '1px solid var(--red)',
          marginBottom: 20, fontSize: 13
        }}>
          <AlertTriangle size={14} color="var(--red)" />
          <span style={{ color: 'var(--red)' }}>{error}</span>
          <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Single scan result */}
      {result && <ScanResult lead={result} />}
    </div>
  )
}

function ScanResult({ lead }) {
  const a = lead.analysis
  const p = lead.pricing

  const issueLabels = {
    cracking: 'Cracking', fading: 'Fading', potholes: 'Potholes',
    stripingFaded: 'Striping Faded', drainage: 'Drainage Issues', alligatorCracking: 'Alligator Cracking'
  }

  const activeIssues = Object.entries(a.issues || {}).filter(([, v]) => v).map(([k]) => issueLabels[k] || k)

  return (
    <div className="card animate-fade">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{lead.address}</div>
          <div style={{ fontSize: 12, color: 'var(--text3)', textTransform: 'capitalize' }}>{a.propertyType?.replace('_', ' ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className={`score-ring ${a.score >= 8 ? 'score-high' : a.score >= 5 ? 'score-mid' : 'score-low'}`}>
            {a.score}
          </div>
          <span className={`badge badge-${lead.priority.toLowerCase()}`}>
            Priority {lead.priority}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
        <Metric label="Est. Job Value" value={`$${p.jobLow?.toLocaleString()} – $${p.jobHigh?.toLocaleString()}`} />
        <Metric label="Est. Margin" value={`$${p.marginLow?.toLocaleString()} – $${p.marginHigh?.toLocaleString()}`} />
        <Metric label="Lot Size" value={a.lotSqft ? `${a.lotSqft.toLocaleString()} sq ft` : 'Unknown'} />
      </div>

      {activeIssues.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="label">Issues Detected</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {activeIssues.map(issue => (
              <span key={issue} style={{
                padding: '3px 10px', borderRadius: 4,
                background: 'var(--red-dim)', color: 'var(--red)',
                fontSize: 12, fontFamily: 'var(--font-mono)'
              }}>{issue}</span>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <div className="label">Services Recommended</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(a.recommendedServices || []).map(s => (
            <span key={s} style={{
              padding: '4px 12px', borderRadius: 4,
              background: 'var(--accent-dim)', color: 'var(--accent)',
              fontSize: 12, fontFamily: 'var(--font-mono)', textTransform: 'capitalize'
            }}>{s}</span>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div className="label">Assessment</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>{a.notes}</div>
      </div>

      {a.outreachAngle && (
        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--amber-dim)', border: '1px solid var(--amber)'
        }}>
          <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Outreach Angle</div>
          <div style={{ fontSize: 13, color: 'var(--text)' }}>{a.outreachAngle}</div>
        </div>
      )}

      {lead.status === 'Enriched' && lead.owner && (
        <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 8, background: 'var(--green-dim)', border: '1px solid var(--green)' }}>
          <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Auto-Enriched (Priority A)
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)' }}>
            {lead.owner.name && <div>{lead.owner.name}</div>}
            {lead.owner.company && <div>{lead.owner.company}</div>}
            {lead.owner.phone && <div>{lead.owner.phone}</div>}
            {lead.owner.email && <div>{lead.owner.email}</div>}
          </div>
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <CheckCircle size={14} color="var(--green)" />
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>Lead saved — view in Leads tab</span>
      </div>
    </div>
  )
}

function BatchSummary({ scans, priorityCounts }) {
  const errors = scans.filter(s => s.error).length
  const successful = scans.filter(s => !s.error)
  const avgScore = successful.length
    ? Math.round(successful.reduce((acc, s) => acc + (s.analysis?.score || 0), 0) / successful.length)
    : 0

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
        <MiniMetric label="Scanned" value={scans.length} />
        <MiniMetric label="Priority A" value={priorityCounts.A || 0} color="var(--red)" />
        <MiniMetric label="Priority B" value={priorityCounts.B || 0} color="var(--amber)" />
        <MiniMetric label="Avg Score" value={avgScore + '/10'} />
      </div>
      {errors > 0 && (
        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{errors} failed</div>
      )}
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 8 }}>
      <div className="label">{label}</div>
      <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{value}</div>
    </div>
  )
}

function MiniMetric({ label, value, color }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-mono)', color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
    </div>
  )
}
