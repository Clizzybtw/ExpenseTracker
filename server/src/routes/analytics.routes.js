import { Router } from 'express';
import { summary, byCategory, trend, compare, activeBudget } from '../controllers/analytics.controller.js';
import { validate } from '../middleware/validate.js';
import { rangeSchema, trendSchema, compareSchema } from '../validators/index.js';

const router = Router();
router.get('/summary', validate(rangeSchema, 'query'), summary);
router.get('/by-category', validate(rangeSchema, 'query'), byCategory);
router.get('/trend', validate(trendSchema, 'query'), trend);
router.get('/compare', validate(compareSchema, 'query'), compare);
router.get('/active-budget', activeBudget);
export default router;
