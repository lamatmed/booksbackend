import express from 'express';
import authRoutes from './routes/authRoutes.js'
import bookRoutes from './routes/bookRoutes.js'
import 'dotenv/config'
import cors from 'cors';
import { connectDB } from './lib/db.js';
import job from './lib/cron.js';
const app = express();
const Port = process.env.PORT || 3000;
job.start
// Augmenter la limite de taille pour les images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use(cors());
app.use("/api/auth", authRoutes)
app.use("/api/books", bookRoutes)
app.listen(Port, () => {
    console.log("Le serveur fonctionne sur le port", Port)
    connectDB();
})


