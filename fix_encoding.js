// Script to clean up corrupted emoji characters in app.js
const fs = require('fs');

let content = fs.readFileSync('app.js', 'utf8');

// List of corrupted emoji patterns to remove/replace with simple text
const replacements = [
    // Status emojis - replace with simple text or nothing
    [/[âŒðŸŒŸâœ…âš ï¸â„¹ï¸ðŸ¡€ðŸ'👀🏠🟦🟥👥🦅📖✓⚠️✅❌🌟ℹ️]+\s*/g, ''],
    // Any remaining multi-byte garbage characters that look like mojibake
    [/[Ã¢Â€Â™Ã¢Â˜â€ℹ️âšï¸âœ…ðŸŒŸâŒ]+/g, ''],
    // Clean up double spaces
    [/  +/g, ' '],
];

for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
}

fs.writeFileSync('app.js', content, 'utf8');
console.log('Cleanup complete!');
