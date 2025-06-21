import express from 'express';
import authRoutes from './routes'
import  'dotenv/config'
const app = express();
const Port = process.env.PORT || 3000;

app.listen(Port, () => {
    console.log("Le serveur fonctionne sur le port",Port)
})


app.use("/api/auth",authRoutes)