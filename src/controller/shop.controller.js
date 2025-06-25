import Shop from "../models/shop.model.js";
import Product from "../models/product.model.js";
import Prisma from "../config/db.conf.js";
import slugify from "slugify";

//create shop
export const createShop = async (req, res) => {
  try {
    const { name, description, logoUrl } = req.body;
    // const owner = req.user._id;

    // ...Check for existing shop/name as before...

    // Generate unique slug
    let baseSlug = slugify(name, { lower: true, strict: true });
    let slug = baseSlug;
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

//assign products to shops
export const assignProductsToShops = async (req, res) => {
  try {
    const { productIds, shopIds } = req.body; // Arrays

    // Check all shops exist and owned by user

    const shops = await prisma.shop.findMany({
      where: {
        id: {
          in: shopIds,
        },
      },
    });
    if (shops.length !== shopIds.length)
      return res.status(404).json({ error: "One or more shops not found." });

    // (Optional: verify ownership for all shops)
    // for (let shop of shops) {
    //   if (!shop.owner.equals(req.user._id)) {
    //     return res.status(403).json({ error: `You do not own shop: ${shop.name}` });
    //   }
    // }

    // Assign each shop to all selected products
    const products = await Product.find({ _id: { $in: productIds } });
    for (let product of products) {
      // Add shopIds to the 'shops' array, avoiding duplicates
      const uniqueShopIds = Array.from(
        new Set([...(product.shops || []), ...shopIds])
      );
      product.shops = uniqueShopIds;
      await product.save();
    }

    res.json({
      message: "Products assigned to shops successfully.",
      updatedProducts: products.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }

};

// Add multiple products (from a specific shop) to the user's bucket
export const addItemsToBucket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopId, productIds } = req.body;

    // Validate required inputs
    if (!shopId || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'shopId and productIds (array) are required.' });
    }

    // Confirm the shop exists
    const shop = await prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) return res.status(404).json({ error: 'Shop not found.' });

    // Confirm all requested products exist
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    if (products.length !== productIds.length) {
      return res.status(404).json({ error: 'One or more products not found.' });
    }

    // Ensure user has a bucket, or create one if not
    let bucket = await prisma.bucket.findUnique({ where: { userId } });
    if (!bucket) {
      bucket = await prisma.bucket.create({ data: { userId } });
    }

    let addedCount = 0;

    // Loop through each product
    for (const product of products) {
      const uniqueKey = {
        bucketId_productId_shopId: {
          bucketId: bucket.id,
          productId: product.id,
          shopId,
        },
      };

      // Check if this product from the shop already exists in the bucket
      const existingItem = await prisma.bucketItem.findUnique({ where: uniqueKey });

      if (existingItem) {
        // If yes, just increase the quantity
        await prisma.bucketItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + 1,
          },
        });
      } else {
        // If not, create a new entry in the bucket
        await prisma.bucketItem.create({
          data: {
            bucketId: bucket.id,
            productId: product.id,
            shopId,
            quantity: 1,
          },
        });
      }

      addedCount++;
    }

    res.status(200).json({
      message: `${addedCount} product(s) added to your bucket from shop.`,
    });
  } catch (error) {
    console.error('Error in addItemsToBucket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Remove selected products (from a specific shop) from the user's bucket
export const removeItemsFromBucket = async (req, res) => {
  try {
    const userId = req.user.id;
    const { shopId, productIds } = req.body;

    // Validate required inputs
    if (!shopId || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'shopId and productIds (array) are required.' });
    }

    // Get user's bucket
    const bucket = await prisma.bucket.findUnique({ where: { userId } });
    if (!bucket) return res.status(404).json({ error: 'Bucket not found.' });

    // Delete all matching product+shop entries from the bucket
    const deleteResult = await prisma.bucketItem.deleteMany({
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
    console.error('Error in removeItemsFromBucket:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};
