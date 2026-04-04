// Netlify Function — Google Maps Distance Matrix proxy
// Keeps the API key server-side, out of the browser and GitHub

const GMAPS_KEY = process.env.GMAPS_KEY;

const COMMUGNY = '46.3169,6.2132';
const NENDAZ   = '46.1757,7.2942';

const FRI_ESTIMATES = [
  { dep: '15:00', arr: '16:45', mins: 105, label: 'Light' },
  { dep: '16:00', arr: '17:55', mins: 115, label: 'Moderate' },
  { dep: '17:00', arr: '19:10', mins: 130, label: 'Heavy' },
  { dep: '18:00', arr: '20:20', mins: 140, label: 'Heavy' },
  { dep: '19:00', arr: '20:55', mins: 115, label: 'Moderate' },
  { dep: '20:00', arr: '21:45', mins: 105, label: 'Light' },
  { dep: '21:00', arr: '22:45', mins: 105, label: 'Light' },
];

const SUN_ESTIMATES = [
  { dep: '13:00', arr: '14:55', mins: 115, label: 'Moderate' },
  { dep: '14:00', arr: '15:45', mins: 105, label: 'Light' },
  { dep: '15:00', arr: '16:50', mins: 110, label: 'Moderate' },
  { dep: '16:00', arr: '18:00', mins: 120, label: 'Moderate' },
  { dep: '17:00', arr: '19:10', mins: 130, label: 'Heavy' },
  { dep: '18:00', arr: '20:20', mins: 140, label: 'Heavy' },
  { dep: '19:00', arr: '20:55', mins: 115, label: 'Moderate' },
];

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

module.exports = async function handler(req) {
  if (!GMAPS_KEY) {
    return new Response(JSON.stringify({ error: 'No API key configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse optional from= query param: 'nendaz' or 'commugny'
    const url = new URL(req.url);
    const from = url.searchParams.get('from') || 'commugny';
    const fromNendaz = from === 'nendaz';
    const todayOrigin = fromNendaz ? NENDAZ : COMMUGNY;
    const todayDest   = fromNendaz ? COMMUGNY : NENDAZ;
    const dirLabel    = fromNendaz ? 'Nendaz → Commugny' : 'Commugny → Nendaz';

    const friHours = [15, 16, 17, 18, 19, 20, 21];
    const sunHours = [13, 14, 15, 16, 17, 18, 19];

    async function buildRows(hours, dayOfWeek, origin, dest, fallbacks) {
      const rows = [];
      for (let i = 0; i < hours.length; i++) {
        const h = hours[i];
        const depSec = nextWeekdayAt(dayOfWeek, h);
        const el = await fetchRoute(origin, dest, depSec);
        if (el && el.status === 'OK') {
          const mins = Math.round(el.duration_in_traffic.value / 60);
          const depTime = `${String(h).padStart(2, '0')}:00`;
          const depDate = new Date(depSec * 1000);
          const arrDate = new Date(depDate.getTime() + el.duration_in_traffic.value * 1000);
          const arrTime = arrDate.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
          const label = mins < 120 ? 'Light' : mins < 145 ? 'Moderate' : 'Heavy';
          rows.push({ dep: depTime, arr: arrTime, mins, label, live: true });
        } else {
          rows.push({ ...fallbacks[i], live: false });
        }
      }
      return rows;
    }

    // Current day: now + next 5 hours on the hour
    const now = new Date();
    const nowSec = Math.floor(now.getTime() / 1000);

    // Build departure times: now (rounded up to next 5 min), then next 5 hours on the hour
    const depTimes = [];
    // First slot: next 5-minute boundary from now
    const nowRounded = new Date(Math.ceil(now.getTime() / (5 * 60000)) * (5 * 60000));
    depTimes.push(Math.floor(nowRounded.getTime() / 1000));
    // Next 5 hours on the hour
    const nextHour = new Date(now);
    nextHour.setMinutes(0, 0, 0);
    nextHour.setHours(nextHour.getHours() + 1);
    for (let i = 0; i < 5; i++) {
      const t = new Date(nextHour);
      t.setHours(nextHour.getHours() + i);
      depTimes.push(Math.floor(t.getTime() / 1000));
    }

    const todayRows = [];
    for (const depSec of depTimes) {
      const el = await fetchRoute(todayOrigin, todayDest, depSec);
      if (el && el.status === 'OK') {
        const mins = Math.round(el.duration_in_traffic.value / 60);
        const depDate = new Date(depSec * 1000);
        const arrDate = new Date(depDate.getTime() + el.duration_in_traffic.value * 1000);
        const depTime = depDate.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
        const arrTime = arrDate.toLocaleTimeString('en-CH', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Zurich' });
        const label = mins < 120 ? 'Light' : mins < 145 ? 'Moderate' : 'Heavy';
        todayRows.push({ dep: depTime, arr: arrTime, mins, label, live: true });
      }
    }

    const [friRows, sunRows] = await Promise.all([
      buildRows(friHours, 5, COMMUGNY, NENDAZ, FRI_ESTIMATES),
      buildRows(sunHours, 0, NENDAZ, COMMUGNY, SUN_ESTIMATES)
    ]);

    return new Response(JSON.stringify({ friRows, sunRows, todayRows, dirLabel }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache' // don't cache today's live times
      }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
