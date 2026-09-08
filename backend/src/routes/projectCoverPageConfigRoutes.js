const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getConfig, updateConfig } = require("../controllers/projectCoverPageConfigController");

const router = express.Router();
router.get("/:projectId", authMiddleware, getConfig);
router.put("/:projectId", authMiddleware, updateConfig);

module.exports = router;
