import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /notifications?ownerId=abc123
// export const getOrderNotifications = async (req, res) => {
//   const { ownerId } = req.query;

//   if (!ownerId) {
//     return res.status(400).json({ error: 'Missing ownerId' });
//   }

//   try {
//     // Find shops owned by the user
//     const shops = await prisma.shop.findMany({
//       where: { ownerId: String(ownerId) },
//       select: { id: true },
//     });

//     const shopIds = shops.map((shop) => shop.id);

//     // Fetch order notifications for those shops
//     const notifications = await prisma.orderNotification.findMany({
//       where: { shopId: { in: shopIds } },
//       include: {
//         order: {
//           include: {
//             orderItems: { include: { product: true } },
//             user: true,
//           },
//         },
//         shop: true,
//       },
//       orderBy: { createdAt: 'desc' },
//     });

//     res.json(notifications);
//   } catch (error) {
//     res.status(500).json({ error: 'Error fetching notifications', details: error.message });
//   }
// };

// POST /notifications/:id/respond
export const respondToOrderNotification = async (req, res) => {
  const { id } = req.params;
  const { status, message } = req.body;

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status. Use ACCEPTED or REJECTED.' });
  }

  try {
    // Update the notification
    const updatedNotification = await prisma.orderNotification.update({
      where: { id },
      data: {
        status,
        message,
        updatedAt: new Date(),
      },
    });

    // Optionally update the order status too
    await prisma.order.update({
      where: { id: updatedNotification.orderId },
      data: { status },
    });

    res.json({ message: `Order ${status.toLowerCase()} successfully.`, data: updatedNotification });
  } catch (error) {
    res.status(500).json({ error: 'Error responding to notification', details: error.message });
  }
};
