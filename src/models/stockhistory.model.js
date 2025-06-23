import mongoose from 'mongoose';

const stockHistorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  oldQuantity: { type: Number, required: true },
  newQuantity: { type: Number, required: true },
  change: { type: Number, required: true },
  action: { type: String, required: true }, // e.g., 'restock', 'sale', 'manual adjustment'
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // optional
  note: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('StockHistory', stockHistorySchema);