import mongoose from "mongoose";
import slugify from "slugify";

const shopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    // owner: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "User",
    //   required: true,
    // },
    description: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
    slug: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Shop = mongoose.model("Shop", shopSchema);
export default Shop;
