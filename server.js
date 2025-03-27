// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors'); // Import cors

const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port or default to 3000

// --- Middleware ---
// Enable CORS for all origins (simplest setup, restrict in production if needed)
app.use(cors());

// Middleware to parse raw binary data for uploads
// Increase limit as needed, e.g., '100mb' for larger upload tests
app.use('/upload', express.raw({ type: '*/*', limit: '50mb' }));

// --- Static Files ---
// Serve frontend files (HTML, CSS, JS) from a 'public' subfolder
// We will create this folder later
app.use(express.static(path.join(__dirname, 'public')));

// --- API Endpoints ---

// 1. Latency (Ping) Endpoint
app.get('/api/ping', (req, res) => {
    // Simply sends a success status immediately
    res.setHeader('Cache-Control', 'no-store'); // Prevent caching of this endpoint
    res.sendStatus(200);
});

// 2. Download Endpoint
// We need to create the 'download_files' folder and files first
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    // Basic security: Prevent accessing files outside 'download_files'
    if (filename.includes('..')) {
         return res.status(400).send('Invalid filename.');
    }
    const filePath = path.join(__dirname, 'download_files', filename);

    if (fs.existsSync(filePath)) {
         // Important: Disable caching for download test files
         res.setHeader('Cache-Control', 'no-store');
         res.sendFile(filePath);
    } else {
         res.status(404).send('File not found.');
    }
});

app.use('/api/upload', express.raw({
    type: '*/*', // Accept any content type
    limit: '100mb' // Increase limit slightly just in case
}));

// server.js - UPDATED UPLOAD SECTION (Manual Stream Handling)

// REMOVE or COMMENT OUT the express.raw middleware for this route:
// app.use('/api/upload', express.raw({ ... }));

// 3. Upload Endpoint (Manual Data Collection)
app.post('/api/upload', (req, res) => {
    console.log('Upload endpoint hit.');
    console.log('Headers:', req.headers); // Still useful to log headers

    const dataChunks = [];

    // Event listener for incoming data chunks
    req.on('data', chunk => {
        console.log(`Received data chunk of size: ${chunk.length}`);
        dataChunks.push(chunk);
    });

    // Event listener for when the request stream ends
    req.on('end', () => {
        console.log('Request stream ended.');
        try {
            // Concatenate all received chunks into a single Buffer
            const completeBody = Buffer.concat(dataChunks);
            const receivedBytes = completeBody.length;

            console.log(`Total received upload size: ${receivedBytes} bytes`);

            // Now you have the data in 'completeBody' if you needed to process it
            // For the speed test, we just need to know it arrived.

            res.setHeader('Cache-Control', 'no-store');
            res.sendStatus(200); // Send success status

        } catch (error) {
            console.error('Error processing uploaded data:', error);
            res.status(500).send('Error processing upload');
        }
    });

    // Event listener for errors on the request stream
    req.on('error', (err) => {
        console.error('Request stream error:', err);
        res.status(500).send('Upload stream error');
    });
});

// --- Make sure the START SERVER part remains below this ---
// app.listen(...)

// --- Start Server ---
app.listen(port, () => {
    console.log(`Speed test server running at http://localhost:${port}`);
    // Create necessary folders if they don't exist
    if (!fs.existsSync(path.join(__dirname, 'public'))){
        fs.mkdirSync(path.join(__dirname, 'public'));
        console.log("Created 'public' directory.");
    }
    if (!fs.existsSync(path.join(__dirname, 'download_files'))){
        fs.mkdirSync(path.join(__dirname, 'download_files'));
        console.log("Created 'download_files' directory.");
    }
});
