import { Router } from 'express';
import { list, create, update, remove } from '../controllers/expense.controller.js';
import { validate } from '../middleware/validate.js';
import { listExpensesSchema, createExpenseSchema, updateExpenseSchema } from '../validators/index.js';

const router = Router();
router.get('/', validate(listExpensesSchema, 'query'), list);
router.post('/', validate(createExpenseSchema), create);
router.patch('/:id', validate(updateExpenseSchema), update);
router.delete('/:id', remove);
export default router;
