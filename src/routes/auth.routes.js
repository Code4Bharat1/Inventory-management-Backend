import express from "express"
import { admincreateAccount, adminlogin, createAccount , login } from "../controller/auth.controller.js";
const router = express.Router();

router.post("/register", createAccount) // register the user to the online shop 
router.post("/login", login) // login the user to the online shop
router.post("/admin/register",admincreateAccount)
router.post("/admin/login", adminlogin)
export default router

