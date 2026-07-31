const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  shopName: user.shopName || "",
  shopPhone: user.shopPhone || "",
  shopAddress: user.shopAddress || "",
  logoUrl: user.logoUrl || "",
});

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      message: "Signup successful",
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.log("Signup error:", error);
    return res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

const signin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    return res.json({
      message: "Signin successful",
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    console.log("Signin error:", error);
    return res.status(500).json({
      message: "Signin failed",
      error: error.message,
    });
  }
};

const me = async (req, res) => {
  return res.json({
    user: serializeUser(req.user),
  });
};

const updateProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      shopName = "",
      shopPhone = "",
      shopAddress = "",
      logoUrl = "",
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: "Owner name and email are required",
      });
    }

    const existingUser = await User.findOne({
      _id: { $ne: req.user._id },
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name,
        email: email.toLowerCase(),
        shopName,
        shopPhone,
        shopAddress,
        logoUrl,
      },
      { new: true, runValidators: true }
    );

    return res.json({
      message: "Profile updated",
      user: serializeUser(user),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Profile update failed",
      error: error.message,
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const user = await User.findById(req.user._id);
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({
      message: "Password changed successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Password change failed",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.json({
        message: "If this email exists, a password reset link has been generated",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    return res.json({
      message: "Password reset link generated",
      resetUrl,
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Password reset request failed",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Reset token is invalid or expired",
      });
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return res.json({
      message: "Password reset successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Password reset failed",
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  signin,
  me,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
};
