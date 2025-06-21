import express from 'express'; 

const router  = express.Router();

router.post('/register', (req, res) => {
    res.send("")
})

router.post('/login',createTransaction)

export default router