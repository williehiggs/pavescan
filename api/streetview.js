export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { lat, lng, heading = 0 } = req.body || {}
  if (!lat || !lng) return res.status(400).json({ error: 'lat/lng required' })

  const key = process.env.GOOGLE_MAPS_API_KEY

  // Return multiple angles for better coverage
  const headings = [heading, (heading + 90) % 360, (heading + 180) % 360]
  const imageUrls = headings.map(h =>
    `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&heading=${h}&pitch=-10&fov=90&key=${key}`
  )

  // Also get satellite static map for lot size estimation
  const satelliteUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=19&size=640x480&maptype=satellite&key=${key}`

  res.json({ imageUrls, satelliteUrl, lat, lng })
}
