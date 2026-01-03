const https = require('https');

const url = 'https://saltygold-trials.vercel.app/api/isu-proxy?url=https://api.isuresults.eu/events/2026_USA_0002/schedule';

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const races = json.competitions || json;
            const men5k = races.find(r => {
                const t = (r.title || r.name || "").toLowerCase();
                return t.includes('5000') && t.includes('men');
            });

            if (men5k) {
                console.log(`FOUND Men's 5000m!`);
                console.log(JSON.stringify(men5k, null, 2));
            } else {
                console.log("Not found");
            }
        } catch (e) { console.error(e.message); }
    });
});
