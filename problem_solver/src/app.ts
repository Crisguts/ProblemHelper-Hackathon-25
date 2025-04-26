import express from 'express';
import { connectToDatabase } from './database/mongodb';
import { setupAuth } from './auth/auth0';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON
app.use(express.json());

// Initialize database connection
connectToDatabase();

// Setup authentication middleware
setupAuth(app);

// Define routes (to be implemented)
app.get('/', (req, res) => {
    res.send('Welcome to the Auth0, MongoDB, and Gemini AI app!');
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});