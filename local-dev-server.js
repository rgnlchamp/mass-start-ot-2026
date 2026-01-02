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
