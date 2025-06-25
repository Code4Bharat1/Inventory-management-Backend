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
