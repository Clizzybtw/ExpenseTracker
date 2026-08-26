import { Router } from 'express';
import { list, getOne, progress, create, update, remove } from '../controllers/budget.controller.js';
import { validate } from '../middleware/validate.js';
import { createBudgetSchema, updateBudgetSchema } from '../validators/index.js';

const router = Router();
router.get('/', list);
router.post('/', validate(createBudgetSchema), create);
router.get('/:id', getOne);
router.get('/:id/progress', progress);
router.patch('/:id', validate(updateBudgetSchema), update);
router.delete('/:id', remove);
export default router;
