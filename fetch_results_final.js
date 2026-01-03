const https = require('https');

// CORRECTED ID: 1
const target = 'https://live.isuresults.eu/api/events/2026_USA_0002/competitions/1/results';
const url = `https://saltygold-trials.vercel.app/api/isu-proxy?url=${encodeURIComponent(target)}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log("--- 3000m Women Results (OFFICIAL) ---");
                json.forEach((r, i) => {
                    let name = "Unknown";
                    if (r.competitors && r.competitors[0]) name = r.competitors[0].fullName;
                    console.log(`${i + 1}. ${name} - ${r.time}`);
                });
            } else {
                console.log("Error:", JSON.stringify(json));
            }
        } catch (e) { console.error(e.message); }
    });
});
