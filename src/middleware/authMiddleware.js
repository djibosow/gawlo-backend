const jwt = require("jsonwebtoken");

const verifyAccessToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header is missing." });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token is missing from authorization header." });
    }

    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded user info to the request object
    req.user = decoded;
    next();
  } catch (error) {
    // Handle different JWT verification errors
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token has expired." });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token." });
    } else {
      return res.status(500).json({ message: "An error occurred while verifying the token." });
    }
  }
};

module.exports = { verifyAccessToken };
