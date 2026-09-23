import 'dotenv/config';
const required=['MONGO_URI','JWT_SECRET','JWT_REFRESH_SECRET','CLIENT_URL'];
export function validateEnv(){if(process.env.NODE_ENV==='production'){for(const k of required)if(!process.env[k])throw new Error(`Missing ${k}`)}}
