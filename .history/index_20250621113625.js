import express from 'express';
const app = express();
app.listen("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})