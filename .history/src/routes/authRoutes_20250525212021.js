import express from 'express'; 
import { sql } from '../config/db.js';
import { createTransaction, deleteTransaction, getSummurByUserId, getTransactionsByUserId } from '../controller/transactionsController.js';
const router  = express.Router();

router.get('/summary/:userId',getSummurByUserId)
router.get('/:userId',getTransactionsByUserId)
router.delete('/:id',deleteTransaction)
router.post('/',createTransaction)

export default router