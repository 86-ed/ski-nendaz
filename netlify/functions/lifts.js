// Netlify Function — Lift status proxy
// Verbier lifts: Liftie API
// Nendaz lifts (Siviez/Plan du Fou): verbier4vallees.ch scrape

const VERBIER_LIFTS = [
  { key: 'La Chaux - Col des Gentianes (Jumbo)',          display: 'Jumbo (La Chaux → Gentianes)' },
  { key: 'Tortin - Col des Gentianes (Mont Fort 1)',       display: 'Tortin → Gentianes' },
  { key: 'Col des Gentianes - Mont Fort (Mont Fort 2)',    display: 'Mont Fort' },
  { key: 'Tortin - Chassoure',                             display: 'Chassoure (Tortin → Col)' },
  { key: 'Lac des Vaux 2',                                 display: 'Lac des Vaux 2' },
  { key: 'Mont Gelé',                                      display: 'Mont Gelé' },
  { key: 'Attelas',                                        display: 'Attelas' },
];

// Nendaz lift names to search for in the verbier4vallees page HTML
const NENDAZ_LIFTS = [
  { search: 'Siviez', display: 'Plan du Fou (Siviez)' },
];

export default async function handler(req) {
  try {
    // Fetch Verbier lifts from Liftie
    const liftieRes = await fetch('https://liftie.info/api/resort/verbier', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://liftie.info/'
      }
    });

    // Fetch Nendaz page for Plan du Fou / Siviez status
    const nendazRes = await fetch('https://verbier4vallees.ch/en/useful-information/live-information-winter', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Accept': 'text/html'
      }
    });

    // Process Verbier lifts
    const liftieData = await liftieRes.json();
    const lifts = liftieData?.lifts?.status || {};
    const verbierResults = VERBIER_LIFTS.map(({ key, display }) => ({
      name: display,
      status: lifts[key] || 'unknown'
    }));

    // Process Nendaz page - look for lift status keywords near lift names
    const nendazHtml = await nendazRes.text();
    const nendazResults = NENDAZ_LIFTS.map(({ search, display }) => {
      // Look for status indicators near the lift name in the HTML
      const idx = nendazHtml.indexOf(search);
      if (idx === -1) return { name: display, status: 'unknown' };

      // Check nearby text (500 chars) for status keywords
      const nearby = nendazHtml.slice(Math.max(0, idx - 200), idx + 300).toLowerCase();
      let status = 'unknown';
      if (nearby.includes('open') || nearby.includes('ouvert')) status = 'open';
      else if (nearby.includes('closed') || nearby.includes('fermé') || nearby.includes('ferme')) status = 'closed';
      else if (nearby.includes('hold') || nearby.includes('attente')) status = 'hold';
      else if (nearby.includes('scheduled') || nearby.includes('prévu')) status = 'scheduled';

      return { name: display, status };
    });

    // Combine: Nendaz first (as it's the home resort), then Verbier
    const result = [...nendazResults, ...verbierResults];

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
