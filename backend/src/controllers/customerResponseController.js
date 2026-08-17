const customerResponseService =
  require("../services/customerResponseService");


// ======================================================
// 1. PROCESS ONE CUSTOMER RESPONSE
// ======================================================

async function processCustomerResponse(
  req,
  res
) {

  try {

    const result =
      await customerResponseService
        .processCustomerResponse(
          req.params.itemId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    res.status(500).json({

      message:
        error.message ||
        "Failed to process customer response",
    });
  }
}


// ======================================================
// 2. PROCESS ENTIRE TRANSMITTAL
// ======================================================

async function processCustomerTransmittal(
  req,
  res
) {

  try {

    const results =
      await customerResponseService
        .processCustomerTransmittal(
          req.params.transmittalId
        );


    res.json({

      transmittal_id:
        Number(
          req.params.transmittalId
        ),

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
        "Failed to process customer transmittal",
    });
  }
}


// ======================================================
// 3. GET CUSTOMER RESPONSES FOR TRANSMITTAL
// ======================================================

async function getCustomerResponsesByTransmittal(
  req,
  res
) {

  try {

    const result =
      await customerResponseService
        .getCustomerResponsesByTransmittal(
          req.params.transmittalId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    if (
      error.message ===
      "Customer transmittal not found"
    ) {

      return res.status(404).json({
        message: error.message,
      });
    }


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch customer responses",
    });
  }
}


// ======================================================
// 4. GET ONE CUSTOMER RESPONSE
// ======================================================

async function getCustomerResponseById(
  req,
  res
) {

  try {

    const result =
      await customerResponseService
        .getCustomerResponseById(
          req.params.itemId
        );


    res.json(result);


  } catch (error) {

    console.error(error);


    if (
      error.message ===
      "Customer transmittal item not found"
    ) {

      return res.status(404).json({
        message: error.message,
      });
    }


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch customer response",
    });
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  processCustomerResponse,

  processCustomerTransmittal,

  getCustomerResponsesByTransmittal,

  getCustomerResponseById,
};