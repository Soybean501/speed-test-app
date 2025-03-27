// script.js

const startButton = document.getElementById('startButton');
const statusDiv = document.getElementById('status');
const pingResultEl = document.getElementById('pingResult');
const downloadResultEl = document.getElementById('downloadResult');
const uploadResultEl = document.getElementById('uploadResult');

// --- Configuration ---
// Adjust these URLs if your backend runs elsewhere
// For local testing:
const backendUrl = 'https://speed-test-app-gz8i.onrender.com/api';
// For deployment (replace with your Render URL later):
// const backendUrl = 'https://your-render-app-name.onrender.com/api'; // Example: https://my-speed-tester.onrender.com/api

const downloadFile = '10MB.bin'; // The file to use for download test
const downloadFileSizeB = 10 * 1024 * 1024; // Size of the download file in Bytes (10MB)
const uploadDataSizeB = 5 * 1024 * 1024; // Size of data to generate for upload in Bytes (5MB)


// --- Helper Functions ---
function updateStatus(message, state = '') {
    statusDiv.textContent = message;
    statusDiv.className = state; // e.g., 'testing', 'complete', 'error'
}

function resetResults() {
    pingResultEl.textContent = '-';
    downloadResultEl.textContent = '-';
    uploadResultEl.textContent = '-';
    updateStatus('');
}

function formatSpeed(speedBps) {
    if (speedBps === null || isNaN(speedBps)) return '-';
    // Convert Bytes per second to Megabits per second
    const speedMbps = (speedBps * 8) / (1024 * 1024);
    return speedMbps.toFixed(2); // Format to 2 decimal places
}

// --- Test Functions ---

// 1. Measure Latency (Ping)
async function measureLatency() {
    updateStatus('Testing latency...', 'testing');
    const startTime = performance.now();
    try {
        // Add random query param to prevent caching - CORRECTED URL BELOW
        const response = await fetch(`${backendUrl}/ping?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
        const latency = performance.now() - startTime;
        pingResultEl.textContent = latency.toFixed(0);
        return latency; // Return latency for potential further use
    } catch (error) {
        console.error('Latency test failed:', error);
        pingResultEl.textContent = 'Error';
        updateStatus(`Latency test failed: ${error.message}`, 'error');
        throw error; // Stop the test sequence on failure
    }
}

// 2. Measure Download Speed
async function measureDownloadSpeed() {
    updateStatus('Testing download speed...', 'testing');
    const startTime = performance.now();
    try {
         // Add random query param to prevent caching - CORRECTED URL BELOW
        const response = await fetch(`${backendUrl}/download/${downloadFile}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        const data = await response.arrayBuffer(); // Get data as ArrayBuffer
        const endTime = performance.now();

        if (data.byteLength !== downloadFileSizeB) {
             // CORRECTED LOG MESSAGE BELOW
            console.warn(`Warning: Downloaded size (${data.byteLength}) doesn't match expected size (${downloadFileSizeB}). Speed might be inaccurate.`);
            // Optionally, adjust calculation based on actual downloaded size if preferred
            // For simplicity, we still use the expected size for calculation.
        }

        const durationSeconds = (endTime - startTime) / 1000;
        if (durationSeconds <= 0) {
             // Handle edge case where duration is zero or negative
             console.error("Download duration too short or invalid:", durationSeconds);
             throw new Error("Download duration invalid.");
        }


        const speedBps = downloadFileSizeB / durationSeconds; // Bytes per second
        downloadResultEl.textContent = formatSpeed(speedBps);
        return speedBps;

    } catch (error) {
        console.error('Download test failed:', error);
        downloadResultEl.textContent = 'Error';
        updateStatus(`Download test failed: ${error.message}`, 'error');
        throw error; // Stop the test sequence
    }
}

// 3. Measure Upload Speed
async function measureUploadSpeed() {
    updateStatus('Testing upload speed...', 'testing');

    // Generate random data to upload
    const data = new Blob([new Uint8Array(uploadDataSizeB).map(() => Math.random() * 255)]);

    const startTime = performance.now();
    try {
         // CORRECTED URL BELOW
        const response = await fetch(`${backendUrl}/upload?t=${Date.now()}`, {
            method: 'POST',
            headers: {
                // Content-Type might not be strictly necessary with express.raw('*/*')
                // 'Content-Type': 'application/octet-stream'
            },
            body: data,
            cache: 'no-store'
        });

        if (!response.ok) throw new Error(`Server error: ${response.status}`);

        // Wait for server acknowledgement before stopping timer
        await response.text(); // Make sure response body is consumed if any
        const endTime = performance.now();

        const durationSeconds = (endTime - startTime) / 1000;
         if (durationSeconds <= 0) {
             // Handle edge case where duration is zero or negative
             console.error("Upload duration too short or invalid:", durationSeconds);
             throw new Error("Upload duration invalid.");
         }

        const speedBps = uploadDataSizeB / durationSeconds; // Bytes per second
        uploadResultEl.textContent = formatSpeed(speedBps);
        return speedBps;

    } catch (error) {
        console.error('Upload test failed:', error);
        uploadResultEl.textContent = 'Error';
        updateStatus(`Upload test failed: ${error.message}`, 'error');
        throw error; // Stop the test sequence
    }
}


// --- Event Listener ---
startButton.addEventListener('click', async () => {
    resetResults();
    startButton.disabled = true;
    updateStatus('Starting test...', 'testing');

    try {
        await measureLatency();
        await measureDownloadSpeed();
        await measureUploadSpeed();
        updateStatus('Test complete!', 'complete');
    } catch (error) {
        // Error status is already set by the failing function
        console.error('Speed test sequence failed:', error);
        // Ensure a generic failure message if specific one wasn't set
        if (!statusDiv.textContent.includes('failed')) {
             updateStatus('Test sequence failed.', 'error'); // Provide a fallback error message
        }
    } finally {
        startButton.disabled = false; // Re-enable button regardless of success/failure
    }
});