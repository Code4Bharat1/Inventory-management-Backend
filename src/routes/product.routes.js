import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductQuantity,
  bulkUploadProducts
} from '../controller/product.controller.js';

const router = express.Router();

router.post('/create-product', createProduct); // create the product
router.get('/get-products', getProducts); //get all products
router.get('/get-product/:id', getProductById); // get specific product details
router.put('/editProduct/:id', updateProduct); // edit the product details 
router.delete('/removeProduct/:id', deleteProduct); // delete the product
router.post('/bulk-upload' , bulkUploadProducts)
router.put('/updateQuantity/:id', updateProductQuantity); // (for test)

export default router;
