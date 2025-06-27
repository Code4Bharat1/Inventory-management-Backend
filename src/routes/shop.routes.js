// routes/shopRoutes.js
import express from 'express';
import { createShop , createCategory , addProductsToCategory, removeProductsFromCategory , getCategoriesForShop , getAllProductsForShop , editCategory , addItemsToBucket , removeItemsFromBucket} from '../controller/shop.controller.js';

const router = express.Router();

// Create a shop (only for authenticated users)
router.post('/createShop', createShop);


router.post('/:shopId/categories', createCategory);//create a category
router.post('/:shopId/categories/products' , addProductsToCategory) //add product to category
router.delete('/:shopId/categories/products', removeProductsFromCategory) // remove product from category
router.put('/:shopId/categories' , editCategory)

router.get("/:slug", getCategoriesForShop)
router.get("/:slug/:categoryId" , getAllProductsForShop)
router.post("/:slug/:categoryId/bucket/item" , addItemsToBucket)
router.delete("/:slug/:categoryId/bucket/item" , removeItemsFromBucket)


export default router;
