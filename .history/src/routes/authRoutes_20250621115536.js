import express from 'express'; 

const router  = express.Router();

router.get('/summary/:userId',getSummurByUserId)

router.post('/',createTransaction)

export default router