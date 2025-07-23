import express from 'express';
import { getInventoryDashboardSummary } from '../controller/dashboard.controller.js';

const router = express.Router();

router.get('/', getInventoryDashboardSummary); // get total product , out of stock product and low stock product

export default router;