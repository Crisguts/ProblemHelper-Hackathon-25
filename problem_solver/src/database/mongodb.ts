import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('MongoDB URI is not defined in the environment variables.');
}
const client = new MongoClient(uri);

export const connectToDatabase = async () => {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        throw error;
    }
};

export const getDatabase = (dbName: string) => {
    return client.db(dbName);
};

export const closeDatabaseConnection = async () => {
    await client.close();
    console.log('MongoDB connection closed');
};