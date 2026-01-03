const https = require('https');

// Check Schedule for Men's 5000m
const url = 'https://saltygold-trials.vercel.app/api/isu-proxy?url=https://api.isuresults.eu/events/2026_USA_0002/schedule';

console.log("Checking Men's 5000m connection...");

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const races = json.competitions || json;

            // Look for Men's 5000m
            const men5k = races.find(r => {
                const t = (r.title || r.name || "").toLowerCase();
                return t.includes('5000') && t.includes('men');
            });

            if (men5k) {
                const idToUse = men5k.identifier || men5k.id;
                console.log(`✅ FOUND Men's 5000m!`);
                console.log(`   - Global ID: ${men5k.id}`);
                console.log(`   - Target ID: ${men5k.identifier} (The generic ID we need)`);
                console.log(`   - Status: ${men5k.status || 'Scheduled'}`);
                console.log(`   - Connection is READY.`);
            } else {
                console.log("❌ Could not find Men's 5000m in schedule.");
            }

        } catch (e) { console.error(e.message); }
    });
});
