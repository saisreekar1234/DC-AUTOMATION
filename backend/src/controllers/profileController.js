const userService = require("../services/userService");

async function getMyProfile(req, res) {
  try {
    const user = await userService.getUserById(req.user.user_id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (error) {
    console.error("GET MY PROFILE ERROR:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
}

async function updateMyProfile(req, res) {
  try {
    const { name, email } = req.body;
    const user = await userService.updateOwnProfile(req.user.user_id, { name, email });
    res.json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("UPDATE MY PROFILE ERROR:", error);
    res.status(error.statusCode || 400).json({ message: error.message || "Failed to update profile" });
  }
}

async function changeMyPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    await userService.changeOwnPassword(req.user.user_id, currentPassword, newPassword);
    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("CHANGE MY PASSWORD ERROR:", error);
    res.status(error.statusCode || 400).json({ message: error.message || "Failed to change password" });
  }
}

module.exports = { getMyProfile, updateMyProfile, changeMyPassword };
