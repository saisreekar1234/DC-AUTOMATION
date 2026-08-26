const projectMemberService =
  require("../services/projectMemberService");


// ======================================================
// GET PROJECT MEMBERS
// ======================================================

async function getProjectMembers(
  req,
  res
) {

  try {

    const members =
      await projectMemberService
        .getProjectMembers(
          req.params.projectId
        );


    res.json({

      project_id:
        Number(
          req.params.projectId
        ),

      count:
        members.length,

      members,

    });

  }

  catch (error) {

    console.error(
      "GET PROJECT MEMBERS ERROR:",
      error
    );


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch project members",

    });

  }

}


// ======================================================
// ASSIGN USER
// ======================================================

async function assignUserToProject(
  req,
  res
) {

  try {

    const {
      user_id,
      permission_level,
    } = req.body;


    if (!user_id) {

      return res.status(400).json({

        message:
          "user_id is required",

      });

    }


    const member =
      await projectMemberService
        .assignUserToProject(
          req.params.projectId,
          user_id,
          permission_level ||
            "member"
        );


    res.status(201).json({

      message:
        "User assigned to project successfully",

      member,

    });

  }

  catch (error) {

    console.error(
      "ASSIGN PROJECT USER ERROR:",
      error
    );


    res.status(400).json({

      message:
        error.message ||
        "Failed to assign user to project",

    });

  }

}


// ======================================================
// UPDATE MEMBER PERMISSION
// ======================================================

async function updateProjectMember(
  req,
  res
) {

  try {

    const {
      permission_level,
    } = req.body;


    if (!permission_level) {

      return res.status(400).json({

        message:
          "permission_level is required",

      });

    }


    const member =
      await projectMemberService
        .updateProjectMember(
          req.params.projectId,
          req.params.userId,
          permission_level
        );


    res.json({

      message:
        "Project member permission updated successfully",

      member,

    });

  }

  catch (error) {

    console.error(
      "UPDATE PROJECT MEMBER ERROR:",
      error
    );


    res.status(400).json({

      message:
        error.message ||
        "Failed to update project member",

    });

  }

}


// ======================================================
// REMOVE USER
// ======================================================

async function removeUserFromProject(
  req,
  res
) {

  try {

    const result =
      await projectMemberService
        .removeUserFromProject(
          req.params.projectId,
          req.params.userId
        );


    res.json({

      message:
        "User removed from project successfully",

      assignment:
        result,

    });

  }

  catch (error) {

    console.error(
      "REMOVE PROJECT USER ERROR:",
      error
    );


    res.status(400).json({

      message:
        error.message ||
        "Failed to remove user from project",

    });

  }

}


// ======================================================
// GET MY PROJECTS
// ======================================================

async function getMyProjects(
  req,
  res
) {

  try {

    const projects =
      await projectMemberService
        .getProjectsForUser(
          req.user.user_id
        );


    res.json({

      count:
        projects.length,

      projects,

    });

  }

  catch (error) {

    console.error(
      "GET MY PROJECTS ERROR:",
      error
    );


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch assigned projects",

    });

  }

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  getProjectMembers,

  assignUserToProject,

  updateProjectMember,

  removeUserFromProject,

  getMyProjects,

};