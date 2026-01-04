const https = require('https');

const target = 'https://api.isuresults.eu/events/2026_USA_0002/competitions/3/results';
const url = `https://saltygold-trials.vercel.app/api/isu-proxy?url=${encodeURIComponent(target)}`;

https.get(url, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            const parsed = parseIsuData(json);

            const fs = require('fs');
            // Write just the array part as JSON
            fs.writeFileSync('women_1000m.json', JSON.stringify(parsed, null, 2));
            console.log("Data saved to women_1000m.json");

        } catch (e) { console.error(e.message); }
    });
});

function parseIsuData(data) {
    let list = Array.isArray(data) ? data : (data.results || data.entries || data.data || []);
    return list.map(item => {
        let name = "Unknown";
        if (item.competitor && item.competitor.skater) {
            const s = item.competitor.skater;
            name = `${s.firstName} ${s.lastName}`;
        } else if (item.competitor) {
            name = item.competitor.fullName || item.competitor.name || name;
        }

        const rawTime = item.time || item.result || item.totalTime || "NT";
        const rank = item.rank || 0;
        return { name: cleanName(name), time: cleanTime(rawTime), rank };
    }).filter(e => e.time !== "NT");
}

function cleanTime(raw) {
    if (!raw || raw === "NT") return "NT";
    let str = String(raw).trim();
    if (str.includes(':')) {
        if (str.includes('.')) {
            const [main, decimals] = str.split('.');
            return `${main}.${decimals.substring(0, 2)}`;
        }
        return str;
    }
    if (!isNaN(parseFloat(str)) && str.includes('.')) {
        let totalSeconds = parseFloat(str);
        if (totalSeconds >= 60) {
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const secondsStr = seconds.toFixed(3);
            const [secMain, secDec] = secondsStr.split('.');
            return `${minutes}:${secMain.padStart(2, '0')}.${(secDec || "00").substring(0, 2)}`;
        } else {
            const [main, decimals] = str.split('.');
            return `${main}.${decimals.substring(0, 2)}`;
        }
    }
    return str;
}

function cleanName(raw) {
    if (!raw) return "Unknown";
    const parts = raw.split(' ');
    if (parts.length >= 2) {
        const allCapsIndex = parts.findIndex(p => p.length >= 2 && p === p.toUpperCase());
        if (allCapsIndex !== -1) {
            const surname = parts.splice(allCapsIndex, 1)[0];
            const formattedSurname = surname.charAt(0) + surname.slice(1).toLowerCase();
            return `${parts.join(' ')} ${formattedSurname}`.trim();
        }
    }
    return raw;
}
