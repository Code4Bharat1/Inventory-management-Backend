import Prisma from "../config/db.conf.js"


// get total number of product , total number of out-stock product and total number of low-stock product
export const getInventoryDashboardSummary = async (req, res) => {
  try {
    // 1. Total products
    const totalProducts = await Prisma.product.count();

    // 2. Out of stock products
    const outOfStockProducts = await Prisma.product.count({
      where:{
        quantity : 0
      }
    })

    // 3. Low stock products
    const lowStockProducts = await Prisma.product.count({
      where:{
        quantity: {
          lt: Prisma.product.fields.minimumStock 
        }
      }
    })

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