// Vercel Serverless Function — Lift status proxy via Liftie
const https = require('https');

const KEY_LIFTS = [
  { key: 'Tortin - Chassoure',                             display: 'Chassoure' },
  { key: 'Tortin - Col des Gentianes (Mont Fort 1)',       display: 'Tortin → Gentianes' },
  { key: 'Mont Gelé',                                      display: 'Mont Gelé' },
  { key: 'Col des Gentianes - Mont Fort (Mont Fort 2)',    display: 'Mont Fort' },
  { key: 'Lac des Vaux 2',                                 display: 'Lac des Vaux 2' },
  { key: 'Attelas',                                        display: 'Attelas' },
  { key: 'La Chaux - Col des Gentianes (Jumbo)',           display: 'Jumbo' },
];

function httpsGet(url, headers) {
  return new Promise((resolve, reject) => {
    const options = { headers };
    https.get(url, options, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => {
        if (r.statusCode !== 200) {
          return reject(new Error(`Liftie returned ${r.statusCode}`));
        }
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid JSON: ' + data.slice(0, 100))); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const data = await httpsGet('https://liftie.info/api/resort/verbier', {
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Referer': 'https://liftie.info/verbier',
      'Origin': 'https://liftie.info',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
    });

    const lifts = data?.lifts?.status || {};
    const result = KEY_LIFTS.map(({ key, display }) => ({
      name: display,
      status: lifts[key] || 'unknown'
    }));

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.json({ lifts: result, updated: new Date().toISOString() });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
