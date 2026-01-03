const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files from current directory
app.use(express.static(__dirname));

// Save Results Endpoint (Writes to manual_results.js)
app.post('/api/save-results', (req, res) => {
    const { gender, distance, results } = req.body;

    if (!gender || !distance || !results) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Save] Received request to save ${gender} ${distance}`);

    const fs = require('fs');
    const filePath = path.join(__dirname, 'manual_results.js');

    try {
        // 1. Read existing file
        let content = fs.readFileSync(filePath, 'utf8');

        // 2. Parse the existing object out of the file string
        // We look for "const MANUAL_RESULTS = {" and the closing "};"
        // This is a bit hacky but works if the file structure is maintained.
        // A safer way is to read the file, locate the specific keys, and replace just that block.

        // Regex to find the specific gender/distance block would be complex.
        // EASIER STRATEGY: Re-construct the whole file content based on the incoming data + reading current state? 
        // No, we can't easily "read" the JS file as JSON.

        // BETTER STRATEGY: Use regex to replace the specific array for this race.
        // Pattern: look for `        '3000m': [` down to `        ]` inside `    women: {`

        // Let's try to construct a new file content purely from data if possible? 
        // No, we might lose other manual entries.

        // HYBRID APPROACH: Load the file, eval it to get the object (dangerous but we are local dev), update object, write back.
        // actually `eval` in node is fine for a local dev tool.

        // Let's strip the "const MANUAL_RESULTS = " and "window.MANUAL_RESULTS..." parts to get raw JSON-like obj
        const startMarker = 'const MANUAL_RESULTS = ';
        const endMarker = 'window.MANUAL_RESULTS = MANUAL_RESULTS;'; // Standard footer

        let objectString = content.substring(content.indexOf(startMarker) + startMarker.length);
        // Remove the footer part roughly
        // Ideally we just match the first `{` to the last `};`

        // actually, let's just use a Regex Replacement for the specific key if it exists.
        // If it doesn't exist, we might fail. But `manual_results.js` has the structure initialized.

        // let's try a simpler approach:
        // We will maintain the file as a JSON-like structure that we can rewrite completely.
        // We can just Read the current file, iterate line by line to build a state? No.

        // OK, for robustness, since we are defining the "Source of Truth" now:
        // We will read the file. We will try to execute it in a sandbox to get the current object.
        const vm = require('vm');
        const sandbox = { window: {} };
        vm.createContext(sandbox);
        vm.runInContext(content, sandbox);

        const currentData = sandbox.MANUAL_RESULTS;

        // Update the data
        if (!currentData[gender]) currentData[gender] = {};

        // Setup the entry with explicit status
        const statusToSave = req.body.status || 'published';
        currentData[gender][distance] = {
            results: results,
            status: statusToSave
        };

        // Re-serialize strictly
        const newContent = `// EMERGENCY MANUAL RESULTS
// This file overrides any live data to ensure results are displayed.
const MANUAL_RESULTS = ${JSON.stringify(currentData, null, 4)};

window.MANUAL_RESULTS = MANUAL_RESULTS;
`;

        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`[Save] Successfully wrote to ${filePath}`);

        res.json({ success: true, message: 'File updated successfully' });

    } catch (e) {
        console.error(`[Save Error]`, e);
        res.status(500).json({ error: e.message });
    }
});

// ISU Results Proxy Endpoint
app.get('/api/isu-proxy', async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'Missing URL parameter' });

    console.log(`[Proxy] Fetching: ${url}`);

    try {
        const response = await axios.get(url, {
            headers: {
                // Mimic a browser to avoid blocking
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://live.isuresults.eu/'
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error(`[Proxy Error]: ${error.message}`);
        // Return 500 but also the error details useful for debugging
        res.status(500).json({
            error: 'Failed to fetch external data',
            details: error.message,
            status: error.response?.status
        });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`\n=======================================================`);
    console.log(`🚀 LIVE TRACKER SERVER STARTED`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Local: http://localhost:${PORT}`);
    console.log(`   Proxy Active: /api/isu-proxy`);
    console.log(`=======================================================\n`);
});
