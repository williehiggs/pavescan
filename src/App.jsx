import { useState, useEffect } from 'react'
import { Scan, List, Settings, Zap, BarChart2 } from 'lucide-react'
import ScanTab from './components/ScanTab.jsx'
import LeadsTab from './components/LeadsTab.jsx'
import SettingsTab from './components/SettingsTab.jsx'
import OutreachTab from './components/OutreachTab.jsx'
import { getLeads } from './utils/leadStorage.js'

const TABS = [
  { id: 'scan', label: 'Scan', icon: Scan },
  { id: 'leads', label: 'Leads', icon: List },
  { id: 'outreach', label: 'Outreach', icon: Zap },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function App() {
  const [tab, setTab] = useState('scan')
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)

  useEffect(() => {
    setLeads(getLeads())
  }, [])

  function refreshLeads() {
    setLeads(getLeads())
  }

  function openOutreach(lead) {
    setSelectedLead(lead)
    setTab('outreach')
  }

  const priorityA = leads.filter(l => l.priority === 'A').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 52,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <BarChart2 size={15} color="white" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em' }}>
            PaveScan
          </span>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 2 }}>by Pavefront</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {priorityA > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6,
              background: 'var(--red-dim)', border: '1px solid var(--red)'
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)' }} className="animate-pulse" />
              <span style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>{priorityA} Priority A</span>
            </div>
          )}
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{leads.length} leads</span>
        </div>
      </header>

      {/* Tab Bar */}
      <nav style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '0 24px', height: 44,
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="btn-ghost"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 6,
                color: active ? 'var(--text)' : 'var(--text3)',
                background: active ? 'var(--surface2)' : 'transparent',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: 13, fontWeight: active ? 600 : 400
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        {tab === 'scan' && <ScanTab onLeadSaved={refreshLeads} />}
        {tab === 'leads' && <LeadsTab leads={leads} onRefresh={refreshLeads} onOpenOutreach={openOutreach} />}
        {tab === 'outreach' && <OutreachTab lead={selectedLead} onSelectLead={setSelectedLead} leads={leads} />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  )
}
