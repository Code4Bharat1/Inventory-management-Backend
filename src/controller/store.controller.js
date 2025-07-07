import Prisma from "../config/db.conf.js";
import slugify from "slugify";
import { getOrderNotifications } from "../services/notificationService.js";
//create shop
export const createShop = async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;
    // const owner = req.user._id;

    // ...Check for existing shop/name as before...

    // Generate unique slug
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res
        .status(400)
        .json({ error: "name is required and must be a non-empty string." });
    }

    let baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
    const existingShop = await Prisma.shop.findUnique({
      where: {
        slug: slug,
      },
    });

    if (existingShop) {
      return res
        .status(400)
        .json({ error: "shop with that name already exist" });
    }

    let count = 1;
    while (await Prisma.shop.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${count}`;
      count++;
    }

    const shop = await Prisma.shop.create({
      data: {
        name,
        description,
        logoUrl,
        slug, // Use the generated slug
        // owner, // Uncomment if you have user authentication
      },
    });

    // Use BASE_URL from environment or default to localhost for dev
    const baseUrl = process.env.BASE_URL;
    const shopUrl = `${baseUrl}/shops/${slug}`;

    res.status(201).json({
      message: "Shop created successfully!",
      shop,
      shopUrl,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//edit shop
export const editShop = async (req, res) => {
  try {
    const { shopId } = req.params; // Get shopId from URL params
    const { name, description, logoUrl } = req.body;

    // Validate inputs
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }
    if (name && (typeof name !== "string" || name.trim() === "")) {
      return res
        .status(400)
        .json({ error: "Name, if provided, must be a non-empty string." });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl?.trim();

    // Generate new slug if name is updated
    if (name) {
      let baseSlug = slugify(name, { lower: true, strict: true });
      let slug = baseSlug;
      let count = 1;
      while (
        (await Prisma.shop.findUnique({
          where: { slug },
          select: { id: true }, // Only fetch id to check existence
        })) &&
        slug !== shop.slug // Allow the current shop to keep its slug
      ) {
        slug = `${baseSlug}-${count}`;
        count++;
      }
      updateData.slug = slug;
    }

    // Check for existing shop with the same name (if name is updated)
    if (name && name.trim() !== shop.name) {
      const existingShop = await Prisma.shop.findFirst({
        where: {
          name: name.trim(),
          id: { not: shopId }, // Exclude the current shop
        },
      });
      if (existingShop) {
        return res
          .status(400)
          .json({ error: "A shop with that name already exists." });
      }
    }

    // Update the shop
    const updatedShop = await Prisma.shop.update({
      where: { id: shopId },
      data: updateData,
    });

    // Generate shop URL
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const shopUrl = `${baseUrl}/shops/${updatedShop.slug}`;

    res.status(200).json({
      message: "Shop updated successfully!",
      shop: updatedShop,
      shopUrl,
    });
  } catch (error) {
    console.error("Error in editShop:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//create category
export const createCategory = async (req, res) => {
  try {
    const { shopId } = req.user; // Get req.user from URL params
    const { name, description, imageUrl } = req.body;

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim() === "") {
      return res.status(400).json({
        error: "Category name is required and must be a non-empty string.",
      });
    }
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check for existing category with the same name in the shop
    const existingCategory = await Prisma.category.findFirst({
      where: {
        name: name.trim(),
        shopId: shop.id,
      },
    });
    if (existingCategory) {
      return res.status(400).json({
        error: `Category '${name.trim()}' already exists in this shop.`,
      });
    }

    // Create the category
    const category = await Prisma.category.create({
      data: {
        name: name.trim(),
        description: description?.trim(),
        imageUrl: imageUrl?.trim(),
        shopId: shop.id,
        slug: shop.slug,
      },
    });

    // Generate category URL using shop slug for consistency with other routes
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const categoryUrl = `${baseUrl}/shops/${shop.slug}/categories/${category.id}`;

    res.status(201).json({
      message: "Category created successfully!",
      category,
      categoryUrl,
    });
  } catch (error) {
    console.error("Error in createCategory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get all category
export const getAllCategories = async (req, res) => {
  try {
    const { shopId } = req.user; // Assuming shopId is directly on req.user

    // Validate shopId
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Fetch all categories for the shop
    const categories = await Prisma.category.findMany({
      where: { shopId: shop.id },
      orderBy: { name: "asc" }, // Changed from createdAt to name
    });

    return res.status(200).json({
      message: "Categories fetched successfully.",
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Error in getAllCategories:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};


// Search categories
export const searchCategories = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      search, // Search term for category name
      page = 1, // Pagination: default page 1
      limit = 10, // Pagination: default 10 items per page
    } = req.query;

    // Validate inputs
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return res.status(400).json({
        error: "Shop slug is required and must be a non-empty string.",
      });
    }
    if (search && (typeof search !== "string" || search.trim().length < 2)) {
      return res.status(400).json({
        error: "Search term, if provided, must be at least 2 characters long.",
      });
    }
    if (isNaN(page) || Number(page) < 1) {
      return res.status(400).json({
        error: "page must be a positive integer.",
      });
    }
    if (isNaN(limit) || Number(limit) < 1 || Number(limit) > 100) {
      return res.status(400).json({
        error: "limit must be a positive integer between 1 and 100.",
      });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { slug },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Build query conditions
    const where = {
      shopId: shop.id,
      ...(search
        ? {
            name: {
              contains: search.trim(),
              mode: "insensitive", // Case-insensitive search
            },
          }
        : {}),
    };

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Fetch categories with pagination
    const [categories, totalCount] = await Promise.all([
      Prisma.category.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          slug: true,
        },
        orderBy: { name: "asc" }, // Sort by name for consistency
      }),
      Prisma.category.count({ where }),
    ]);

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Build search summary
    const searchSummary = {
      shop: shop.name,
      filtersApplied: {
        ...(search ? { search: search.trim() } : {}),
      },
    };

    // If no categories are found, return an empty array
    if (categories.length === 0) {
      return res.status(200).json({
        message: "No categories found matching the criteria.",
        categories: [],
        searchSummary,
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
        },
      });
    }

    res.status(200).json({
      message: `${categories.length} category(ies) found.`,
      categories,
      searchSummary,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error in searchCategories:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//edit category
export const editCategory = async (req, res) => {
  try {
    const { shopId } = req.user; // Get shopId and categoryId from URL params
    const { categoryId, name, description, imageUrl } = req.body;

    console.log(categoryId)
    // Validate inputs
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }
    if (
      !categoryId ||
      typeof categoryId !== "string" ||
      categoryId.trim() === ""
    ) {
      return res.status(400).json({
        error: "categoryId is required and must be a non-empty string.",
      });
    }
    if (name && (typeof name !== "string" || name.trim() === "")) {
      return res
        .status(400)
        .json({ error: "Name, if provided, must be a non-empty string." });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { id: shopId },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check if the category exists and is associated with the shop
    const category = await Prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop: true },
    });
    if (!category || category.shopId !== shopId) {
      return res
        .status(404)
        .json({ error: "Category not found or not associated with the shop." });
    }

    // Check for existing category with the same name in the shop (if name is updated)
    if (name && name.trim() !== category.name) {
      const existingCategory = await Prisma.category.findFirst({
        where: {
          name: name.trim(),
          shopId: shop.id,
          id: { not: categoryId }, // Exclude the current category
        },
      });
      if (existingCategory) {
        return res.status(400).json({
          error: `Category '${name.trim()}' already exists in this shop.`,
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim();
    updateData.slug = shop.slug; // Update slug to match shop's slug

    // Update the category
    const updatedCategory = await Prisma.category.update({
      where: { id: categoryId },
      data: updateData,
    });

    // Generate category URL using shop slug
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";
    const categoryUrl = `${baseUrl}/shops/${shop.slug}/categories/${updatedCategory.id}`;

    res.status(200).json({
      message: "Category updated successfully!",
      category: updatedCategory,
      categoryUrl,
    });
  } catch (error) {
    console.error("Error in editCategory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// delete category
export const deleteCategory = async (req, res) => {
  try {
    const { shopId } = req.user; // From JWT
    const { categoryId } = req.params; // From URL param

    console.log("Received categoryId:", categoryId);

    // Validation
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res.status(400).json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return res.status(400).json({ error: "categoryId is required and must be a non-empty string." });
    }

    // Check shop existence
    const shop = await Prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check category existence
    const category = await Prisma.category.findUnique({ where: { id: categoryId } });
    if (!category || category.shopId !== shopId) {
      return res.status(404).json({ error: "Category not found or not associated with the shop." });
    }

    // Delete category
    const deletedCategory = await Prisma.category.delete({ where: { id: categoryId } });

    res.status(200).json({
      message: "Category deleted successfully!",
      category: deletedCategory,
    });
  } catch (error) {
    console.error("Error in deleteCategory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get all product which are assigned to that category
// Controller: Get all assigned products to a category
export const getProductsByCategory = async (req, res) => {
  try {
    console.log("Called get Products")
    const shopId = req.user.shopId;
    const categoryId   = req.query.categoryId; // Take categoryId from body
    console.log(categoryId)
    if (!shopId) {
      return res.status(400).json({ error: "shopId is required from the authenticated user." });
    }
    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return res.status(400).json({ error: "categoryId is required in body and must be a non-empty string." });
    }

    // Verify the category exists for this shop
    const category = await Prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop: true },
    });
    if (!category || category.shopId !== shopId) {
      return res.status(404).json({ error: "Category not found or not associated with this shop." });
    }
    console.log(category)

    // Fetch products assigned to this category for the shop
    const products = await Prisma.product.findMany({
      where: {
        shopCategoriesProducts: {
          some: {
            shopId: shopId,
            categoryId: categoryId,
          },
        },
      },
      include: {
        shopCategoriesProducts: true,
      },
    });

    res.status(200).json({
      message: `Found ${products.length} product(s) assigned to this category.`,
      products,
    });
  } catch (error) {
    console.error("Error in getProductsByCategory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Add a product to a category
export const addProductsToCategory = async (req, res) => {
  try {
    const shopId = req.user?.shopId;
    const { productId, categoryId } = req.body;
    console.log("addProductsToCategory Input:", { shopId, productId, categoryId });

    // Validate inputs
    if (!productId || typeof productId !== "string" || productId.trim() === "") {
      return res.status(400).json({ error: "productId is required and must be a non-empty string." });
    }
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res.status(400).json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return res.status(400).json({ error: "categoryId is required and must be a non-empty string." });
    }

    // Check if shop exists
    const shop = await Prisma.shop.findUnique({ where: { id: shopId } });
    console.log("Shop found:", shop);
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check if category exists and belongs to the shop
    const category = await Prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop: true },
    });
    console.log("Category found:", category);
    if (!category || category.shopId !== shopId) {
      return res.status(404).json({ error: "Category not found or not associated with the shop." });
    }

    // Check if product exists
    const product = await Prisma.product.findUnique({
      where: { id: productId },
      include: {
        shopCategoriesProducts: {
          where: { shopId, categoryId },
        },
      },
    });
    console.log("Product found:", product);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Check if association already exists
    const existingEntry = product.shopCategoriesProducts.find(
      (pc) => pc.shopId === shopId && pc.categoryId === categoryId
    );

    if (existingEntry) {
      return res.status(200).json({
        message: "Product is already associated with this category in the shop.",
        productId,
        categoryId,
      });
    }

    // Add product to the category
    await Prisma.productCategory.create({
      data: {
        productId,
        shopId,
        categoryId,
      },
    });
    console.log(`Added product ${productId} to category ${categoryId}`);

    res.status(200).json({
      message: "Product added to category successfully.",
      productId,
      categoryId,
    });
  } catch (error) {
    console.error("Error in addProductsToCategory:", error.message, error.stack);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};


// Remove a product from a category
export const removeProductsFromCategory = async (req, res) => {
  try {
    const shopId = req.user?.shopId;
    const { productId, categoryId } = req.body;
    console.log("removeProductsFromCategory Input:", { shopId, productId, categoryId });

    // Validate inputs
    if (!productId || typeof productId !== "string" || productId.trim() === "") {
      return res.status(400).json({ error: "productId is required and must be a non-empty string." });
    }
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res.status(400).json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return res.status(400).json({ error: "categoryId is required and must be a non-empty string." });
    }

    // Check if shop exists
    const shop = await Prisma.shop.findUnique({ where: { id: shopId } });
    console.log("Shop found:", shop);
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check if category exists and is associated with the shop
    const category = await Prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop: true },
    });
    console.log("Category found:", category);
    if (!category || category.shopId !== shopId) {
      return res.status(404).json({ error: "Category not found or not associated with the shop." });
    }

    // Check if product exists
    const product = await Prisma.product.findUnique({
      where: { id: productId },
      include: {
        shopCategoriesProducts: {
          where: { shopId, categoryId },
        },
      },
    });
    console.log("Product found:", product);
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }

    // Check if association exists
    const existingEntry = product.shopCategoriesProducts.find(
      (pc) => pc.shopId === shopId && pc.categoryId === categoryId
    );

    if (!existingEntry) {
      return res.status(200).json({
        message: "Product is not associated with this category in the shop.",
        productId,
        categoryId,
      });
    }

    // Remove association
    await Prisma.productCategory.delete({
      where: {
        productId_shopId_categoryId: {
          productId,
          shopId,
          categoryId,
        },
      },
    });
    console.log(`Removed product ${productId} from category ${categoryId}`);

    res.status(200).json({
      message: "Product removed from category successfully.",
      productId,
      categoryId,
    });
  } catch (error) {
    console.error("Error in removeProductsFromCategory:", error.message, error.stack);
    res.status(500).json({ error: `Internal server error: ${error.message}` });
  }
};


//get all categorys
export const getCategoriesForShop = async (req, res) => {
  try {
    const { slug } = req.params;

    // Validate inputs
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return res.status(400).json({
        error: "Shop slug is required and must be a non-empty string.",
      });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { slug },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Find categories associated with the shop
    const categories = await Prisma.category.findMany({
      where: {
        shopId: shop.id,
      },
    });

    // If no categories are found, return an empty array
    if (categories.length === 0) {
      return res.status(200).json({
        message: "No categories found for this shop.",
        categories: [],
      });
    }

    res.status(200).json({
      message: `${categories.length} category(ies) found for the shop.`,
      categories,
    });
  } catch (error) {
    console.error("Error in getCategoriesForShop:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// get product of that category
export const getAllProductsForShop = async (req, res) => {
  try {
    const { slug, categoryId } = req.params;

    // Validate inputs
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return res.status(400).json({
        error: "Shop slug is required and must be a non-empty string.",
      });
    }
    if (
      !categoryId ||
      typeof categoryId !== "string" ||
      categoryId.trim() === ""
    ) {
      return res.status(400).json({
        error: "categoryId is required and must be a non-empty string.",
      });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { slug },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Check if the category exists and is associated with the shop
    const category = await Prisma.category.findUnique({
      where: { id: categoryId },
      include: { shop: true },
    });
    if (!category || category.shopId !== shop.id) {
      return res
        .status(404)
        .json({ error: "Category not found or not associated with the shop." });
    }

    // Find products associated with the category and shop via ProductCategory
    const productCategories = await Prisma.productCategory.findMany({
      where: {
        categoryId,
        shopId: shop.id,
      },
      include: {
        product: true, // Include product details
      },
    });

    // Extract products from productCategories
    const products = productCategories.map((pc) => pc.product);

    // If no products are found, return an empty array with a message
    if (products.length === 0) {
      return res.status(200).json({
        message: "No products found in this category for the shop.",
        products: [],
      });
    }

    res.status(200).json({
      message: `${products.length} product(s) found in the category.`,
      products,
    });
  } catch (error) {
    console.error("Error in getAllProductsForShop:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// search and filter the product
export const searchAndFilterProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const {
      search, // Search term for product name or description
      minPrice, // Optional minimum price
      maxPrice, // Optional maximum price
      minimumStock, // Optional minimum stock quantity
      inStock, // Optional: true for products with quantity > 0
      sortBy = "name", // Default sort by name
      sortOrder = "asc", // Default sort order ascending
      page = 1, // Pagination: default page 1
      limit = 10, // Pagination: default 10 items per page
    } = req.query;

    // Validate inputs
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return res.status(400).json({
        error: "Shop slug is required and must be a non-empty string.",
      });
    }
    if (search && (typeof search !== "string" || search.trim().length < 2)) {
      return res.status(400).json({
        error: "Search term, if provided, must be at least 2 characters long.",
      });
    }
    if (minPrice && (isNaN(minPrice) || Number(minPrice) < 0)) {
      return res.status(400).json({
        error: "minPrice, if provided, must be a non-negative number.",
      });
    }
    if (maxPrice && (isNaN(maxPrice) || Number(maxPrice) < 0)) {
      return res.status(400).json({
        error: "maxPrice, if provided, must be a non-negative number.",
      });
    }
    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      return res.status(400).json({
        error: "minPrice must not exceed maxPrice.",
      });
    }
    if (minimumStock && (isNaN(minimumStock) || Number(minimumStock) < 0)) {
      return res.status(400).json({
        error: "minimumStock, if provided, must be a non-negative number.",
      });
    }
    if (inStock && !["true", "false"].includes(inStock.toString())) {
      return res.status(400).json({
        error: "inStock, if provided, must be a boolean (true or false).",
      });
    }
    if (isNaN(page) || Number(page) < 1) {
      return res.status(400).json({
        error: "page must be a positive integer.",
      });
    }
    if (isNaN(limit) || Number(limit) < 1 || Number(limit) > 100) {
      return res.status(400).json({
        error: "limit must be a positive integer between 1 and 100.",
      });
    }
    if (!["name", "price", "quantity"].includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of 'name', 'price', or 'quantity'.",
      });
    }
    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({
        error: "sortOrder must be 'asc' or 'desc'.",
      });
    }

    // Check if the shop exists
    const shop = await Prisma.shop.findUnique({
      where: { slug },
    });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Build query conditions
    const where = {
      shopCategoriesProducts: {
        some: {
          shopId: shop.id, // Ensure products are associated with the shop
        },
      },
      ...(search
        ? {
            OR: [
              { name: { contains: search.trim(), mode: "insensitive" } },
              { description: { contains: search.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
      ...(minPrice ? { price: { gte: Number(minPrice) } } : {}),
      ...(maxPrice ? { price: { lte: Number(maxPrice) } } : {}),
      ...(inStock === "true" ? { quantity: { gt: 0 } } : {}),
      ...(minimumStock ? { quantity: { gte: Number(minimumStock) } } : {}),
    };

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Define sorting
    const orderBy = { [sortBy]: sortOrder };

    // Fetch products with filters and pagination
    const [products, totalCount] = await Promise.all([
      Prisma.product.findMany({
        where,
        skip,
        take: limitNum,
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          quantity: true,
          imageUrl: true, // Include if available in schema
        },
        orderBy,
      }),
      Prisma.product.count({ where }),
    ]);

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Build search summary
    const searchSummary = {
      shop: shop.name,
      filtersApplied: {
        ...(search ? { search: search.trim() } : {}),
        ...(minPrice ? { minPrice: Number(minPrice) } : {}),
        ...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
        ...(inStock ? { inStock: inStock === "true" } : {}),
        ...(minimumStock ? { minimumStock: Number(minimumStock) } : {}),
        sortBy,
        sortOrder,
      },
    };

    // If no products are found, return an empty array
    if (products.length === 0) {
      return res.status(200).json({
        message: "No products found matching the criteria.",
        products: [],
        searchSummary,
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
        },
      });
    }

    res.status(200).json({
      message: `${products.length} product(s) found.`,
      products,
      searchSummary,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error in searchAndFilterProducts:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// Add multiple products (from a specific shop) to the user's bucket
export const addItemsToBucket = async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from authenticated user
    const { shopId, items } = req.body; // items: [{ productId, quantity }]

    // Validate inputs
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error:
          "items (array of { productId, quantity }) is required and must not be empty.",
      });
    }
    for (const item of items) {
      if (
        !item.productId ||
        typeof item.productId !== "string" ||
        item.productId.trim() === ""
      ) {
        return res
          .status(400)
          .json({ error: "Each item must have a valid productId." });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({
          error: `Invalid quantity for product ${item.productId}. Quantity must be a positive integer.`,
        });
      }
    }

    // Confirm the shop exists
    const shop = await Prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Confirm all requested products exist
    const productIds = items.map((i) => i.productId);
    const products = await Prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      return res.status(404).json({ error: "One or more products not found." });
    }

    // Check product stock availability
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      if (product.quantity < item.quantity) {
        return res.status(400).json({
          error: `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}`,
        });
      }
    }

    // Ensure user has a bucket, or create one if not
    let bucket = await Prisma.bucket.findUnique({ where: { userId } });
    if (!bucket) {
      bucket = await Prisma.bucket.create({ data: { userId } });
    }

    // Add or update items in the bucket
    let addedCount = 0;
    let updatedCount = 0;
    const skippedItems = [];
    for (const item of items) {
      const { productId, quantity } = item;
      const product = products.find((p) => p.id === productId);

      const uniqueKey = {
        bucketId_productId_shopId: {
          bucketId: bucket.id,
          productId,
          shopId,
        },
      };

      // Check if the product from the shop already exists in the bucket
      const existingItem = await Prisma.bucketItem.findUnique({
        where: uniqueKey,
      });

      if (existingItem) {
        // Update quantity to the new value (overwrite instead of increment)
        await Prisma.bucketItem.update({
          where: { id: existingItem.id },
          data: { quantity }, // Set quantity directly to the provided value
        });
        updatedCount++;
      } else {
        // Create new bucket item
        await Prisma.bucketItem.create({
          data: {
            bucketId: bucket.id,
            productId,
            shopId,
            quantity,
          },
        });
        addedCount++;
      }
    }

    res.status(200).json({
      message: `${addedCount} product(s) added and ${updatedCount} product(s) updated in your bucket.`,
      skippedItems: skippedItems.length > 0 ? skippedItems : undefined,
    });
  } catch (error) {
    console.error("Error in addItemsToBucket:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
// Remove selected products (from a specific shop) from the user's bucket
export const removeItemsFromBucket = async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from authenticated user
    const { shopId, productIds } = req.body; // productIds: array of product IDs

    // Validate inputs
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res
        .status(400)
        .json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: "productIds (array) is required and must not be empty.",
      });
    }
    for (const productId of productIds) {
      if (typeof productId !== "string" || productId.trim() === "") {
        return res
          .status(400)
          .json({ error: "Each productId must be a non-empty string." });
      }
    }

    // Confirm the shop exists
    const shop = await Prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      return res.status(404).json({ error: "Shop not found." });
    }

    // Get user's bucket
    const bucket = await Prisma.bucket.findUnique({ where: { userId } });
    if (!bucket) {
      return res.status(404).json({ error: "Bucket not found." });
    }

    // Delete matching product+shop entries from the bucket
    const deleteResult = await Prisma.bucketItem.deleteMany({
      where: {
        bucketId: bucket.id,
        shopId,
        productId: { in: productIds },
      },
    });

    res.status(200).json({
      message: `${deleteResult.count} product(s) removed from your bucket.`,
    });
  } catch (error) {
    console.error("Error in removeItemsFromBucket:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//get all bucket item
export const getBucketItems = async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from authenticated user

    // Find the user's bucket
    const bucket = await Prisma.bucket.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                quantity: true, // Stock quantity
              },
            },
            shop: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // If no bucket exists, return an empty result
    if (!bucket) {
      return res.status(200).json({
        message: "No bucket found for this user.",
        items: [],
      });
    }

    // Format the response to include relevant details
    const formattedItems = bucket.items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      availableStock: item.product.quantity,
      quantity: item.quantity,
      shopId: item.shop.id,
      shopName: item.shop.name,
    }));

    res.status(200).json({
      message: "Bucket items retrieved successfully.",
      items: formattedItems,
      totalItems: formattedItems.length,
    });
  } catch (error) {
    console.error("Error in getBucketItems:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//create order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bucket = await Prisma.bucket.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, price: true, quantity: true },
            },
            shop: {
              select: { id: true, name: true, ownerId: true },
            },
          },
        },
      },
    });

    if (!bucket || bucket.items.length === 0) {
      return res.status(400).json({ error: "Bucket is empty or does not exist." });
    }

    const itemsByShop = bucket.items.reduce((acc, item) => {
      const shopId = item.shop.id;
      if (!acc[shopId]) {
        acc[shopId] = { shop: item.shop, items: [] };
      }
      acc[shopId].items.push({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      });
      return acc;
    }, {});

    for (const shopId in itemsByShop) {
      for (const item of itemsByShop[shopId].items) {
        const product = bucket.items.find(i => i.product.id === item.productId).product;
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            error: `Insufficient stock for ${item.productName}. Available: ${product.quantity}, Requested: ${item.quantity}`,
          });
        }
      }
    }

    const orders = [];

    for (const shopId in itemsByShop) {
      const { items, shop } = itemsByShop[shopId];
      const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const order = await Prisma.order.create({
        data: {
          userId,
          shopId,
          totalAmount,
          status: "PENDING",
          orderItems: {
            create: items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { orderItems: true },
      });

      orders.push(order);

      for (const item of items) {
        await Prisma.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      await Prisma.orderNotification.create({
        data: {
          status: "PENDING",
          message: `New order ${order.id} placed for ${items.length} item(s) totaling $${totalAmount.toFixed(2)}.`,
          shopId: shopId,
          orderId: order.id,
        },
      });
    }

    // Clear bucket
    await Prisma.bucketItem.deleteMany({ where: { bucketId: bucket.id } });

    // ✅ OPTIONAL: Fetch updated notifications for affected shop owners
    const uniqueOwnerIds = [
      ...new Set(bucket.items.map(item => item.shop.ownerId)),
    ];

    const allNotifications = [];
    for (const ownerId of uniqueOwnerIds) {
      const notifications = await getOrderNotifications(ownerId);
      allNotifications.push({
        ownerId,
        notifications,
      });
    }

    res.status(201).json({
      message: `Order(s) created and notifications sent.`,
      orders: orders.map(order => ({
        orderId: order.id,
        shopId: order.shopId,
        shopName: itemsByShop[order.shopId].shop.name,
        totalAmount: order.totalAmount,
        items: order.orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
        status: order.status,
      })),
      updatedNotifications: allNotifications, // 🔄 Optional: Return new notifications per owner
    });

  } catch (error) {
    console.error("Error in createOrder:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};



// Get user order history
export const getOrderHistory = async (req, res) => {
  try {
    const userId = req.user.userId; // Get userId from authenticated user
    const {
      status, // Optional: Filter by order status (e.g., PENDING, COMPLETED)
      shopId, // Optional: Filter by shop ID
      minTotal, // Optional: Minimum total amount
      maxTotal, // Optional: Maximum total amount
      startDate, // Optional: Filter orders after this date
      endDate, // Optional: Filter orders before this date
      sortBy = "createdAt", // Default sort by creation date
      sortOrder = "desc", // Default sort order descending
      page = 1, // Pagination: default page 1
      limit = 10, // Pagination: default 10 items per page
    } = req.query;

    // Validate inputs
    if (status !== undefined && (typeof status !== "string" || status.trim() === "")) {
      return res.status(400).json({
        error: "status, if provided, must be a non-empty string.",
      });
    }
    if (shopId !== undefined && (typeof shopId !== "string" || shopId.trim() === "")) {
      return res.status(400).json({
        error: "shopId, if provided, must be a non-empty string.",
      });
    }
    if (minTotal && (isNaN(minTotal) || Number(minTotal) < 0)) {
      return res.status(400).json({
        error: "minTotal, if provided, must be a non-negative number.",
      });
    }
    if (maxTotal && (isNaN(maxTotal) || Number(maxTotal) < 0)) {
      return res.status(400).json({
        error: "maxTotal, if provided, must be a non-negative number.",
      });
    }
    if (minTotal && maxTotal && Number(minTotal) > Number(maxTotal)) {
      return res.status(400).json({
        error: "minTotal must not exceed maxTotal.",
      });
    }
    if (startDate && isNaN(Date.parse(startDate))) {
      return res.status(400).json({
        error: "startDate, if provided, must be a valid date.",
      });
    }
    if (endDate && isNaN(Date.parse(endDate))) {
      return res.status(400).json({
        error: "endDate, if provided, must be a valid date.",
      });
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        error: "startDate must not be later than endDate.",
      });
    }
    if (isNaN(page) || Number(page) < 1) {
      return res.status(400).json({
        error: "page must be a positive integer.",
      });
    }
    if (isNaN(limit) || Number(limit) < 1 || Number(limit) > 100) {
      return res.status(400).json({
        error: "limit must be a positive integer between 1 and 100.",
      });
    }
    if (!["createdAt", "totalAmount"].includes(sortBy)) {
      return res.status(400).json({
        error: "sortBy must be one of 'createdAt' or 'totalAmount'.",
      });
    }
    if (!["asc", "desc"].includes(sortOrder)) {
      return res.status(400).json({
        error: "sortOrder must be 'asc' or 'desc'.",
      });
    }

    // Build query conditions
    const where = {
      userId,
      ...(status ? { status: status.trim().toUpperCase() } : {}),
      ...(shopId ? { shopId } : {}),
      ...(minTotal ? { totalAmount: { gte: Number(minTotal) } } : {}),
      ...(maxTotal ? { totalAmount: { lte: Number(maxTotal) } } : {}),
      ...(startDate ? { createdAt: { gte: new Date(startDate) } } : {}),
      ...(endDate ? { createdAt: { lte: new Date(endDate) } } : {}),
    };

    // Calculate pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Define sorting
    const orderBy = { [sortBy]: sortOrder };

    // Fetch orders with pagination
    const [orders, totalCount] = await Promise.all([
      Prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
        },
      }),
      Prisma.order.count({ where }),
    ]);

    // Prepare pagination metadata
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    // Build search summary
    const searchSummary = {
      filtersApplied: {
        ...(status ? { status: status.trim().toUpperCase() } : {}),
        ...(shopId ? { shopId } : {}),
        ...(minTotal ? { minTotal: Number(minTotal) } : {}),
        ...(maxTotal ? { maxTotal: Number(maxTotal) } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        sortBy,
        sortOrder,
      },
    };

    // If no orders are found, return an empty array
    if (orders.length === 0) {
      return res.status(200).json({
        message: "No orders found matching the criteria.",
        orders: [],
        searchSummary,
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
          hasNextPage,
          hasPrevPage,
        },
      });
    }

    // Format orders for response
    const formattedOrders = orders.map((order) => ({
      orderId: order.id,
      shopId: order.shop.id,
      shopName: order.shop.name,
      shopSlug: order.shop.slug,
      totalAmount: order.totalAmount,
      status: order.status,
      createdAt: order.createdAt,
      items: order.orderItems.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.price,
        quantity: item.quantity,
      })),
    }));

    // Generate base URL for shop links
    const baseUrl = process.env.BASE_URL || "http://localhost:3000";

    res.status(200).json({
      message: `${orders.length} order(s) found.`,
      orders: formattedOrders.map((order) => ({
        ...order,
        shopUrl: `${baseUrl}/shops/${order.shopSlug}`,
      })),
      searchSummary,
      pagination: {
        totalCount,
        totalPages,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    console.error("Error in getOrderHistory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
