//shop.route.js
import express from "express";
import {
  createShop,
  createCategory,
  addProductsToCategory,
  removeProductsFromCategory,
  getCategoriesForShop,
  getAllProductsForShop,
  editCategory,
  addItemsToBucket,
  removeItemsFromBucket,
  getBucketItems,
  createOrder,
  deleteCategory,
  searchAndFilterProducts,
  searchCategories,
  getOrderHistory,
  getAllCategories,
  getProductsByCategory,
} from "../controller/store.controller.js";
import { authenticateJWT } from "../middleware/auth.middleware.js";
const router = express.Router();

// Create a shop (only for authenticated users at one time)
router.post("/createShop", createShop);

router.post("/category", authenticateJWT, createCategory); //create a category
router.get("/category", authenticateJWT, getAllCategories); // get all category
router.put("/category", authenticateJWT, editCategory); // edit category
router.delete("/category", authenticateJWT, deleteCategory);
router.get("/category/product", authenticateJWT, getProductsByCategory); //get product to category
router.post("/category/product", authenticateJWT, addProductsToCategory); //add product to category
router.delete("/category/product", authenticateJWT, removeProductsFromCategory); // remove product from category

// router.get("/:slug", authenticateJWT, getCategoriesForShop); // get all category
// router.get("/:slug/Search", searchCategories); // get category by search
// router.get("/:slug/:categoryId", authenticateJWT, getAllProductsForShop); // get all product
// router.get("/:slug/:categoryId/Search", searchAndFilterProducts); // get product by search and filter
router.post(
  "/:slug/:categoryId/bucket/item",
  authenticateJWT,
  addItemsToBucket
); // add product to the bucket
router.delete(
  "/:slug/:categoryId/bucket/item",
  authenticateJWT,
  removeItemsFromBucket
); // remove product from bucket
router.get("/:slug/:categoryId/bucket", authenticateJWT, getBucketItems); // get the bucket
router.post("/:slug/:categoryId/order", authenticateJWT, createOrder); // order the products
router.get(
  "/:slug/:categoryId/order-history",
  authenticateJWT,
  getOrderHistory
); //create order

export default router;
