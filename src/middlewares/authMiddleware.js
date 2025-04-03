import jwt from "jsonwebtoken";

export const ensureAuthenticated = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "User not authenticated, Log In" });
    }

    const token = authHeader.split(" ")[1]; 
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token, User must login" });
    }
};

export const ensureRole = (role) => {
    return (req, res, next) => {
        if (!req.user || (req.user.role !== role && role !== 'any')) {
            return res.status(403).json({ error: "User access denied, incorrect role" });
        }
        next();
    };
};
