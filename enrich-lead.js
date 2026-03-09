export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { address, lat, lng } = req.body || {}
  if (!address) return res.status(400).json({ error: 'Address required' })

  const key = process.env.BATCHDATA_API_KEY

  try {
    const response = await fetch('https://api.batchdata.com/api/v1/property/skip-trace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`
      },
      body: JSON.stringify({
        requests: [{
          propertyAddress: {
            street: address.split(',')[0]?.trim(),
            city: 'Austin',
            state: 'TX'
          }
        }]
      })
    })

    const data = await response.json()

    // Parse BatchData response format
    const result = data?.results?.resultList?.[0]
    if (!result) return res.status(404).json({ error: 'No owner data found' })

    const person = result.personList?.[0] || {}
    const phones = person.phoneList || []
    const emails = person.emailList || []

    res.json({
      name: [person.firstName, person.lastName].filter(Boolean).join(' ') || null,
      company: result.companyList?.[0]?.companyName || null,
      phone: phones[0]?.phoneNumber || null,
      email: emails[0]?.email || null,
      mailing: result.mailingAddress ? 
        `${result.mailingAddress.street}, ${result.mailingAddress.city}, ${result.mailingAddress.state} ${result.mailingAddress.zip}` : null
    })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
