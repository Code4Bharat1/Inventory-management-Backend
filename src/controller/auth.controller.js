import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Prisma from "../config/db.conf.js";
import slugify from "slugify";

// Create a new user account
export const createAccount = async (req, res) => {
  const { email, password, name, phone, address, role } = req.body;

  try {
    // Basic input validation
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Email, password, and name are required" });
    }

    // Check if email already exists
    const existingUser = await Prisma.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    // Validate role if provided
    const validRoles = ["CUSTOMER", "SHOP_OWNER"];
    const userRole =
      role && validRoles.includes(role.toUpperCase())
        ? role.toUpperCase()
        : "CUSTOMER";

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await Prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        address,
        role: userRole,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        role: true,
        createdAt: true,
      },
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return user data and token
    return res.status(201).json({
      user,
      token,
    });
  } catch (error) {
    console.error("Create account error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Login user
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Basic input validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user by email
    const user = await Prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
      },
    });

    // Check if user exists
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return user data and token (excluding password)
    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// Create account (signup)
export const admincreateAccount = async (req, res) => {
  const {
    email,
    password,
    name,
    phone,
    address,
    role,
    shopName,
    shopDescription,
  } = req.body;
  const slug = slugify(shopName, { lower: true });

  try {
    // Basic input validation
    if (!email || !password || !name || !shopName) {
      return res
        .status(400)
        .json({ error: 'Name, email, password, and shop name are required.' });
    }

    // Check if email already exists
    const existingUser = await Prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Check if shop name already exists
    const existingShopByName = await Prisma.shop.findUnique({ where: { name: shopName } });
    if (existingShopByName) {
      return res.status(409).json({ error: 'Shop name already in use' });
    }

    // Check if shop slug already exists
    const existingShopBySlug = await Prisma.shop.findUnique({ where: { slug } });
    if (existingShopBySlug) {
      return res.status(409).json({ error: 'Shop slug already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Validate role if provided
    const validRoles = ['customer', 'shop_owner']; // Match schema case
    const userRole =
      role && validRoles.includes(role.toLowerCase())
        ? role.toLowerCase()
        : 'shop_owner';

    // Create user and shop in a transaction
    const result = await Prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          address,
          role: userRole,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          address: true,
          role: true,
          createdAt: true,
        },
      });

      // Create shop and link to user via ownerId
      const shop = await tx.shop.create({
        data: {
          name: shopName,
          slug,
          description: shopDescription,
          ownerId: user.id, // Set the required ownerId to establish the relation
        },
      });

      return { user, shop };
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        shopId: result.shop.id, // Use shop ID from created shop
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return user, shop, and token
    return res.status(201).json({
      message: 'Account created successfully',
      user: result.user,
      shop: result.shop,
      token,
      redirect: '/dashboard',
    });
  } catch (error) {
    console.error('Create account error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
      return res.status(409).json({ error: 'Shop name already in use' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user (unchanged)
export const adminlogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Input validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Fetch user with related shops
    const user = await Prisma.user.findUnique({
      where: { email },
      include: { shops: true }, // Use 'shops' to match the schema relation
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Get the first shop (assuming one shop per user for simplicity)
    const shop = user.shops.length > 0 ? user.shops[0] : null;

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        shopId: shop ? shop.id : null, // Include shopId if shop exists
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Return user, shop, and token
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      shop,
      token,
      redirect: '/dashboard',
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};