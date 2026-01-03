const https = require('https');

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
    });
}

async function run() {
    try {
        // ID 1 = Women 3000m
        const w3000 = await fetchUrl('https://live.isuresults.eu/api/events/2026_USA_0002/competitions/1/results');
        // ID 2 = Men 5000m
        const m5000 = await fetchUrl('https://live.isuresults.eu/api/events/2026_USA_0002/competitions/2/results');

        const process = (data) => {
            return data.map((r, i) => ({
                rank: r.rank || i + 1,
                name: r.competitor.fullName,
                time: r.time,
                best: r.time, // Important for sorting
                status: r.status,
                pairs: r.pair
            }));
        };

        console.log(JSON.stringify({
            w3000: process(w3000),
            m5000: process(m5000)
        }, null, 2));

    } catch (e) {
        console.error(e);
    }
}

run();
