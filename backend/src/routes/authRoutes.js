const express =
  require("express");

const {
  login,
  getCurrentUser,
} =
  require(
    "../controllers/authController"
  );

const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );


const router =
  express.Router();


// ======================================================
// LOGIN
// ======================================================

router.post(
  "/login",
  login
);


// ======================================================
// CURRENT USER
// ======================================================

router.get(
  "/me",
  authMiddleware,
  getCurrentUser
);


// ======================================================
// EXPORT
// ======================================================

module.exports =
  router;