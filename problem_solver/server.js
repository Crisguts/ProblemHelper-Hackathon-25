const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors'); // Import the cors middleware
const { join } = require('path'); // Import the 'path' module
const app = express();
const port = 3000;

dotenv.config();

app.use(cors()); // Enable CORS for all routes

// Serve static assets (index.html, app.js, etc.) directly
app.use(express.static(join(__dirname)));

// Endpoint to serve the config file
app.get("/auth_config.json", (req, res) => {
    res.sendFile(join(__dirname, "auth.config.json"));
});

app.get('/api/get-gemini-key', (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});