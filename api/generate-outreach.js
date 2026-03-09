export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { lead } = req.body || {}
  if (!lead) return res.status(400).json({ error: 'Lead data required' })

  const key = process.env.ANTHROPIC_API_KEY
  const a = lead.analysis || {}
  const o = lead.owner || {}
  const p = lead.pricing || {}

  const prompt = `You are writing outreach for Austin Pavement Solutions, a tech-forward commercial sealcoating and line striping company in Austin, TX.

Property Details:
- Address: ${lead.address}
- Property Type: ${a.propertyType || 'commercial'}
- Pavement Score: ${a.score}/10 (Priority ${lead.priority})
- Urgency: ${a.urgency}
- Issues Found: ${Object.entries(a.issues || {}).filter(([,v]) => v).map(([k]) => k).join(', ')}
- Cracking Severity: ${a.severity?.cracking || 'unknown'}
- Fading Severity: ${a.severity?.fading || 'unknown'}
- Striping Condition: ${a.severity?.striping || 'unknown'}
- Estimated Lot Size: ${a.lotSqft ? a.lotSqft.toLocaleString() + ' sq ft' : 'unknown'}
- Recommended Services: ${(a.recommendedServices || []).join(' + ')}
- Estimated Job Value: $${p.jobLow?.toLocaleString()} - $${p.jobHigh?.toLocaleString()}
- Assessment Notes: ${a.notes}
- Best Outreach Angle: ${a.outreachAngle}
- Owner/Contact: ${o.name || 'Property Owner/Manager'}
- Company: ${o.company || ''}

Write 3 outreach assets. Respond ONLY with valid JSON:

{
  "email": {
    "subject": "<compelling subject line, max 60 chars>",
    "body": "<3-4 paragraphs. Para 1: reference specific condition at their property — you noticed it. Para 2: explain UV damage acceleration in Austin, liability risk from faded striping/cracking. Para 3: what Austin Pavement Solutions offers — data-backed proposal, fast scheduling, professional results. Para 4: soft CTA — free walk-through this week, no obligation. Sign: Tyler | Austin Pavement Solutions | austinpavementsolutions.com>"
  },
  "sms": "<under 160 chars, casual, reference specific issue at their property, include callback number placeholder>",
  "letter": "<formal 1-page letter. Header: Austin Pavement Solutions. Reference 'our recent property scan'. Be specific about what was found. Include estimated investment range. End with: complimentary walk-through offer and business card placeholder. Sign: Tyler>"
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    if (data.error) return res.status(500).json({ error: data.error.message })

    const text = data.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const outreach = JSON.parse(clean)
    res.json(outreach)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
