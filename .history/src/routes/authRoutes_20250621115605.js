import express from 'express'; 

const router  = express.Router();

router.post('/register',getSummurByUserId)

router.post('/',createTransaction)

export default router