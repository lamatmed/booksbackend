import express from 'express'; 

const router  = express.Router();

router.get('/summary/:userId',getSummurByUserId)
router.get('/:userId',getTransactionsByUserId)
router.delete('/:id',deleteTransaction)
router.post('/',createTransaction)

export default router