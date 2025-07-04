import express from 'express';
import {
  getAllNotifications,
  respondToOrderNotification,
} from '../controller/order.controller.js';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', authenticateJWT , getAllNotifications); // ?ownerId=...
router.post('/respond', respondToOrderNotification); // Accept/Reject

export default router;