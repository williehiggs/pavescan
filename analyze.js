export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { imageUrls, satelliteUrl, address } = req.body || {}
  if (!imageUrls?.length) return res.status(400).json({ error: 'imageUrls required' })

  const key = process.env.ANTHROPIC_API_KEY

  // Build image content blocks - street view + satellite
  const imageContent = []

  for (const url of [...imageUrls, satelliteUrl].filter(Boolean)) {
    try {
      const imgRes = await fetch(url)
      const buffer = await imgRes.arrayBuffer()
      const base64 = Buffer.from(buffer).toString('base64')
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
      imageContent.push({
        type: 'image',
        source: { type: 'base64', media_type: contentType, data: base64 }
      })
    } catch (e) {
      console.error('Image fetch error:', e.message)
    }
  }

  if (!imageContent.length) return res.status(500).json({ error: 'Could not fetch images' })

  const prompt = `You are PaveScan, an expert pavement condition analyst for Austin Pavement Solutions, a commercial sealcoating and line striping company in Austin, TX.

Analyze these images of the property at: ${address}

The images include street-level views and a satellite/overhead view.

Perform a COMPREHENSIVE pavement analysis and respond ONLY with valid JSON in this exact format:

{
  "score": <integer 1-10, where 10 = worst condition, needs immediate service>,
  "priority": <"A", "B", or "C" — A=score 8-10, B=score 5-7, C=score 1-4>,
  "lotSqft": <estimated square footage of paved surface as integer, based on satellite view>,
  "propertyType": <"strip_mall" | "office_park" | "warehouse" | "retail" | "multifamily" | "industrial" | "gas_station" | "restaurant" | "mixed_use" | "other">,
  "issues": {
    "cracking": <boolean — visible cracks, alligator cracking, surface fractures>,
    "fading": <boolean — severe oxidation, gray/white coloring instead of black>,
    "potholes": <boolean — visible potholes, depressions, surface failures>,
    "stripingFaded": <boolean — parking lines invisible or barely visible>,
    "drainage": <boolean — visible signs of poor drainage, pooling areas>,
    "alligatorCracking": <boolean — interconnected cracking pattern indicating base failure>
  },
  "severity": {
    "cracking": <"none" | "minor" | "moderate" | "severe">,
    "fading": <"none" | "minor" | "moderate" | "severe">,
    "potholes": <"none" | "minor" | "moderate" | "severe">,
    "striping": <"none" | "minor" | "moderate" | "severe">
  },
  "recommendedServices": <array — include "sealcoating" if fading/cracking present, "striping" if striping faded/missing — can be one or both>,
  "urgency": <"immediate" | "within_3_months" | "within_6_months" | "maintenance_only">,
  "notes": <2-3 sentence professional assessment describing specific visible conditions, mentioning concrete details about what you see — be specific about location of damage, severity, and business impact>,
  "outreachAngle": <1 sentence hook for outreach — the most compelling reason this property owner needs to act now, referencing specific visible issues>,
  "estimatedAge": <"new" | "2-5yrs" | "5-10yrs" | "10+yrs" — estimate based on condition>,
  "confidence": <"high" | "medium" | "low" — based on image quality and visibility>
}

Scoring guide:
- 9-10: Severe alligator cracking, multiple potholes, striping completely gone, significant liability risk
- 7-8: Heavy cracking throughout, significant fading, striping very faded, needs service within 90 days
- 5-6: Moderate cracking/fading, some striping issues, preventive service recommended
- 3-4: Minor surface wear, light fading, striping still visible
- 1-2: Good condition, recently sealed or minimal wear

Be honest and precise. Austin's UV intensity accelerates asphalt oxidation. Prioritize safety and liability concerns in your assessment.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              ...imageContent,
              { type: 'text', text: prompt }
            ]
          }
        ]
      })
    })

    const data = await response.json()
    if (data.error) return res.status(500).json({ error: data.error.message })

    const text = data.content[0].text
    const clean = text.replace(/```json|```/g, '').trim()
    const analysis = JSON.parse(clean)

    res.json(analysis)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
