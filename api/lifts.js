// Vercel Serverless Function — Lift status proxy via Liftie

const KEY_LIFTS = [
  { key: 'Tortin - Chassoure',                             display: 'Chassoure' },
  { key: 'Tortin - Col des Gentianes (Mont Fort 1)',       display: 'Tortin → Gentianes' },
  { key: 'Mont Gelé',                                      display: 'Mont Gelé' },
  { key: 'Col des Gentianes - Mont Fort (Mont Fort 2)',    display: 'Mont Fort' },
  { key: 'Lac des Vaux 2',                                 display: 'Lac des Vaux 2' },
  { key: 'Attelas',                                        display: 'Attelas' },
  { key: 'La Chaux - Col des Gentianes (Jumbo)',           display: 'Jumbo' },
];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  try {
    const r = await fetch('https://liftie.info/api/resort/verbier', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://liftie.info/'
      }
    });

    if (!r.ok) {
      return res.status(200).json({ error: `Liftie returned ${r.status}` });
    }

    const data = await r.json();
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
