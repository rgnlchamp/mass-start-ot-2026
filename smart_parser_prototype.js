
// Prototype for a "Smart Paste" parser
// This would allow users to use their phone's built-in OCR (Copy Text from Image)
// and simply paste the chaos into a box, which we then clean up.

const sampleInput = `
1 Erin Jackson USA 37.60
2 Brittany Bowe 38.04
3. Kimi Goetz (USA) 38.11
4 Sarah Warren 38.50 PB
5. Start Number 42 - McKenzie Browne - 39.00
`;

function parseRawResults(text) {
    const lines = text.split('\n');
    const parsed = [];

    lines.forEach(line => {
        // Clean basic noise
        let clean = line.trim();
        if (!clean) return;

        // Strategy: Look for the essential components
        // 1. Rank (Number at start)
        // 2. Time (XX.XX or X:XX.XX) at end or near end
        // 3. Name (Text in between)

        // Regex to find a time-like pattern (e.g., 37.60, 1:15.00)
        // This regex looks for digits, dot/colon, digits, possibly followed by "PB", "SB", etc.
        const timeMatch = clean.match(/(\d{1,2}[:.])?\d{2}\.\d{2}/);

        if (timeMatch) {
            const time = timeMatch[0];

            // Remove the time from the string to isolate Name + Rank
            let remainder = clean.replace(time, '').replace(/PB|SB|NR|TR/g, '').trim();

            // Extract Rank (Number at start)
            const rankMatch = remainder.match(/^(\d+)[.\-)\s]*/);
            let rank = 0;
            if (rankMatch) {
                rank = parseInt(rankMatch[1]);
                // Remove rank from remainder
                remainder = remainder.replace(rankMatch[0], '').trim();
            }

            // What's left is likely the name + maybe Nation
            let name = remainder
                .replace(/^[-–]\s*/, '') // Remove leading hyphens
                .replace(/\(USA\)|\bUSA\b/g, '') // Remove Nation
                .replace(/\s+/g, ' ') // Collapse spaces
                .trim();

            if (name && time) {
                parsed.push({ rank, name, time });
            }
        }
    });

    return parsed;
}

// console.log(parseRawResults(sampleInput));
