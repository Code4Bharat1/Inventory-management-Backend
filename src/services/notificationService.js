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


export const getOrderNotifications = async (ownerId) => {
  if (!ownerId) {
    throw new Error('Missing ownerId');
  }

  try {
    // Find shops owned by the user
    const shops = await prisma.shop.findMany({
      where: { ownerId: String(ownerId) },
      select: { id: true },
    });

    const shopIds = shops.map((shop) => shop.id);

    // Fetch order notifications for those shops
    const notifications = await prisma.orderNotification.findMany({
      where: { shopId: { in: shopIds } },
      include: {
        order: {
          include: {
            orderItems: { include: { product: true } },
            user: true,
          },
        },
        shop: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return notifications;
  } catch (error) {
    throw new Error(`Error fetching notifications: ${error.message}`);
  }
};