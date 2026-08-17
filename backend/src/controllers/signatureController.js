const signatureService =
  require("../services/signatureService");


// ======================================================
// 1. UPLOAD USER SIGNATURE
// ======================================================

async function uploadSignature(req, res) {

  try {

    const userId =
      req.params.userId;

    if (!req.file) {

      return res.status(400).json({
        message: "Signature file is required",
      });
    }

    const signature =
      await signatureService.saveUserSignature(
        userId,
        req.file
      );

    res.status(201).json({

      message:
        "Signature uploaded successfully",

      signature: {
        id: signature.id,
        user_id: signature.user_id,
        signature_file_name:
          signature.signature_file_name,
        is_active:
          signature.is_active,
        uploaded_at:
          signature.uploaded_at,
      },
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to upload signature",
    });
  }
}


// ======================================================
// 2. GET ACTIVE SIGNATURE
// ======================================================

async function getActiveSignature(req, res) {

  try {

    const signature =
      await signatureService.getActiveSignature(
        req.params.userId
      );

    if (!signature) {

      return res.status(404).json({
        message:
          "No active signature found",
      });
    }

    res.json({
      id: signature.id,
      user_id: signature.user_id,
      signature_file_name:
        signature.signature_file_name,
      signature_file_path:
        signature.signature_file_path,
      is_active:
        signature.is_active,
      uploaded_at:
        signature.uploaded_at,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to fetch signature",
    });
  }
}


// ======================================================
// 3. GET SIGNATURE HISTORY
// ======================================================

async function getUserSignatures(req, res) {

  try {

    const signatures =
      await signatureService.getUserSignatures(
        req.params.userId
      );

    res.json(signatures);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to fetch signatures",
    });
  }
}


// ======================================================
// 4. CREATE SIGNATURE WORKFLOW
// ======================================================

async function createSignatureWorkflow(
  req,
  res
) {

  try {

    const {
      documentId,
      revisionId,
    } = req.params;

    const workflow =
      await signatureService.createSignatureWorkflow(
        documentId,
        revisionId
      );

    res.status(201).json({
      message:
        "Signature workflow created successfully",

      count:
        workflow.length,

      workflow,
    });

  } catch (error) {

    console.error(error);

    res.status(400).json({
      message:
        error.message ||
        "Failed to create signature workflow",
    });
  }
}


// ======================================================
// 5. GET SIGNATURE WORKFLOW
// ======================================================

async function getSignatureWorkflow(
  req,
  res
) {

  try {

    const workflow =
      await signatureService.getSignatureWorkflow(
        req.params.documentId,
        req.params.revisionId
      );

    res.json({
      document_id:
        Number(req.params.documentId),

      revision_id:
        Number(req.params.revisionId),

      count:
        workflow.length,

      workflow,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to fetch signature workflow",
    });
  }
}


// ======================================================
// 6. SIGN DOCUMENT STEP
// ======================================================

async function signDocumentStep(
  req,
  res
) {

  try {

    const {
      documentSignatureId,
    } = req.params;

    const {
      user_id,
    } = req.body;

    if (!user_id) {

      return res.status(400).json({
        message:
          "user_id is required",
      });
    }

    const result =
      await signatureService.signDocumentStep(
        documentSignatureId,
        user_id
      );

    res.json({
      message:
        "Document signature completed successfully",

      signature:
        result,
    });

  } catch (error) {

    console.error(error);

    res.status(400).json({
      message:
        error.message ||
        "Failed to sign document",
    });
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  uploadSignature,
  getActiveSignature,
  getUserSignatures,

  createSignatureWorkflow,
  getSignatureWorkflow,
  signDocumentStep,
};