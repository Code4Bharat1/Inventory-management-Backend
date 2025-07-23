import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

//routes
import productRoutes from './routes/product.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import storeRoutes from "./routes/store.routes.js";
import authRoutes from "./routes/auth.routes.js";
import orderRoutes from "./routes/order.routes.js";
import notificationRoutes from "./routes/notification.routes.js"

const app = express();

// Load environment variables
dotenv.config();

const PORT = process.env.PORT; // Fallback to 3000 if PORT is not set in .env

// Configure CORS to allow requests from http://localhost:3000
app.use(
  cors({
    origin: "http://localhost:3000", // Allow frontend origin
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"], // Explicitly allow PATCH
    allowedHeaders: ["Content-Type", "Authorization"], // Allow necessary headers
    credentials: true, // If cookies or auth headers are used
  })
);

app.use(express.json()); // Middleware to parse JSON bodies

app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/store", storeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/notifications" , notificationRoutes)
app.use("/api/order", orderRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('✅ Server is up and running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on http://localhost:${PORT}`);
});