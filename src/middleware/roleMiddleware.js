const authorizeRole = (requiredRole) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Non autorisé." });
  }

  if (req.user.role !== requiredRole) {
    return res.status(403).json({ message: "Accès interdit : permissions insuffisantes." });
  }

  next();
};

module.exports = { authorizeRole };