import express from 'express';
import dotenv from 'dotenv'
const app = express();
const Port = process.env.PORT || 3000
app.listen(3000, () => {
    console.log("Le serveur fonctionne sur le port 3000")
})