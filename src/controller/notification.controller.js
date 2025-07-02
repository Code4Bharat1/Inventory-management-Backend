import prisma from "../config/db.conf.js";

export const getAllNotification = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      include: { product: true }, // remove if not needed
    });
    res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const NotificationRead = async (req, res) => {
  const { id } = req.params;
  const { isRead } = req.body; // Allow dynamic isRead value
  const { shopId } = req.user; // Get shopId from JWT token

  try {
    // Validate inputs
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!id || typeof id !== "string" || id.trim() === "") {
      return res
        .status(400)
        .json({ error: "notificationId is required and must be a non-empty string." });
    }
    if (typeof isRead !== "boolean") {
      return res.status(400).json({ error: "isRead must be a boolean." });
    }

    // Check if the shop exists
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check if the notification exists and is associated with the shop
    const notification = await prisma.notification.findUnique({
      where: { id },
      include: { shop: true }, // Assuming shop relation
    });
    if (!notification || notification.shopId !== shopId) {
      return res
        .status(404)
        .json({ error: "Notification not found or not associated with the shop." });
    }

    // Update the notification
    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead },
    });

    res.status(200).json({
      message: `Notification marked as ${isRead ? "read" : "unread"} successfully!`,
      notification: updatedNotification,
    });
  } catch (error) {
    console.error("Error in NotificationRead:", error);
    if (error.code === "P2025") {
      return res.status(404).json({ error: "Notification not found." });
    }
    res.status(500).json({ error: "Internal server error." });
  }
};
