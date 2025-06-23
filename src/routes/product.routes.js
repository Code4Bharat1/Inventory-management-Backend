import express from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  updateProductQuantity
} from '../controller/product.controller.js';

const router = express.Router();

router.post('/createProduct', createProduct);
router.get('/getProducts', getProducts);
router.get('/getProduct/:id', getProductById);
router.put('/editProduct/:id', updateProduct);
router.delete('/removeProduct/:id', deleteProduct);
router.put('/updateQuantity/:id', updateProductQuantity);

export default router;
