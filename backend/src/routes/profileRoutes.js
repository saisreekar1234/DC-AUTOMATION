const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getMyProfile, updateMyProfile, changeMyPassword } = require("../controllers/profileController");

const router = express.Router();
router.get("/me", authMiddleware, getMyProfile);
router.patch("/me", authMiddleware, updateMyProfile);
router.post("/me/change-password", authMiddleware, changeMyPassword);
module.exports = router;
