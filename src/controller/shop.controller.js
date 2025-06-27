
import Prisma from "../config/db.conf.js";
import slugify from "slugify";

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
    const { shopId } = req.params; // Get shopId from URL params
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

//edit category
export const editCategory = async (req, res) => {
  try {
    const { shopId } = req.params; // Get shopId and categoryId from URL params
    const { categoryId , name, description, imageUrl } = req.body;

    // Validate inputs
    if (!shopId || typeof shopId !== "string" || shopId.trim() === "") {
      return res.status(400).json({ error: "shopId is required and must be a non-empty string." });
    }
    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return res.status(400).json({ error: "categoryId is required and must be a non-empty string." });
    }
    if (name && (typeof name !== "string" || name.trim() === "")) {
      return res.status(400).json({ error: "Name, if provided, must be a non-empty string." });
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
      return res.status(404).json({ error: "Category not found or not associated with the shop." });
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
        return res.status(400).json({ error: `Category '${name.trim()}' already exists in this shop.` });
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

// add product to the category
export const addProductsToCategory = async (req, res) => {
  try {
    const { shopId } = req.params; // Get shopId from URL params
    const { productIds, categoryId } = req.body; // Single categoryId from body

    // Validate inputs
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: "productIds (array) is required and must not be empty.",
      });
    }
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

    // Check all products exist
    const products = await Prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        shopCategoriesProducts: {
          include: {
            shop: true, // Include current shop relations
            category: true, // Include current category relations
          },
        },
      },
    });
    if (products.length !== productIds.length) {
      return res.status(404).json({ error: "One or more products not found." });
    }

    // Add products to the category in the shop, skipping existing associations
    let addedCount = 0;
    const skippedAssociations = [];
    for (const product of products) {
      // Check if the product is already in this shop and category
      const existingEntry = product.shopCategoriesProducts.find(
        (pc) => pc.shopId === shop.id && pc.categoryId === categoryId
      );

      if (existingEntry) {
        skippedAssociations.push({
          productId: product.id,
          shopId: shop.id,
          categoryId,
          reason: "Product already associated with this category in the shop.",
        });
        continue; // Skip adding this product to the category
      }

      // Create a new entry in the ProductCategory junction table
      await Prisma.productCategory.create({
        data: {
          productId: product.id,
          shopId: shop.id,
          categoryId,
        },
      });
      addedCount++;
    }

    res.status(200).json({
      message: `${addedCount} product(s) added to category successfully.`,
      updatedProducts: products.length,
      skippedAssociations:
        skippedAssociations.length > 0 ? skippedAssociations : undefined,
    });
  } catch (error) {
    console.error("Error in addProductsToCategory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

//remove product from category
export const removeProductsFromCategory = async (req, res) => {
  try {
    const { shopId } = req.params; // Get shopId from URL params
    const { productIds, categoryId } = req.body; // Single categoryId from body

    // Validate inputs
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        error: "productIds (array) is required and must not be empty.",
      });
    }
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

    // Check all products exist
    const products = await Prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      include: {
        shopCategoriesProducts: {
          include: {
            shop: true, // Include current shop relations
            category: true, // Include current category relations
          },
        },
      },
    });
    if (products.length !== productIds.length) {
      return res.status(404).json({ error: "One or more products not found." });
    }

    // Remove products from the category in the shop
    let removedCount = 0;
    const skippedRemovals = [];
    for (const product of products) {
      // Check if the product is associated with this shop and category
      const existingEntry = product.shopCategoriesProducts.find(
        (pc) => pc.shopId === shop.id && pc.categoryId === categoryId
      );

      if (!existingEntry) {
        skippedRemovals.push({
          productId: product.id,
          shopId: shop.id,
          categoryId,
          reason: "Product not associated with this category in the shop.",
        });
        continue; // Skip if no association exists
      }

      // Remove the entry from the ProductCategory junction table
      await Prisma.productCategory.delete({
        where: {
          productId_shopId_categoryId: {
            productId: product.id,
            shopId: shop.id,
            categoryId,
          },
        },
      });
      removedCount++;
    }

    res.status(200).json({
      message: `${removedCount} product(s) removed from category successfully.`,
      updatedProducts: products.length,
      skippedRemovals: skippedRemovals.length > 0 ? skippedRemovals : undefined,
    });
  } catch (error) {
    console.error("Error in removeProductsFromCategory:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};


//get all categorys
export const getCategoriesForShop = async (req, res) => {
  try {
    const { slug } = req.params;

    // Validate inputs
    if (!slug || typeof slug !== "string" || slug.trim() === "") {
      return res.status(400).json({ error: "Shop slug is required and must be a non-empty string." });
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
      return res.status(400).json({ error: "Shop slug is required and must be a non-empty string." });
    }
    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return res.status(400).json({ error: "categoryId is required and must be a non-empty string." });
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
      return res.status(404).json({ error: "Category not found or not associated with the shop." });
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
      return res
        .status(400)
        .json({ error: "items (array of { productId, quantity }) is required and must not be empty." });
    }
    for (const item of items) {
      if (!item.productId || typeof item.productId !== "string" || item.productId.trim() === "") {
        return res.status(400).json({ error: "Each item must have a valid productId." });
      }
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ error: `Invalid quantity for product ${item.productId}. Quantity must be a positive integer.` });
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
        return res.status(400).json({ error: `Insufficient stock for product ${product.name}. Available: ${product.quantity}, Requested: ${item.quantity}` });
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
        // Update quantity if item exists
        await Prisma.bucketItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantity },
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
      return res
        .status(400)
        .json({ error: "productIds (array) is required and must not be empty." });
    }
    for (const productId of productIds) {
      if (typeof productId !== "string" || productId.trim() === "") {
        return res.status(400).json({ error: "Each productId must be a non-empty string." });
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
