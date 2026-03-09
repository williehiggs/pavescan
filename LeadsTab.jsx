import { useState } from 'react'
import { Zap, Download, Trash2, RefreshCw, ChevronDown, ChevronUp, Filter, UserCheck, Loader } from 'lucide-react'
import { saveLead, deleteLead, saveLeads, getLeads } from '../utils/leadStorage.js'
import { exportToCSV } from '../utils/csvExport.js'
import { formatCurrency } from '../utils/pricingCalc.js'

const STATUS_COLORS = {
  'New': 'badge-new',
  'Enriched': 'badge-enriched',
  'Outreach Sent': 'badge-sent',
  'Proposal Sent': 'badge-sent',
  'Won': 'badge-enriched',
  'Lost': 'badge-c'
}

const STATUSES = ['New', 'Enriched', 'Outreach Sent', 'Proposal Sent', 'Won', 'Lost']

export default function LeadsTab({ leads, onRefresh, onOpenOutreach }) {
  const [filter, setFilter] = useState({ priority: 'all', status: 'all', service: 'all' })
  const [sort, setSort] = useState({ key: 'scannedAt', dir: 'desc' })
  const [expanded, setExpanded] = useState(null)
  const [enriching, setEnriching] = useState(null)
  const [selected, setSelected] = useState(new Set())

  function toggleSort(key) {
    setSort(s => s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  const filtered = leads
    .filter(l => filter.priority === 'all' || l.priority === filter.priority)
    .filter(l => filter.status === 'all' || l.status === filter.status)
    .filter(l => filter.service === 'all' || (l.analysis?.recommendedServices || []).includes(filter.service))
    .sort((a, b) => {
      let av, bv
      if (sort.key === 'score') { av = a.analysis?.score || 0; bv = b.analysis?.score || 0 }
      else if (sort.key === 'value') { av = a.pricing?.jobHigh || 0; bv = b.pricing?.jobHigh || 0 }
      else if (sort.key === 'scannedAt') { av = a.scannedAt || 0; bv = b.scannedAt || 0 }
      else { av = a[sort.key] || ''; bv = b[sort.key] || '' }
      return sort.dir === 'desc' ? bv - av : av - bv
    })

  async function enrich(lead) {
    setEnriching(lead.id)
    try {
      const res = await fetch('/api/enrich-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: lead.address })
      })
      const owner = await res.json()
      if (owner.error) throw new Error(owner.error)
      const updated = { ...lead, owner, status: 'Enriched' }
      saveLead(updated)
      onRefresh()
    } catch (e) {
      alert('Enrichment failed: ' + e.message)
    } finally {
      setEnriching(null)
    }
  }

  function updateStatus(lead, status) {
    saveLead({ ...lead, status })
    onRefresh()
  }

  function handleDelete(id) {
    if (!confirm('Delete this lead?')) return
    deleteLead(id)
    onRefresh()
  }

  function exportSelected() {
    const toExport = selected.size > 0
      ? leads.filter(l => selected.has(l.id))
      : filtered
    exportToCSV(toExport)
  }

  function toggleSelect(id) {
    setSelected(s => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const summaryA = leads.filter(l => l.priority === 'A').length
  const summaryB = leads.filter(l => l.priority === 'B').length
  const summaryC = leads.filter(l => l.priority === 'C').length
  const totalValue = leads.reduce((acc, l) => acc + (l.pricing?.jobHigh || 0), 0)

  return (
    <div>
      {/* Summary bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Leads', value: leads.length, color: 'var(--text)' },
          { label: 'Priority A', value: summaryA, color: 'var(--red)' },
          { label: 'Priority B', value: summaryB, color: 'var(--amber)' },
          { label: 'Priority C', value: summaryC, color: 'var(--text3)' },
          { label: 'Pipeline Value', value: formatCurrency(totalValue), color: 'var(--green)' },
        ].map(m => (
          <div key={m.label} className="card" style={{ padding: '14px 16px' }}>
            <div className="label">{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Filter size={14} color="var(--text3)" />

        <select value={filter.priority} onChange={e => setFilter(f => ({ ...f, priority: e.target.value }))}
          style={{ width: 140 }}>
          <option value="all">All Priorities</option>
          <option value="A">Priority A</option>
          <option value="B">Priority B</option>
          <option value="C">Priority C</option>
        </select>

        <select value={filter.status} onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}
          style={{ width: 160 }}>
          <option value="all">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>

        <select value={filter.service} onChange={e => setFilter(f => ({ ...f, service: e.target.value }))}
          style={{ width: 160 }}>
          <option value="all">All Services</option>
          <option value="sealcoating">Sealcoating</option>
          <option value="striping">Striping</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {selected.size > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text2)', alignSelf: 'center' }}>{selected.size} selected</span>
          )}
          <button className="btn-secondary" onClick={exportSelected}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} />
            Export {selected.size > 0 ? `(${selected.size})` : 'CSV'}
          </button>
          <button className="btn-ghost" onClick={onRefresh}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48, color: 'var(--text3)' }}>
          No leads yet. Run a scan to get started.
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 80px 90px 130px 130px 110px 180px',
            gap: 0, padding: '10px 16px',
            background: 'var(--surface2)', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 600, color: 'var(--text3)',
            textTransform: 'uppercase', letterSpacing: '0.06em'
          }}>
            <div />
            <SortHeader label="Address" sortKey="address" current={sort} onSort={toggleSort} />
            <SortHeader label="Score" sortKey="score" current={sort} onSort={toggleSort} />
            <div>Priority</div>
            <SortHeader label="Job Value" sortKey="value" current={sort} onSort={toggleSort} />
            <div>Services</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {filtered.map(lead => (
            <LeadRow
              key={lead.id}
              lead={lead}
              expanded={expanded === lead.id}
              onToggle={() => setExpanded(expanded === lead.id ? null : lead.id)}
              onEnrich={() => enrich(lead)}
              enriching={enriching === lead.id}
              onStatusChange={(s) => updateStatus(lead, s)}
              onDelete={() => handleDelete(lead.id)}
              onOutreach={() => onOpenOutreach(lead)}
              selected={selected.has(lead.id)}
              onSelect={() => toggleSelect(lead.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SortHeader({ label, sortKey, current, onSort }) {
  const active = current.key === sortKey
  return (
    <div
      onClick={() => onSort(sortKey)}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, userSelect: 'none',
        color: active ? 'var(--text)' : 'var(--text3)' }}
    >
      {label}
      {active && (current.dir === 'desc' ? <ChevronDown size={11} /> : <ChevronUp size={11} />)}
    </div>
  )
}

function LeadRow({ lead, expanded, onToggle, onEnrich, enriching, onStatusChange, onDelete, onOutreach, selected, onSelect }) {
  const a = lead.analysis || {}
  const p = lead.pricing || {}
  const services = a.recommendedServices || []

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '32px 1fr 80px 90px 130px 130px 110px 180px',
          gap: 0, padding: '12px 16px',
          borderBottom: expanded ? 'none' : '1px solid var(--border)',
          background: selected ? 'rgba(59,130,246,0.05)' : 'transparent',
          cursor: 'pointer', transition: 'background 0.1s',
          alignItems: 'center', fontSize: 13
        }}
      >
        <input type="checkbox" checked={selected} onChange={onSelect}
          onClick={e => e.stopPropagation()}
          style={{ width: 14, height: 14, cursor: 'pointer' }} />

        <div onClick={onToggle} style={{ minWidth: 0 }}>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
            {lead.address}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, textTransform: 'capitalize' }}>
            {a.propertyType?.replace(/_/g, ' ')} · {a.urgency?.replace(/_/g, ' ')}
          </div>
        </div>

        <div onClick={onToggle}>
          <div className={`score-ring ${a.score >= 8 ? 'score-high' : a.score >= 5 ? 'score-mid' : 'score-low'}`}
            style={{ width: 30, height: 30, fontSize: 13 }}>
            {a.score || '?'}
          </div>
        </div>

        <div onClick={onToggle}>
          <span className={`badge badge-${(lead.priority || 'c').toLowerCase()}`}>
            {lead.priority || '?'}
          </span>
        </div>

        <div onClick={onToggle} style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {p.jobLow ? `${formatCurrency(p.jobLow)}–${formatCurrency(p.jobHigh)}` : '—'}
        </div>

        <div onClick={onToggle} style={{ display: 'flex', gap: 4 }}>
          {services.map(s => (
            <span key={s} style={{
              padding: '2px 7px', borderRadius: 4,
              background: 'var(--accent-dim)', color: 'var(--accent)',
              fontSize: 11, fontFamily: 'var(--font-mono)', textTransform: 'capitalize'
            }}>{s}</span>
          ))}
        </div>

        <div>
          <select
            value={lead.status || 'New'}
            onChange={e => { e.stopPropagation(); onStatusChange(e.target.value) }}
            onClick={e => e.stopPropagation()}
            style={{ width: '100%', padding: '4px 8px', fontSize: 12 }}
          >
            {['New','Enriched','Outreach Sent','Proposal Sent','Won','Lost'].map(s =>
              <option key={s}>{s}</option>
            )}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
          {lead.status !== 'Enriched' && !lead.owner && (
            <button
              className="btn-secondary"
              onClick={onEnrich}
              disabled={enriching}
              style={{ padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
            >
              {enriching ? <Loader size={11} className="animate-spin" /> : <UserCheck size={11} />}
              Enrich
            </button>
          )}
          <button
            className="btn-secondary"
            onClick={onOutreach}
            style={{ padding: '5px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <Zap size={11} />
            Outreach
          </button>
          <button
            className="btn-ghost"
            onClick={onDelete}
            style={{ padding: '5px 8px', color: 'var(--red)' }}
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          padding: '16px 24px 20px',
          background: 'var(--surface2)',
          borderBottom: '1px solid var(--border)',
          borderLeft: '3px solid var(--accent)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div className="label" style={{ marginBottom: 8 }}>AI Assessment</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.7, marginBottom: 12 }}>{a.notes}</div>

              <div className="label" style={{ marginBottom: 8 }}>Issues Detected</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(a.issues || {}).filter(([,v]) => v).map(([k]) => (
                  <span key={k} style={{
                    padding: '3px 8px', borderRadius: 4,
                    background: 'var(--red-dim)', color: 'var(--red)',
                    fontSize: 11, fontFamily: 'var(--font-mono)'
                  }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                ))}
              </div>

              {a.outreachAngle && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, background: 'var(--amber-dim)', border: '1px solid var(--amber)' }}>
                  <div style={{ fontSize: 11, color: 'var(--amber)', fontWeight: 600, marginBottom: 4 }}>OUTREACH ANGLE</div>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>{a.outreachAngle}</div>
                </div>
              )}
            </div>

            <div>
              <div className="label" style={{ marginBottom: 8 }}>Pricing Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <SmallMetric label="Job Low" value={formatCurrency(p.jobLow)} />
                <SmallMetric label="Job High" value={formatCurrency(p.jobHigh)} />
                <SmallMetric label="Margin Low" value={formatCurrency(p.marginLow)} />
                <SmallMetric label="Margin High" value={formatCurrency(p.marginHigh)} />
                <SmallMetric label="Lot Size" value={a.lotSqft ? a.lotSqft.toLocaleString() + ' sqft' : '—'} />
                <SmallMetric label="Margin %" value={p.marginPct ? p.marginPct + '%' : '—'} />
              </div>

              {lead.owner && (
                <>
                  <div className="label" style={{ marginBottom: 8 }}>Owner / Contact</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 2 }}>
                    {lead.owner.name && <div><strong style={{ color: 'var(--text)' }}>Name:</strong> {lead.owner.name}</div>}
                    {lead.owner.company && <div><strong style={{ color: 'var(--text)' }}>Company:</strong> {lead.owner.company}</div>}
                    {lead.owner.phone && <div><strong style={{ color: 'var(--text)' }}>Phone:</strong> {lead.owner.phone}</div>}
                    {lead.owner.email && <div><strong style={{ color: 'var(--text)' }}>Email:</strong> {lead.owner.email}</div>}
                    {lead.owner.mailing && <div><strong style={{ color: 'var(--text)' }}>Mailing:</strong> {lead.owner.mailing}</div>}
                  </div>
                </>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Confidence: <span style={{ color: 'var(--text2)' }}>{a.confidence}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Est. Age: <span style={{ color: 'var(--text2)' }}>{a.estimatedAge}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Scanned: <span style={{ color: 'var(--text2)' }}>{lead.scannedAt ? new Date(lead.scannedAt).toLocaleDateString() : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SmallMetric({ label, value }) {
  return (
    <div style={{ padding: '8px 10px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
