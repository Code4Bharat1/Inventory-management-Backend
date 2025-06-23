// routes/shopRoutes.js
import express from 'express';
import { createShop } from '../controller/shop.controller.js';

const router = express.Router();

// Create a shop (only for authenticated users)
router.post('/createShop', createShop);

export default router;
