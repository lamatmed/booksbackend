import express from 'express';
import  'dotenv/config'
const app = express();
const Port = process.env.PORT;
console.log({Port})
app.listen(Port, () => {
    console.log("Le serveur fonctionne sur le port 3000")
})