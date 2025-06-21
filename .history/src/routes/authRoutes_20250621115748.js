import express from 'express'; 

const router  = express.Router();

router.post('/register', (req, res) => {
    res.send("register")
})

router.post('/login',createTransaction)

export default router