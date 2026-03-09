export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { address } = req.body || {}
  if (!address) return res.status(400).json({ error: 'Address required' })

  const key = process.env.GOOGLE_MAPS_API_KEY
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`

  try {
    const r = await fetch(url)
    const data = await r.json()
    if (data.status !== 'OK' || !data.results[0]) {
      return res.status(404).json({ error: 'Address not found' })
    }
    const loc = data.results[0].geometry.location
    const formatted = data.results[0].formatted_address
    res.json({ lat: loc.lat, lng: loc.lng, formatted })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
