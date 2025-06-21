import express from 'express';
const app = express();
const Port = process.env.PORT || 5001
app.listen(3000, () => {
    console.log("Le serveur fonctionne sur le port 3000")
})