// User Controller (Admin only)
// Admins can manage other users here:
// - See all users
// - Get a specific user
// - Change someone's role
// - Activate or deactivate an account
// - Delete a user

const User = require('../models/user');

// --- GET ALL USERS ---
// GET /api/users
// Returns a paginated list of users, with optional filters
const getAllUsers = async (req, res) => {
  try {
    // Read query params for filtering and pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const role = req.query.role;
    const status = req.query.status;
    const search = req.query.search;

    // Build the filter object based on what was provided
    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.status = status;
    }

    // Search by username or email (case-insensitive)
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate how many records to skip for pagination
    const skip = (page - 1) * limit;

    // Run both queries at the same time using Promise.all (faster)
    const [users, totalUsers] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        users: users,
        pagination: {
          current: page,
          pages: Math.ceil(totalUsers / limit),
          total: totalUsers
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- GET USER BY ID ---
// GET /api/users/:id
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// --- UPDATE USER ROLE ---
// PATCH /api/users/:id/role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    // Admin should not be able to change their own role through this endpoint
    // That could accidentally lock them out
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own role'
      });
    }

    // Find user and update their role
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: role },
      { new: true, runValidators: true }  // new:true returns the updated doc
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User role changed to ${role}`,
      data: updatedUser
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// --- UPDATE USER STATUS ---
// PATCH /api/users/:id/status
// Use this to activate or deactivate an account
const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;

    // Don't let admin deactivate their own account
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot change your own account status'
      });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const statusMessage = status === 'active' ? 'activated' : 'deactivated';

    res.json({
      success: true,
      message: `User account has been ${statusMessage}`,
      data: updatedUser
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// --- DELETE USER ---
// DELETE /api/users/:id
// Permanently removes a user from the database
const deleteUser = async (req, res) => {
  try {
    // Admin should not be able to delete themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const deletedUser = await User.findByIdAndDelete(req.params.id);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User has been deleted permanently'
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  deleteUser
};
