const https = require('https');

const url = 'https://saltygold-trials.vercel.app/api/isu-proxy?url=https://api.isuresults.eu/events/2026_USA_0002/schedule';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const races = json.competitions || json;
            races.forEach(r => {
                const t = (r.title || r.name || "").toLowerCase();
                console.log(`ID: ${r.id} | Title: ${t}`);
            });
        } catch (e) { console.error(e.message); }
    });
});
