import app from './app.js'; import {connectDB} from './config/db.js'; import {validateEnv} from './config/env.js';
validateEnv();await connectDB();const port=process.env.PORT||5000;app.listen(port,()=>console.log(`FleetSphere API listening on ${port}`));
