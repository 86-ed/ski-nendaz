// Netlify Function — Lift status proxy via Liftie
// Fetches Verbier lift status from liftie.info and filters to key lifts

// The lifts we care about and their exact names as used by Liftie
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
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();

    // data.lifts is an object: { "Lift Name": { status: "open"|"closed"|"hold"|"scheduled" } }
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
        'Cache-Control': 'public, max-age=60' // cache 1 min
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
