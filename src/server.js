import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

//routes
import productRoutes from './routes/product.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import shopRoutes from "./routes/shop.routes.js";
import authRoutes from "./routes/auth.routes.js";
import orderRoutes from "./routes/order.routes.js";

const app = express();

// Load environment variables
dotenv.config();

const PORT = process.env.PORT; // Fallback to 3000 if PORT is not set in .env

// Configure CORS to allow requests from http://localhost:3000
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allow specific methods
  credentials: true, // Allow cookies/auth headers if needed
}));

app.use(express.json()); // Middleware to parse JSON bodies

app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api", authRoutes);
app.use("/api/notifications", orderRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('✅ Server is up and running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});