// Netlify Function — Lift status proxy via Liftie

const KEY_LIFTS = [
  { key: 'Tortin - Chassoure',                             display: 'Chassoure' },
  { key: 'Tortin - Col des Gentianes (Mont Fort 1)',       display: 'Tortin → Gentianes' },
  { key: 'Mont Gelé',                                      display: 'Mont Gelé' },
  { key: 'Col des Gentianes - Mont Fort (Mont Fort 2)',    display: 'Mont Fort' },
  { key: 'Lac des Vaux 2',                                 display: 'Lac des Vaux 2' },
  { key: 'Attelas',                                        display: 'Attelas' },
  { key: 'La Chaux - Col des Gentianes (Jumbo)',           display: 'Jumbo' },
];

export default async function handler(req) {
  try {
    const res = await fetch('https://liftie.info/api/resort/verbier', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://liftie.info/'
      }
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Liftie returned ${res.status}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await res.json();
    const lifts = data?.lifts?.status || {};

    const result = KEY_LIFTS.map(({ key, display }) => ({
      name: display,
      status: lifts[key] || 'unknown'
    }));

    return new Response(JSON.stringify({
      lifts: result,
      updated: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=60'
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
