// services/notificationService.js
import Prisma from "../config/db.conf.js";

export const createLowStockNotification = async (product, recipient = null) => {
  const message = `Low stock alert: "${product.name}" only has ${product.quantity} left (minimum: ${product.minimumStock}).`;
  const notification = await Prisma.notification.create({
    data: {
      message,
      type: "low_stock"
    },
  });
  return notification;
};

// For future: Add methods for email/SMS, marking as read, etc.
