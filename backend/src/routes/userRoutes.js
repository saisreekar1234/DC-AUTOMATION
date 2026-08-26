const express =
  require("express");


const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
} =
  require(
    "../controllers/userController"
  );


const authMiddleware =
  require(
    "../middleware/authMiddleware"
  );


const requireRole =
  require(
    "../middleware/roleMiddleware"
  );


const router =
  express.Router();


// ======================================================
// ALL ROUTES BELOW REQUIRE ADMIN
// ======================================================


// ======================================================
// GET ALL USERS
// ======================================================

router.get(
  "/",
  authMiddleware,
  requireRole("admin"),
  getUsers
);


// ======================================================
// GET ONE USER
// ======================================================

router.get(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  getUserById
);


// ======================================================
// CREATE USER
// ======================================================

router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  createUser
);


// ======================================================
// UPDATE USER
// ======================================================

router.patch(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  updateUser
);


// ======================================================
// RESET PASSWORD
// ======================================================

router.post(
  "/:id/reset-password",
  authMiddleware,
  requireRole("admin"),
  resetUserPassword
);


// ======================================================
// EXPORT
// ======================================================

module.exports =
  router;