import axios from 'axios';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || '';
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || '';
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET || '';

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
  throw new Error('Auth0 environment variables are not properly defined.');
}

// Login using Password Grant Flow
export const login = async (username: string, password: string) => {
  try {
    const response = await axios.post(`https://${AUTH0_DOMAIN}/oauth/token`, {
      grant_type: 'password',
      username,
      password,
      client_id: AUTH0_CLIENT_ID,
      client_secret: AUTH0_CLIENT_SECRET,
    });

    return response.data; // Contains access_token, id_token, etc.
  } catch (error: any) {
    console.error('Login failed:', error.response?.data || error.message);
    throw new Error('Login failed');
  }
};

// Validate Token (Decode and Verify)
export const validateToken = (token: string) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      throw new Error('Invalid token');
    }
    return decoded;
  } catch (error: any) {
    console.error('Token validation failed:', error.message);
    throw new Error('Token validation failed');
  }
};

// Logout (Placeholder for now)
export const logout = () => {
  console.log('Logout logic not implemented yet.');
};