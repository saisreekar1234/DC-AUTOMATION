const coverPageService = require("../services/coverPageService");

async function generateCoverPage(req, res) {
  try {
    const documentId = Number(req.params.id);

    if (!Number.isInteger(documentId) || documentId <= 0) {
      return res.status(400).json({
        message: "A valid document id is required",
      });
    }

    await coverPageService.generateCoverPage(documentId, res);
  } catch (error) {
    console.error("COVER PAGE GENERATION ERROR:", error);

    if (!res.headersSent) {
      return res.status(error.statusCode || 500).json({
        message: error.message || "Failed to generate cover page",
      });
    }

    res.end();
  }
}

module.exports = {
  generateCoverPage,
};
