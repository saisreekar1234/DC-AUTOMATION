const express =
  require("express");


const {
  getProjectMembers,
  assignUserToProject,
  updateProjectMember,
  removeUserFromProject,
  getMyProjects,
} =
  require(
    "../controllers/projectMemberController"
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
// MY ASSIGNED PROJECTS
// ======================================================
//
// This endpoint is available to any authenticated
// user.
//
// GET
// /api/project-members/my-projects
//
// ======================================================

router.get(
  "/my-projects",
  authMiddleware,
  getMyProjects
);


// ======================================================
// GET PROJECT MEMBERS
// ======================================================
//
// ADMIN ONLY
//
// GET
// /api/project-members/projects/:projectId
//
// ======================================================

router.get(
  "/projects/:projectId",
  authMiddleware,
  requireRole("admin"),
  getProjectMembers
);


// ======================================================
// ASSIGN USER TO PROJECT
// ======================================================
//
// ADMIN ONLY
//
// POST
// /api/project-members/projects/:projectId
//
// Body:
//
// {
//   "user_id": 5,
//   "permission_level": "member"
// }
//
// ======================================================

router.post(
  "/projects/:projectId",
  authMiddleware,
  requireRole("admin"),
  assignUserToProject
);


// ======================================================
// UPDATE PROJECT MEMBER
// ======================================================
//
// ADMIN ONLY
//
// PATCH
// /api/project-members/projects/:projectId/users/:userId
//
// ======================================================

router.patch(
  "/projects/:projectId/users/:userId",
  authMiddleware,
  requireRole("admin"),
  updateProjectMember
);


// ======================================================
// REMOVE USER FROM PROJECT
// ======================================================
//
// ADMIN ONLY
//
// DELETE
// /api/project-members/projects/:projectId/users/:userId
//
// ======================================================

router.delete(
  "/projects/:projectId/users/:userId",
  authMiddleware,
  requireRole("admin"),
  removeUserFromProject
);


// ======================================================
// EXPORT
// ======================================================

module.exports =
  router;