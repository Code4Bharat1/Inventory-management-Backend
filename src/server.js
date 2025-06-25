import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.conf.js';

//routes
import productRoutes from './routes/product.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import shopRoutes from "./routes/shop.routes.js"

const app = express();
// Load environment variables
dotenv.config();

const PORT = process.env.PORT;
app.use(express.json()); // Middleware to parse JSON bodies


app.use("/api/products",productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/shop" , shopRoutes);




// Basic test route
app.get('/', (req, res) => {
  res.send('✅ Server is up and running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});
