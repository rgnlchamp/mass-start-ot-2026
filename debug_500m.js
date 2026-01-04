const https = require('https');

const url = 'https://saltygold-trials.vercel.app/api/isu-proxy?url=https://api.isuresults.eu/events/2026_USA_0002/competitions/5/results';

https.get(url, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            console.log("Total Items:", json.length);

            // Check for any item with time
            const withTime = json.find(i => i.time);
            if (withTime) {
                console.log("Found item with 'time' property!");
                console.log(JSON.stringify(withTime, null, 2));
            } else {
                console.log("NO item has 'time' property at root.");

                // Inspect first item deeply
                const first = json[0];
                console.log("First Item Keys:", Object.keys(first));
                if (first.splits) {
                    console.log("Splits found:", JSON.stringify(first.splits, null, 2));
                }
            }
        } catch (e) {
            console.error("Parse Error:", e);
        }
    });
});
