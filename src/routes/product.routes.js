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
import multer from 'multer';
import { authenticateJWT } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // or configure cloud storage


router.post('/create-product',  upload.single('image') , createProduct); // create the product
router.get('/get-products', getProducts); //get all products
router.get('/:id', getProductById); // get specific product details
router.put('/:id', upload.single('image') , updateProduct); // edit the product details 
router.delete('/:id', deleteProduct); // delete the product
router.post('/upload-products' , bulkUploadProducts)
router.put('/updateQuantity/:id',authenticateJWT ,  updateProductQuantity); // (for test)

export default router;
