import express from 'express'; 

const router  = express.Router();

router.post('/register', asys(req, res) => {
    res.send("register")
})

router.post('/login', (req, res) => {
    res.send("login")
})
export default router