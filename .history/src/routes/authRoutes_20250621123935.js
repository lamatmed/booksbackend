import express from 'express'; 

const router  = express.Router();

router.post('/register', async(req, res) => {
   
})

router.post('/login', async(req, res) => {
    res.send("login")
})
export default router