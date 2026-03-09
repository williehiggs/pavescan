export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { zipCode } = req.body || {}
  if (!zipCode) return res.status(400).json({ error: 'zipCode required' })

  const key = process.env.GOOGLE_MAPS_API_KEY

  // First geocode the zip to get center point
  const geoUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${zipCode},Austin,TX&key=${key}`
  const geoRes = await fetch(geoUrl)
  const geoData = await geoRes.json()

  if (geoData.status !== 'OK') return res.status(404).json({ error: 'Zip code not found' })

  const { lat, lng } = geoData.results[0].geometry.location

  // Search for commercial property types
  const types = [
    'shopping_mall', 'store', 'supermarket', 'car_repair',
    'restaurant', 'gas_station', 'lodging', 'office_complex'
  ]

  const allPlaces = []
  const seen = new Set()

  for (const type of types.slice(0, 4)) { // Limit to 4 types for cost control
    try {
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=3000&type=${type}&key=${key}`
      const placesRes = await fetch(placesUrl)
      const placesData = await placesRes.json()

      if (placesData.results) {
        for (const place of placesData.results) {
          if (!seen.has(place.place_id)) {
            seen.add(place.place_id)
            allPlaces.push({
              placeId: place.place_id,
              name: place.name,
              address: place.vicinity,
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
              type: place.types[0]
            })
          }
        }
      }
    } catch (e) {
      console.error('Places error:', e.message)
    }
  }

  res.json({ places: allPlaces, center: { lat, lng }, total: allPlaces.length })
}
