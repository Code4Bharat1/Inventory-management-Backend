import express from 'express';
import { getInventoryDashboardSummary } from '../controller/dashboard.controller.js';

const router = express.Router();

router.get('/inventoryDashboard', getInventoryDashboardSummary);

export default router;