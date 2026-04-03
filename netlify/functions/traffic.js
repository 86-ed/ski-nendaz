// Netlify Function — Google Maps Distance Matrix proxy
// Keeps the API key server-side, out of the browser and GitHub

const GMAPS_KEY = process.env.GMAPS_KEY;

const COMMUGNY = '46.3169,6.2132';
const NENDAZ   = '46.1757,7.2942';

function nextWeekdayAt(dayOfWeek, hour) {
  const now = new Date();
  const result = new Date(now);
  result.setHours(hour, 0, 0, 0);
  const diff = (dayOfWeek - now.getDay() + 7) % 7;
  result.setDate(now.getDate() + (diff === 0 && now.getHours() >= hour ? 7 : diff));
  return Math.floor(result.getTime() / 1000);
}

async function fetchRoute(origin, dest, departureSec) {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${dest}&departure_time=${departureSec}&traffic_model=best_guess&key=${GMAPS_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.rows?.[0]?.elements?.[0];
}

export default async function handler(req) {
  if (!GMAPS_KEY) {
    return new Response(JSON.stringify({ error: 'No API key configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const friHours = [15, 16, 17, 18, 19, 20, 21];
    const sunHours = [13, 14, 15, 16, 17, 18, 19];

    async function buildRows(hours, dayOfWeek, origin, dest) {
      const rows = [];
      for (const h of hours) {
        const depSec = nextWeekdayAt(dayOfWeek, h);
        const el = await fetchRoute(origin, dest, depSec);
        if (el && el.status === 'OK') {
          const mins = Math.round(el.duration_in_traffic.value / 60);
          const depTime = `${String(h).padStart(2, '0')}:00`;
          // Calculate arrival time
          const depDate = new Date(depSec * 1000);
          const arrDate = new Date(depDate.getTime() + el.duration_in_traffic.value * 1000);
          const arrTime = arrDate.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
          const label = mins < 120 ? 'Light' : mins < 145 ? 'Moderate' : 'Heavy';
          rows.push({ dep: depTime, arr: arrTime, mins, label });
        }
      }
      return rows;
    }

    const [friRows, sunRows] = await Promise.all([
      buildRows(friHours, 5, COMMUGNY, NENDAZ),   // Friday: Commugny → Nendaz
      buildRows(sunHours, 0, NENDAZ, COMMUGNY)    // Sunday: Nendaz → Commugny
    ]);

    return new Response(JSON.stringify({ friRows, sunRows }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300' // cache 5 min
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
