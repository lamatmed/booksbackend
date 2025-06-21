import express from 'express';
const app = express();
app.listen(3000, (req, res) => {
    res.status(200).json({ status: "ok" })
})