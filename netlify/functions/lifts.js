// Netlify Function — Lift status proxy via Liftie (debug version)

export default async function handler(req) {
  try {
    const res = await fetch('https://liftie.info/api/resort/verbier', {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://liftie.info/'
      }
    });

    const text = await res.text();

    return new Response(JSON.stringify({
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      body: text.slice(0, 2000)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
