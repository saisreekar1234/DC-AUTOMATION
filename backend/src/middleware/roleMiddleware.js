// ======================================================
// ROLE MIDDLEWARE
// ======================================================
//
// This middleware checks whether the authenticated
// user has one of the required system roles.
//
// IMPORTANT:
// authMiddleware must run BEFORE this middleware.
//
// Example:
//
// router.get(
//   "/",
//   authMiddleware,
//   requireRole("admin"),
//   getUsers
// );
//
// ======================================================


function requireRole(...allowedRoles) {

  return function (req, res, next) {

    // --------------------------------------------------
    // CHECK AUTHENTICATION
    // --------------------------------------------------

    if (!req.user) {

      return res.status(401).json({
        message:
          "Authentication required",
      });

    }


    // --------------------------------------------------
    // NORMALIZE ROLE
    // --------------------------------------------------

    const userRole =
      String(
        req.user.role || ""
      ).toLowerCase();


    // --------------------------------------------------
    // CHECK ROLE
    // --------------------------------------------------

    const hasPermission =
      allowedRoles.some(
        (role) =>
          String(role).toLowerCase() ===
          userRole
      );


    // --------------------------------------------------
    // ACCESS DENIED
    // --------------------------------------------------

    if (!hasPermission) {

      return res.status(403).json({

        message:
          "You do not have permission to perform this action",

      });

    }


    // --------------------------------------------------
    // ACCESS GRANTED
    // --------------------------------------------------

    next();

  };

}


// ======================================================
// EXPORT
// ======================================================

module.exports =
  requireRole;