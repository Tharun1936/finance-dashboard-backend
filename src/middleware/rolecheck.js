// Role check middleware - controls what each user role is allowed to do
//
// The system has 3 roles:
//   viewer  - can only read/view data
//   analyst - can create, read, update, delete records
//   admin   - full access including user management

// This function takes a list of allowed roles and returns a middleware
// Example use: router.get('/something', roleCheck(['admin', 'analyst']), handler)
const roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    // Check if the logged-in user's role is in the allowed list
    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires: ${allowedRoles.join(' or ')} role. You are a ${userRole}.`
      });
    }

    // Role is allowed, continue
    next();
  };
};

// Pre-built middleware for common role checks
// This way we don't repeat the arrays everywhere

// Anyone who is logged in can access (viewer, analyst, admin)
const requireViewer = roleCheck(['viewer', 'analyst', 'admin']);

// Only analyst or admin can access
const requireAnalyst = roleCheck(['analyst', 'admin']);

// Only admin can access
const requireAdmin = roleCheck(['admin']);

module.exports = {
  requireViewer,
  requireAnalyst,
  requireAdmin,
  roleCheck
};