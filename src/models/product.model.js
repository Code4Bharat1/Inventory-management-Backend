import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    description: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    price: {
      type: Number,
      min: 0,
    },
    imageUrl: {
      type: String,
    },
    note: {
      type: String,
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    shops: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },
    ],

    // You can add fields like createdBy, updatedBy, etc. later
  },
  { timestamps: true }
);

const Product = mongoose.model("Product", productSchema);

export default Product;
