import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, CheckCircle } from 'lucide-react'

const DEFAULTS = {
  googleApiKey: '',
  anthropicApiKey: '',
  batchdataApiKey: '',
  ghlApiKey: '',
  ghlLocationId: '',
  companyName: 'Austin Pavement Solutions',
  contactName: 'Tyler',
  phone: '',
  email: '',
  website: 'austinpavementsolutions.com',
  sealcoatRate: '0.18',
  stripingRate: '0.12',
  crackfillRate: '0.08',
  markupPct: '35',
  subCostPct: '55',
}

export default function SettingsTab() {
  const [settings, setSettings] = useState(DEFAULTS)
  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState({})

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('pavescan_settings') || '{}')
      setSettings({ ...DEFAULTS, ...stored })
    } catch {}
  }, [])

  function update(key, value) {
    setSettings(s => ({ ...s, [key]: value }))
  }

  function save() {
    localStorage.setItem('pavescan_settings', JSON.stringify(settings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function toggleShow(key) {
    setShowKeys(s => ({ ...s, [key]: !s[key] }))
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>

      <Section title="API Keys">
        {[
          { key: 'googleApiKey', label: 'Google Maps API Key', hint: 'Enable: Maps Static, Geocoding, Places, Street View' },
          { key: 'anthropicApiKey', label: 'Anthropic API Key', hint: 'console.anthropic.com' },
          { key: 'batchdataApiKey', label: 'BatchData API Key', hint: 'batchdata.com — pay as you go' },
          { key: 'ghlApiKey', label: 'GoHighLevel API Key', hint: 'GHL → Settings → API' },
          { key: 'ghlLocationId', label: 'GHL Location ID', hint: 'Your subaccount ID' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 16 }}>
            <div className="label">{f.label}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showKeys[f.key] ? 'text' : 'password'}
                value={settings[f.key]}
                onChange={e => update(f.key, e.target.value)}
                placeholder="••••••••••••••••"
                style={{ flex: 1, fontFamily: settings[f.key] ? 'var(--font-mono)' : 'inherit', fontSize: 12 }}
              />
              <button className="btn-ghost" onClick={() => toggleShow(f.key)} style={{ padding: '8px 10px' }}>
                {showKeys[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {f.hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{f.hint}</div>}
          </div>
        ))}
      </Section>

      <Section title="Company Info">
        {[
          { key: 'companyName', label: 'Company Name' },
          { key: 'contactName', label: 'Your Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'website', label: 'Website' },
        ].map(f => (
          <div key={f.key} style={{ marginBottom: 14 }}>
            <div className="label">{f.label}</div>
            <input value={settings[f.key]} onChange={e => update(f.key, e.target.value)} />
          </div>
        ))}
      </Section>

      <Section title="Pricing Defaults">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { key: 'sealcoatRate', label: '$/sq ft — Sealcoating', hint: 'Typical Austin: $0.15–0.25' },
            { key: 'stripingRate', label: '$/linear ft — Striping', hint: 'Typical: $0.10–0.18' },
            { key: 'crackfillRate', label: '$/sq ft — Crack Fill', hint: 'Typical: $0.05–0.12' },
            { key: 'markupPct', label: 'Markup %', hint: 'Applied to get high estimate' },
            { key: 'subCostPct', label: 'Sub Cost %', hint: 'Your sub cost as % of job value' },
          ].map(f => (
            <div key={f.key}>
              <div className="label">{f.label}</div>
              <input
                type="number"
                value={settings[f.key]}
                onChange={e => update(f.key, e.target.value)}
                step="0.01"
              />
              {f.hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{f.hint}</div>}
            </div>
          ))}
        </div>

        {/* Live preview */}
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
          <div style={{ color: 'var(--text3)', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Example: 10,000 sq ft sealcoat + striping job</div>
          {(() => {
            const sqft = 10000
            const sealCost = sqft * parseFloat(settings.sealcoatRate || 0)
            const stripeCost = (sqft * 0.15) * parseFloat(settings.stripingRate || 0)
            const total = sealCost + stripeCost
            const high = total * (1 + parseFloat(settings.markupPct || 0) / 100)
            const margin = high * (1 - parseFloat(settings.subCostPct || 0) / 100)
            return (
              <div style={{ display: 'flex', gap: 24 }}>
                <div>Job Low: <strong>${Math.round(total).toLocaleString()}</strong></div>
                <div>Job High: <strong>${Math.round(high).toLocaleString()}</strong></div>
                <div>Est. Margin: <strong style={{ color: 'var(--green)' }}>${Math.round(margin).toLocaleString()}</strong></div>
              </div>
            )
          })()}
        </div>
      </Section>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn-primary"
          onClick={save}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}
        >
          {saved ? <CheckCircle size={15} /> : <Save size={15} />}
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div style={{ marginTop: 32, padding: '16px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text3)' }}>
        <strong style={{ color: 'var(--text2)' }}>Security note:</strong> API keys are stored locally in your browser only. They are sent server-side via Vercel environment variables for actual API calls — never exposed in the frontend bundle. For production, set all keys as Vercel environment variables.
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 18, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}
