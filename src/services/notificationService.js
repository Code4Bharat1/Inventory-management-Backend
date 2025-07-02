import prisma from "../config/db.conf.js";
export const createLowStockNotification = async (product, shopId, recipient = null) => {
  if (!shopId) {
    throw new Error("shopId is required to create a notification.");
  }

  const message = `Low stock alert: "${product.name}" only has ${product.quantity} left (minimum: ${product.minimumStock}).`;

  const notification = await prisma.notification.create({
    data: {
      message,
      type: "low_stock",
      product: {
        connect: { id: product.id },
      },
      shop: {
        connect: { id: shopId },
      },
      // optionally add recipientId if your schema supports recipients
    },
  });

  return notification;
};
