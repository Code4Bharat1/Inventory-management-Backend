import Prisma from "../config/db.conf.js";
import { createLowStockNotification } from "../services/notificationService.js";

export const createProduct = async (req, res) => {
  try {
    // Destructure only allowed fields from req.body
    const {
      name,
      category,
      description,
      quantity,
      price,
      imageUrl,
      note,
      minimumStock,
    } = req.body;

    const newProduct = await Prisma.Product.create({
      data: {
        name,
        quantity,
        price,
        category,
        description,
        imageUrl,
        note,
        minimumStock,
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    // Build filters based on query params
    const filters = {};

    // Keyword search (name, category, description)
    if (req.query.search) {
      const search = req.query.search.trim();
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Filter by category
    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      filters.price = {};
      if (req.query.minPrice) filters.price.gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filters.price.lte = Number(req.query.maxPrice);
    }

    // Filter by stock status
    if (req.query.stockStatus) {
      if (req.query.stockStatus === "in") {
        filters.quantity = { gt: 0 };
      } else if (req.query.stockStatus === "out") {
        filters.quantity = 0;
      } else if (req.query.stockStatus === "low") {
        // Prisma doesn't support $expr; handle low stock in-memory after query
        // We'll filter 'low' later.
      }
    }

    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Query products from Prisma
    let products = await Prisma.product.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // If stockStatus === 'low', filter in-memory
    if (req.query.stockStatus === "low") {
      products = products.filter((p) => p.quantity < (p.minimumStock ?? 0));
    }

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Prisma.product.findUnique({
      where: { id: req.params.id },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product by ID
export const updateProduct = async (req, res) => {
  try {
    const product = await Prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...req.body, // Spread operator to update all fields
        updatedAt: new Date(), // Update timestamp
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete product by ID
export const deleteProduct = async (req, res) => {
  try {
    const product = await Prisma.product.delete({
      where: { id: req.params.id },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product quantity
export const updateProductQuantity = async (req, res) => {
  const { id } = req.params;
  const { quantity, action, note } = req.body; // get action and note if provided

  // Input validation
  if (typeof quantity !== "number" || quantity < 0) {
    return res
      .status(400)
      .json({ error: "Quantity must be a non-negative number." });
  }

  try {
    const product = await Prisma.product.findUnique({
      where: { id },
    });
    if (!product) return res.status(404).json({ error: "Product not found." });

    // Store old quantity before updating
    const oldQuantity = product.quantity;

    // Update quantity
    product.quantity = quantity;
    await product.save();

    // Trigger low stock notification if needed
    if (product.quantity < product.minimumStock) {
      await createLowStockNotification(product);
    }

    // Log stock history
    await Prisma.stockHistory.create({
      data: {
        productId: product.id,
        oldQuantity,
        newQuantity: product.quantity,
        changeType: action || "manual_update", // Default to manual update if no action provided
        note: note || "", // Use provided note or empty string
      },
    });

    res.json({
      message: "Product quantity updated.",
      product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
