import express from 'express';
import  'dotenv/config'
const app = express();
const Port = process.env.PORT;
const
app.listen(3000, () => {
    console.log("Le serveur fonctionne sur le port 3000")
})