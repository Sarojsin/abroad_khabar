const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Serve static assets (HTML, CSS, JS, images, etc.)
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

app.use(express.static(__dirname));

// Serve HTML partials under /pages directly
// Serve HTML partials under /pages directly
app.get('/pages/*', (req, res) => {
    let filePath = path.join(__dirname, req.path);

    // Try sending the file
    res.sendFile(filePath, (err) => {
        if (err) {
            // If failed (likely ENOENT), try appending .html
            if (err.code === 'ENOENT' && !filePath.endsWith('.html')) {
                res.sendFile(filePath + '.html', (err2) => {
                    if (err2) {
                        console.error('Error sending file:', req.path, err2.message);
                        res.status(404).send('Not Found');
                    }
                });
            } else {
                console.error('Error sending file:', req.path, err.message);
                res.status(err.status || 500).end();
            }
        }
    });
});

// Fallback for SPA routes – serve index.html for any unknown path that is not a real file
app.get('*', (req, res) => {
    const possiblePath = path.join(__dirname, req.path);
    fs.access(possiblePath, fs.constants.F_OK, (err) => {
        if (!err) {
            // If the file actually exists (e.g., an asset), serve it
            res.sendFile(possiblePath);
        } else {
            // Otherwise serve the SPA entry point
            res.sendFile(path.join(__dirname, 'index.html'));
        }
    });
});

app.listen(PORT, () => {
    console.log(`Frontend server running at http://localhost:${PORT}`);
});
