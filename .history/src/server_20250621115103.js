import express from 'express';
import  'dotenv/config'
const app = express();
const Port = process.env.PORT ;

app.listen(Port, () => {
    console.log("Le serveur fonctionne sur le port",Port)
})