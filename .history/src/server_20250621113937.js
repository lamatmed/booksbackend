import express from 'express';
const app = express();
app.listen(3000, () => {
    console.log("Le serveur fonctionne sur le port 3000")
})