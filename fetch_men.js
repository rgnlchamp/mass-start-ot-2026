const https = require('https');

// Men's 5000m should be Competition ID 2 based on previous checks
const target = 'https://live.isuresults.eu/api/events/2026_USA_0002/competitions/2/results';
const url = `https://saltygold-trials.vercel.app/api/isu-proxy?url=${encodeURIComponent(target)}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                console.log("--- Men's 5000m Results (ID=2) ---");
                json.forEach((r, i) => {
                    let name = "Unknown";
                    if (r.competitors && r.competitors[0]) name = r.competitors[0].fullName;
                    console.log(`${i + 1}. ${name} - ${r.time}`);
                });
            } else {
                console.log("Error or Object:", JSON.stringify(json));
            }
        } catch (e) { console.error(e.message); }
    });
});
