const userService =
  require("../services/userService");


// ======================================================
// GET ALL USERS
// ======================================================

async function getUsers(
  req,
  res
) {

  try {

    const users =
      await userService.getUsers();


    res.json({

      count:
        users.length,

      users,

    });

  }

  catch (error) {

    console.error(
      "GET USERS ERROR:",
      error
    );


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch users",

    });

  }

}


// ======================================================
// GET USER BY ID
// ======================================================

async function getUserById(
  req,
  res
) {

  try {

    const user =
      await userService.getUserById(
        req.params.id
      );


    if (!user) {

      return res.status(404).json({

        message:
          "User not found",

      });

    }


    res.json({

      user,

    });

  }

  catch (error) {

    console.error(
      "GET USER ERROR:",
      error
    );


    res.status(500).json({

      message:
        error.message ||
        "Failed to fetch user",

    });

  }

}


// ======================================================
// CREATE USER
// ======================================================

async function createUser(
  req,
  res
) {

  try {

    const user =
      await userService.createUser(
        req.body
      );


    res.status(201).json({

      message:
        "User created successfully",

      user,

    });

  }

  catch (error) {

    console.error(
      "CREATE USER ERROR:",
      error
    );


    res.status(400).json({

      message:
        error.message ||
        "Failed to create user",

    });

  }

}


// ======================================================
// UPDATE USER
// ======================================================

async function updateUser(
  req,
  res
) {

  try {

    const user =
      await userService.updateUser(
        req.params.id,
        req.body
      );


    res.json({

      message:
        "User updated successfully",

      user,

    });

  }

  catch (error) {

    console.error(
      "UPDATE USER ERROR:",
      error
    );


    res.status(400).json({

      message:
        error.message ||
        "Failed to update user",

    });

  }

}


// ======================================================
// RESET PASSWORD
// ======================================================

async function resetUserPassword(
  req,
  res
) {

  try {

    const {
      password,
    } = req.body;


    const user =
      await userService.resetUserPassword(
        req.params.id,
        password
      );


    res.json({

      message:
        "User password reset successfully",

      user,

    });

  }

  catch (error) {

    console.error(
      "RESET PASSWORD ERROR:",
      error
    );


    res.status(400).json({

      message:
        error.message ||
        "Failed to reset password",

    });

  }

}


// ======================================================
// CURRENT USER PROFILE
// ======================================================

async function getMe(req, res) {
  try {
    const user = await userService.getUserById(req.user.user_id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("GET OWN PROFILE ERROR:", error);
    res.status(500).json({ message: error.message || "Failed to fetch profile" });
  }
}

async function updateMe(req, res) {
  try {
    const user = await userService.updateOwnProfile(req.user.user_id, req.body);
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("UPDATE OWN PROFILE ERROR:", error);
    res.status(400).json({ message: error.message || "Failed to update profile" });
  }
}

async function changeMyPassword(req, res) {
  try {
    await userService.changeOwnPassword(
      req.user.user_id,
      req.body.currentPassword,
      req.body.newPassword,
    );
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE OWN PASSWORD ERROR:", error);
    res.status(400).json({ message: error.message || "Failed to change password" });
  }
}

async function deactivateUser(req, res) {
  try {
    const user = await userService.deactivateUser(req.params.id, req.user.user_id);
    res.json({ message: "User account disabled successfully", user });
  } catch (error) {
    console.error("DEACTIVATE USER ERROR:", error);
    res.status(400).json({ message: error.message || "Failed to disable user" });
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  getUsers,

  getUserById,

  createUser,

  updateUser,

  resetUserPassword,
  getMe,
  updateMe,
  changeMyPassword,
  deactivateUser,

};