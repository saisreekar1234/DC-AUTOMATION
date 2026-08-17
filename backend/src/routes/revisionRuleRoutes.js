const express = require("express");

const {
  createRule,
  getRules,
} = require("../controllers/revisionRuleController");

const router = express.Router();

router.post("/:projectId", createRule);
router.get("/:projectId", getRules);

module.exports = router;