import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    message: { type: String, required: true },
    type: { type: String, default: 'low_stock' }, // could be 'low_stock', 'order', 'system', etc.
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, // optional, for product-based notifications
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional, for user-specific notifications
    seen: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
