// Netlify Function — Lift status proxy via Liftie

const KEY_LIFTS = [
  'Tortin - Chassoure',
  'Tortin - Col des Gentianes (Mont Fort 1)',
  'Lac des Vaux 2',
  'Gentianes',
  'Col des Gentianes - Mont Fort (Mont Fort 2)',
  'Mont Gelé',
  'Attelas',
  'Prarion - Tracouet',
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

    // Log status for debugging
    if (!res.ok) {
      const text = await res.text();
      return new Response(JSON.stringify({
        error: `Liftie returned ${res.status}`,
        body: text.slice(0, 200)
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const data = await res.json();
    const lifts = data.lifts || {};

    const result = KEY_LIFTS.map(name => ({
      name,
      status: lifts[name]?.status || 'unknown'
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
