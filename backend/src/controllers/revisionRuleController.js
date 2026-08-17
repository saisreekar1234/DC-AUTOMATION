const revisionRuleService = require("../services/revisionRuleService");

async function createRule(req, res) {
  try {
    const rule = await revisionRuleService.createRule(
      req.params.projectId,
      req.body
    );

    res.status(201).json(rule);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create revision rule",
    });
  }
}

async function getRules(req, res) {
  try {
    const rules = await revisionRuleService.getRules(
      req.params.projectId
    );

    res.json(rules);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to fetch revision rules",
    });
  }
}

module.exports = {
  createRule,
  getRules,
};