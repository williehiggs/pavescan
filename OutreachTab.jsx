import { useState } from 'react'
import { Zap, Copy, Check, Loader, Mail, MessageSquare, FileText } from 'lucide-react'

export default function OutreachTab({ lead, onSelectLead, leads }) {
  const [generating, setGenerating] = useState(false)
  const [outreach, setOutreach] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(null)

  async function generate(l) {
    const target = l || lead
    if (!target) return
    setGenerating(true)
    setError(null)
    setOutreach(null)
    try {
      const res = await fetch('/api/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead: target })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setOutreach(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setGenerating(false)
    }
  }

  function copy(text, key) {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const enrichedLeads = leads.filter(l => l.owner || l.status === 'Enriched')
  const highPriority = leads.filter(l => l.priority === 'A' || l.priority === 'B')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Lead selector */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="label">Select Lead</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select
            value={lead?.id || ''}
            onChange={e => {
              const l = leads.find(x => x.id === e.target.value)
              if (l) onSelectLead(l)
            }}
            style={{ flex: 1 }}
          >
            <option value="">— Select a lead —</option>
            {highPriority.map(l => (
              <option key={l.id} value={l.id}>
                [{l.priority}] {l.address} — Score {l.analysis?.score}/10
              </option>
            ))}
            {leads.filter(l => l.priority === 'C').map(l => (
              <option key={l.id} value={l.id}>
                [C] {l.address} — Score {l.analysis?.score}/10
              </option>
            ))}
          </select>
          <button
            className="btn-primary"
            onClick={() => generate(lead)}
            disabled={generating || !lead}
            style={{ display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            {generating ? <Loader size={14} className="animate-spin" /> : <Zap size={14} />}
            {generating ? 'Generating...' : 'Generate Outreach'}
          </button>
        </div>

        {lead && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 6, background: 'var(--surface2)', fontSize: 13 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text2)' }}><strong style={{ color: 'var(--text)' }}>Address:</strong> {lead.address}</span>
              <span style={{ color: 'var(--text2)' }}><strong style={{ color: 'var(--text)' }}>Score:</strong> {lead.analysis?.score}/10</span>
              <span style={{ color: 'var(--text2)' }}><strong style={{ color: 'var(--text)' }}>Priority:</strong> {lead.priority}</span>
              <span style={{ color: 'var(--text2)' }}><strong style={{ color: 'var(--text)' }}>Services:</strong> {(lead.analysis?.recommendedServices || []).join(' + ')}</span>
              {lead.owner?.name && <span style={{ color: 'var(--green)' }}>✓ {lead.owner.name}</span>}
              {!lead.owner && <span style={{ color: 'var(--amber)' }}>⚠ Not enriched — outreach will be generic</span>}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: 'var(--red-dim)', border: '1px solid var(--red)', marginBottom: 20, color: 'var(--red)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {outreach && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="animate-fade">
          <OutreachCard
            icon={Mail}
            title="Cold Email"
            subject={outreach.email?.subject}
            content={outreach.email?.body}
            onCopy={(text) => copy(text, 'email')}
            copied={copied === 'email'}
          />
          <OutreachCard
            icon={MessageSquare}
            title="SMS"
            content={outreach.sms}
            onCopy={(text) => copy(text, 'sms')}
            copied={copied === 'sms'}
            charCount
          />
          <OutreachCard
            icon={FileText}
            title="Direct Mail Letter"
            content={outreach.letter}
            onCopy={(text) => copy(text, 'letter')}
            copied={copied === 'letter'}
          />
        </div>
      )}

      {!lead && !outreach && (
        <div className="card" style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
          <Zap size={32} style={{ margin: '0 auto 12px', color: 'var(--border2)' }} />
          <div>Select a lead and click Generate Outreach</div>
          <div style={{ fontSize: 12, marginTop: 6 }}>Claude will write 3 personalized assets using the property's scan data</div>
        </div>
      )}
    </div>
  )
}

function OutreachCard({ icon: Icon, title, subject, content, onCopy, copied, charCount }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(content)

  const fullText = subject ? `Subject: ${subject}\n\n${text || content}` : (text || content)

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={15} color="var(--accent)" />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{title}</span>
          {charCount && (
            <span style={{ fontSize: 11, color: content?.length > 160 ? 'var(--red)' : 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {content?.length || 0}/160
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => setEditing(e => !e)} style={{ fontSize: 12 }}>
            {editing ? 'Done' : 'Edit'}
          </button>
          <button
            className="btn-secondary"
            onClick={() => onCopy(fullText)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 12 }}
          >
            {copied ? <Check size={12} color="var(--green)" /> : <Copy size={12} />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>

      {subject && (
        <div style={{ marginBottom: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 6, fontSize: 13 }}>
          <span style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Subject: </span>
          <span style={{ fontWeight: 500 }}>{subject}</span>
        </div>
      )}

      {editing ? (
        <textarea
          value={text || content}
          onChange={e => setText(e.target.value)}
          style={{ width: '100%', minHeight: 200, fontSize: 13, lineHeight: 1.7, resize: 'vertical' }}
        />
      ) : (
        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
          {text || content}
        </div>
      )}
    </div>
  )
}
