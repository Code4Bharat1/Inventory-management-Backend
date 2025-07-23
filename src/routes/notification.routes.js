import express from "express"
import { getAllNotification , NotificationRead } from "../controller/notification.controller.js"
import { authenticateJWT } from "../middleware/auth.middleware.js"


const route = express.Router()

// route.get("/" ,authenticateJWT, getAllNotification)
route.patch("/:id" ,authenticateJWT, NotificationRead)
route.get("/", authenticateJWT, getAllNotification) // Get all notifications

export default route