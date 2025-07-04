import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /notifications?ownerId=abc123
export const getAllNotifications = async (req, res) => {
  const ownerId = req.user?.userId;

  if (!ownerId) {
    return res.status(400).json({ error: 'Missing ownerId' });
  }

  try {
    // 1️⃣ Find all shops owned by the user
    const shops = await prisma.shop.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });

    const shopIds = shops.map(shop => shop.id);

    if (shopIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No shops found for this user.",
        count: 0,
        data: [],
      });
    }

    // 2️⃣ Fetch Notifications for these shops
    const notifications = await prisma.notification.findMany({
      where: { shopId: { in: shopIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            price: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedNotifications = notifications.map(notif => ({
      id: notif.id,
      type: notif.type,
      message: notif.message,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
      updatedAt: notif.updatedAt,
      source: 'notification',
      product: notif.product,
      shop: notif.shop,
    }));

    // 3️⃣ Fetch OrderNotifications for these shops
    const orderNotifications = await prisma.orderNotification.findMany({
      where: { shopId: { in: shopIds } },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
          },
        },
        order: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            orderItems: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrderNotifications = orderNotifications.map(notif => ({
      id: notif.id,
      status: notif.status,
      message: notif.message ?? `Order update for ${notif.order?.id ?? 'order'}`,
      createdAt: notif.createdAt,
      updatedAt: notif.updatedAt,
      source: 'orderNotification',
      shop: notif.shop,
      order: {
        id: notif.order.id,
        status: notif.order.status,
        totalAmount: notif.order.totalAmount,
        createdAt: notif.order.createdAt,
        user: notif.order.user,
        orderItems: notif.order.orderItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          product: item.product,
        })),
      },
    }));

    // 4️⃣ Merge and sort by createdAt descending
    const allNotifications = [...formattedNotifications, ...formattedOrderNotifications].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.status(200).json({
      success: true,
      count: allNotifications.length,
      data: allNotifications,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching notifications',
      details: error.message,
    });
  }
};


// POST /notifications/:id/respond
// POST /notifications/respond
export const respondToOrderNotification = async (req, res) => {
  const { status, message, orderId } = req.body;

  console.log(orderId);

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use ACCEPTED or REJECTED.' });
  }

  try {
    // 1️⃣ Find the OrderNotification using `orderId`
    const notification = await prisma.orderNotification.findFirst({
      where: { orderId },
    });

    if (!notification) {
      return res.status(404).json({ error: 'OrderNotification not found for the provided orderId.' });
    }

    // 2️⃣ Update using its unique `id`
    const updatedNotification = await prisma.orderNotification.update({
      where: { id: notification.id },
      data: {
        status,
        message,
        updatedAt: new Date(),
      },
    });

    // 3️⃣ Update the linked Order's status
    await prisma.order.update({
      where: { id: updatedNotification.orderId },
      data: { status },
    });

    res.json({
      message: `Order ${status.toLowerCase()} successfully.`,
      data: updatedNotification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: 'Error responding to notification',
      details: error.message,
    });
  }
};

