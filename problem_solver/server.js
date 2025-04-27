const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { join } = require('path');
const app = express();
const port = 3000;

dotenv.config();

app.use(cors());
app.use(express.static(join(__dirname)));

app.use(express.json());

// Your existing routes
app.get("/auth_config.json", (req, res) => {
    res.sendFile(join(__dirname, "auth.config.json"));
});

app.get('/api/get-gemini-key', (req, res) => {
    res.json({ apiKey: process.env.GEMINI_API_KEY });
});


//CHAT GPT MONGO DB CONNECTIVITY 😭😭


// MongoDB setup (if you haven't already)
const { MongoClient } = require('mongodb');

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();
        db = client.db('problemSolver_db'); // ← call your db whatever you want
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

// Your listener
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
