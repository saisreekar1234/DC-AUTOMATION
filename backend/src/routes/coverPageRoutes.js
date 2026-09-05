const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const {
  generateCoverPage,
} = require("../controllers/coverPageController");

const router = express.Router();

router.get(
  "/:id/cover-page",
  authMiddleware,
  generateCoverPage
);

module.exports = router;
