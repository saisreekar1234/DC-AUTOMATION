const authService =
  require("../services/authService");


// ======================================================
// LOGIN
// ======================================================

async function login(
  req,
  res
) {

  try {

    const {
      email,
      password,
    } = req.body;


    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!email) {

      return res.status(400).json({

        message:
          "Email is required",

      });

    }


    if (!password) {

      return res.status(400).json({

        message:
          "Password is required",

      });

    }


    // --------------------------------------------------
    // LOGIN
    // --------------------------------------------------

    const result =
      await authService.loginUser(
        email,
        password
      );


    // --------------------------------------------------
    // RESPONSE
    // --------------------------------------------------

    res.status(200).json({

      message:
        "Login successful",

      token:
        result.token,

      user:
        result.user,

    });

  }

  catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );


    res.status(401).json({

      message:
        error.message ||
        "Login failed",

    });

  }

}


// ======================================================
// GET CURRENT USER
// ======================================================

async function getCurrentUser(
  req,
  res
) {

  try {

    const user =
      await authService.getUserById(
        req.user.user_id
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
      "GET CURRENT USER ERROR:",
      error
    );


    res.status(500).json({

      message:
        "Failed to fetch current user",

    });

  }

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  login,

  getCurrentUser,

};