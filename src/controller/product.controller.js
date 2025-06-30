import Prisma from "../config/db.conf.js";
import { createLowStockNotification } from "../services/notificationService.js";
import multer from "multer";
import XLSX from "xlsx";
import { v4 as uuidv4 } from "uuid";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel and CSV files are allowed"), false);
    }
  },
});

// Bulk upload products from Excel/CSV
export const bulkUploadProducts = [
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Parse the uploaded file
      const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Validate and prepare data for insertion
      const products = data.map((row) => {
        if (!row.name || !row.quantity || !row.price) {
          throw new Error(
            `Invalid data: Missing required fields for product '${
              row.name || "unknown"
            }'`
          );
        }

        const quantity = Number(row.quantity);
        const price = Number(row.price);
        const minimumStock = row.minimumStock ? Number(row.minimumStock) : 0;

        if (isNaN(quantity) || isNaN(price)) {
          throw new Error(
            `Invalid data: Quantity or price is not a number for product '${row.name}'`
          );
        }

        return {
          id: uuidv4(),
          name: row.name,
          category: row.category || null,
          description: row.description || null,
          quantity,
          price,
          imageUrl: row.imageUrl || null,
          note: row.note || null,
          minimumStock,
        };
      });

      // Insert products in bulk using Prisma
      await Prisma.product.createMany({
        data: products,
        skipDuplicates: true,
      });

      // Retrieve the created products to get their IDs
      const createdProducts = await Prisma.product.findMany({
        where: {
          id: { in: products.map((p) => p.id) },
        },
      });

      // // Check for low stock and create notifications
      // const lowStockProducts = createdProducts.filter(
      //   (p) => p.quantity < (p.minimumStock || 0)
      // );
      // for (const product of lowStockProducts) {
      //   await createLowStockNotification(product);
      // }
      // just want to insert product so dont need of notification

      res.status(201).json({
        message: "Products uploaded successfully",
        count: createdProducts.length,
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
];

// Existing controller functions (unchanged)
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      description,
      quantity,
      price,
      imageUrl,
      note,
      minimumStock,
      sku,
    } = req.body;

    // Validation
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "Product name is required" });
    }

    const parsedQuantity = parseInt(quantity);
    if (isNaN(parsedQuantity)) {
      return res.status(400).json({ error: "Quantity must be a valid number" });
    }

    const parsedPrice = price ? parseFloat(price) : null;
    if (price && isNaN(parsedPrice)) {
      return res.status(400).json({ error: "Price must be a valid number" });
    }

    const parsedMinStock = minimumStock ? parseInt(minimumStock) : 0;

    // Auto-generate SKU if not provided
    const generatedSku =
      sku ||
      `SKU-${Date.now().toString().slice(-6)}-${Math.floor(
        1000 + Math.random() * 9000
      )}`;

    const newProduct = await Prisma.product.create({
      data: {
        name,
        quantity: parsedQuantity,
        price: parsedPrice,
        category,
        description,
        imageUrl,
        note,
        minimumStock: parsedMinStock,
        sku: generatedSku,
      },
    });

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const filters = {};

    if (req.query.search) {
      const search = req.query.search.trim();
      filters.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.minPrice || req.query.maxPrice) {
      filters.price = {};
      if (req.query.minPrice) filters.price.gte = Number(req.query.minPrice);
      if (req.query.maxPrice) filters.price.lte = Number(req.query.maxPrice);
    }

    if (req.query.stockStatus) {
      if (req.query.stockStatus === "in") {
        filters.quantity = { gt: 0 };
      } else if (req.query.stockStatus === "out") {
        filters.quantity = 0;
      }
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    let products = await Prisma.product.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    if (req.query.stockStatus === "low") {
      products = products.filter((p) => p.quantity < (p.minimumStock ?? 0));
    }

    // Add status
    products = products.map((p) => {
      let status = "In Stock";
      if (p.quantity === 0) {
        status = "Out of Stock";
      } else if (p.minimumStock != null && p.quantity < p.minimumStock) {
        status = "Low Stock";
      }
      return { ...p, status };
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

export const updateProduct = async (req, res) => {
  try {
    const product = await Prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        updatedAt: new Date(),
      },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

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

export const updateProductQuantity = async (req, res) => {
  const { id } = req.params;
  const { quantity, action, note } = req.body;

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

    const oldQuantity = product.quantity;

    await Prisma.product.update({
      where: { id },
      data: { quantity },
    });

    if (product.quantity < (product.minimumStock || 0)) {
      await createLowStockNotification(product);
    }

    await Prisma.stockHistory.create({
      data: {
        productId: product.id,
        oldQuantity,
        newQuantity: quantity,
        changeType: action || "manual_update",
        note: note || "",
      },
    });

    res.json({
      message: "Product quantity updated.",
      product: { ...product, quantity },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
