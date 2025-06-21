import express from 'express'; 

const router  = express.Router();

router.ge('/register', async(req, res) => {
    res.send("register")
})

router.post('/login', async(req, res) => {
    res.send("login")
})
export default router