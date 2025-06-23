import Product from '../models/product.model.js';

export const getInventoryDashboardSummary = async (req, res) => {
  try {
    // 1. Total products
    const totalProducts = await Product.countDocuments();

    // 2. Out of stock products
    const outOfStockProducts = await Product.countDocuments({ quantity: 0 });

    // 3. Low stock products
    const lowStockProducts = await Product.countDocuments({ $expr: { $lt: ["$quantity", "$minimumStock"] } });

    // 4. Pending orders (optional)
    // Uncomment and update if you have Order model & pending status
    // const orderPendingProducts = await Order.countDocuments({ status: 'pending' });

    res.json({
      totalProducts,
      outOfStockProducts,
      lowStockProducts,
      // orderPendingProducts,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};