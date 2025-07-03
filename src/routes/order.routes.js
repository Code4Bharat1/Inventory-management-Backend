import express from 'express';
import {
  // getOrderNotifications,
  respondToOrderNotification,
} from '../controller/order.controller.js';

const router = express.Router();

// router.get('/', getOrderNotifications); // ?ownerId=...
router.post('/:id/respond', respondToOrderNotification); // Accept/Reject

export default router;