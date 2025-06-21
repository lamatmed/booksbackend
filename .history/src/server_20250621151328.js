import express from 'express';
import authRoutes from './routes/authRoutes.js'
import  'dotenv/config'
import { connectDB } from './lib/db.js';
const app = express();
const Port = process.env.PORT || 3000;
app.use(express.json());


app.use("/api/auth", authRoutes)
app.use("/api/books", bookRoute)
app.listen(Port, () => {
    console.log("Le serveur fonctionne sur le port", Port)
    connectDB();
})


