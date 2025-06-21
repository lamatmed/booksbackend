import express from 'express'; 

const router  = express.Router();

router.post('/summary/:userId',getSummurByUserId)

router.post('/',createTransaction)

export default router