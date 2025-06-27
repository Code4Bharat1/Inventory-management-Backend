import express from "express"
import { createAccount , login } from "../controller/auth.controller.js";
const router = express.Router();

router.post("/register", createAccount)
router.post("/login", login)

export default router

