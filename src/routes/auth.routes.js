import express from "express"
import { createAccount , login } from "../controller/auth.controller.js";
const router = express.Router();

router.post("/register", createAccount) // register the user to the online shop 
router.post("/login", login) // login the user to the online shop

export default router

