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
// EXPORT
// ======================================================

module.exports = {

  getUsers,

  getUserById,

  createUser,

  updateUser,

  resetUserPassword,

};