// services/notificationService.js
import Notification from '../models/notification.model.js';

export const createLowStockNotification = async (product, recipient = null) => {
  const message = `Low stock alert: "${product.name}" only has ${product.quantity} left (minimum: ${product.minimumStock}).`;
  return Notification.create({
    message,
    type: 'low_stock',
    product: product._id,
    recipient, // can be null or a user ID
  });
};

// For future: Add methods for email/SMS, marking as read, etc.
