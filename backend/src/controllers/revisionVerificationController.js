const revisionVerificationService =
  require("../services/revisionVerificationService");


// ======================================================
// VERIFY ONE ITEM
// ======================================================

async function verifyTransmittalItem(req, res) {

  try {

    const result =
      await revisionVerificationService
        .verifyTransmittalItem(
          req.params.itemId
        );


    res.json(result);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to verify revision",
    });
  }
}


// ======================================================
// VERIFY ENTIRE TRANSMITTAL
// ======================================================

async function verifyTransmittal(req, res) {

  try {

    const results =
      await revisionVerificationService
        .verifyTransmittal(
          req.params.transmittalId
        );


    res.json({
      transmittal_id:
        Number(req.params.transmittalId),

      count:
        results.length,

      items:
        results,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        error.message ||
        "Failed to verify transmittal",
    });
  }
}


module.exports = {
  verifyTransmittalItem,
  verifyTransmittal,
};