import { Router } from 'express';
import { list, create, update, remove } from '../controllers/category.controller.js';
import { validate } from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '../validators/index.js';

const router = Router();
router.get('/', list);
router.post('/', validate(createCategorySchema), create);
router.patch('/:id', validate(updateCategorySchema), update);
router.delete('/:id', remove);
export default router;
