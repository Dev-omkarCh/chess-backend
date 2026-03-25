import { OAuth2Client } from 'google-auth-library';
// Get these from Google Cloud Console
export const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);