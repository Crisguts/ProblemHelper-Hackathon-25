//To run this code, run node server.js in the terminal, in the same directory as this file.
// This code is a simple Express server that serves static files, handles CORS, and connects to a MongoDB database.
// It also includes routes for user registration and adding problems to a user's profile.
// It uses dotenv for environment variable management, and MongoDB for data storage.
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { join } = require('path');
const app = express();
const port = 3000;

dotenv.config({ path: join(__dirname, '../.env') });

app.use(cors());
app.use(express.static(join(__dirname)));

app.use(express.json());

app.get("/auth_config.json", (req, res) => {
    res.sendFile(join(__dirname, "../auth.config.json"));
});

app.get('/api/get-gemini-key', (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
});


const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('problemSolver_db');
        console.log('Connected to MongoDB');
    } catch (err) {
        console.error('MongoDB connection error:', err);
    }
}

connectDB(); // <--- connect at startup

// 1. Register User
app.post('/api/register', async (req, res) => {
    const { username, email } = req.body;

    try {
        const existingUser = await db.collection('users').findOne({ email });

        if (!existingUser) {
            await db.collection('users').insertOne({
                username,
                email,
                problems: [],
                skills: []
            });
            res.status(201).json({ message: 'User created!' });
        } else {
            res.status(200).json({ message: 'User already exists' });
        }
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// 2. Add Problem
app.post('/api/problems', async (req, res) => {
    const { email, theme, content } = req.body;

    try {
        const result = await db.collection('users').updateOne(
            { email },
            { $push: { problems: { theme, content } } }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: 'Problem added!' });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error adding problem:', error);
        res.status(500).json({ error: 'Failed to add problem' });
    }
});


// // Logout route
// app.get('/logout', (req, res) => {
//     res.status(200).json({ message: 'Logged out' });
// });

// Listener
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
