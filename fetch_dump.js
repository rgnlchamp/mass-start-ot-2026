const https = require('https');

const url = 'https://saltygold-trials.vercel.app/api/isu-proxy?url=https://api.isuresults.eu/events/2026_USA_0002/schedule';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const races = json.competitions || json;
            const r = races.find(x => x.id === 5242);
            console.log(JSON.stringify(r, null, 2));
        } catch (e) { console.error(e.message); }
    });
});
