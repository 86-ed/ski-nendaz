// Debug endpoint — tests a single Google Maps API call
const https = require('https');

const GMAPS_KEY = process.env.GMAPS_KEY;
const COMMUGNY = '46.3169,6.2132';
const NENDAZ   = '46.1757,7.2942';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (r) => {
      let data = '';
      r.on('data', chunk => data += chunk);
      r.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve({ parseError: e.message, raw: data.slice(0, 500) }); }
      });
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const depSec = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${COMMUGNY}&destinations=${NENDAZ}&departure_time=${depSec}&traffic_model=best_guess&key=${GMAPS_KEY}`;

  try {
    const data = await httpsGet(url);
    return res.json({ depSec, url: url.replace(GMAPS_KEY, 'REDACTED'), response: data });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
