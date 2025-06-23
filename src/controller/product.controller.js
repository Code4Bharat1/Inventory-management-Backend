import Product from "../models/product.model.js";
import { createLowStockNotification } from "../services/notificationService.js";
import { logStockHistory } from "../services/stockHistoryService.js";

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

    // Create a new Product instance
    const product = new Product({
      name: name?.trim(),
      category: category?.trim(),
      description: description?.trim(),
      quantity,
      price,
      imageUrl: imageUrl?.trim(),
      note: note?.trim(),
      minimumStock,
    });

    // Save to MongoDB
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get all products
export const getProducts = async (req, res) => {
  try {
    // Build query object based on query params
    const query = {};

    // Keyword search (name, category, description)
    if (req.query.search) {
      const search = req.query.search.trim();
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Filter by price range
    if (req.query.minPrice || req.query.maxPrice) {
      query.price = {};
      if (req.query.minPrice) query.price.$gte = Number(req.query.minPrice);
      if (req.query.maxPrice) query.price.$lte = Number(req.query.maxPrice);
    }

    // Filter by stock status (in stock, low stock, out of stock)
    if (req.query.stockStatus) {
      if (req.query.stockStatus === 'in') {
        query.quantity = { $gt: 0 };
      } else if (req.query.stockStatus === 'out') {
        query.quantity = 0;
      } else if (req.query.stockStatus === 'low') {
        query.$expr = { $lt: ['$quantity', '$minimumStock'] }; // Mongoose 5.0+ supports $expr
      }
    }

    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(query).skip(skip).limit(limit);

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get a single product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product by ID
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete product by ID
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Update product quantity
export const updateProductQuantity = async (req, res) => {
  const { id } = req.params;
  const { quantity, action, note } = req.body; // get action and note if provided

  // Input validation
  if (typeof quantity !== 'number' || quantity < 0) {
    return res.status(400).json({ error: "Quantity must be a non-negative number." });
  }

  try {
    const product = await Product.findById(id);
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
    await logStockHistory({
      product: product._id,
      oldQuantity,
      newQuantity: quantity,
      action: action || 'manual update',
      user: req.user?._id, // If you have authentication
      note: note || ''
    });

    res.json({
      message: "Product quantity updated.",
      product
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

