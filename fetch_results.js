const https = require('https');

// Trying ID=1 based on browser URL
const target = 'https://api.isuresults.eu/events/2026_USA_0002/competitions/1/results';
const url = `https://saltygold-trials.vercel.app/api/isu-proxy?url=${encodeURIComponent(target)}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log("--- Results (ID=1) ---");
                json.forEach((r, i) => {
                    let name = "Unknown";
                    if (r.competitors && r.competitors[0]) name = r.competitors[0].fullName;
                    console.log(`${i + 1}. ${name} - ${r.time}`);
                });
            } else {
                console.log("Received Object:", Object.keys(json));
                console.log(JSON.stringify(json).substring(0, 200));
            }
        } catch (e) { console.error(e.message); }
    });
});
