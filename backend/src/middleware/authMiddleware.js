const jwt =
  require("jsonwebtoken");


// ======================================================
// AUTHENTICATION MIDDLEWARE
// ======================================================

function authMiddleware(
  req,
  res,
  next
) {

  try {

    // --------------------------------------------------
    // GET AUTHORIZATION HEADER
    // --------------------------------------------------

    const authHeader =
      req.headers.authorization;


    if (!authHeader) {

      return res.status(401).json({

        message:
          "Authentication required",

      });

    }


    // --------------------------------------------------
    // CHECK BEARER TOKEN
    // --------------------------------------------------

    if (
      !authHeader.startsWith(
        "Bearer "
      )
    ) {

      return res.status(401).json({

        message:
          "Invalid authentication format",

      });

    }


    // --------------------------------------------------
    // EXTRACT TOKEN
    // --------------------------------------------------

    const token =
      authHeader.split(" ")[1];


    if (!token) {

      return res.status(401).json({

        message:
          "Authentication token is missing",

      });

    }


    // --------------------------------------------------
    // VERIFY TOKEN
    // --------------------------------------------------

    if (!process.env.JWT_SECRET) {

      console.error(
        "JWT_SECRET is not configured"
      );

      return res.status(500).json({

        message:
          "Authentication configuration error",

      });

    }


    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );


    // --------------------------------------------------
    // STORE USER INFORMATION
    // --------------------------------------------------

    req.user =
      decoded;


    // --------------------------------------------------
    // CONTINUE
    // --------------------------------------------------

    next();

  }

  catch (error) {

    console.error(
      "AUTH MIDDLEWARE ERROR:",
      error.message
    );


    return res.status(401).json({

      message:
        "Invalid or expired authentication token",

    });

  }

}


// ======================================================
// EXPORT
// ======================================================

module.exports =
  authMiddleware;