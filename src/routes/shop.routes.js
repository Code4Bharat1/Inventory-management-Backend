//shop.route.js
import express from 'express';
import {
  createShop,
  addItemsToBucket,
  removeItemsFromBucket,
} from '../controller/shop.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// SHOP ROUTES
router.post('/createShop', protect, createShop);

// BUCKET ROUTES
router.post('/bucket/add', protect, addItemsToBucket);
router.delete('/bucket/remove', protect, removeItemsFromBucket);


export default router;
