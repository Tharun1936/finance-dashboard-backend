const roleCheck = (roles = []) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Requires ${roles.join(' or ')} role`
      });
    }
    next();
  };
};

// Role-specific middleware
const requireViewer = roleCheck(['viewer', 'analyst', 'admin']);
const requireAnalyst = roleCheck(['analyst', 'admin']);
const requireAdmin = roleCheck(['admin']);

module.exports = {
  requireViewer,
  requireAnalyst,
  requireAdmin,
  roleCheck
};