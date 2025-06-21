const admin = require("firebase-admin");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.split(" ")[1] : null;
    console.log("\nRequest Path:", req.originalUrl);

    console.log("headers token :", token ? "YES" : "NO")
    if (!token) return res.status(401).json({ message: "No token provided" });
    try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email
        };
        next();
    }
    catch (error) {
        console.error("Authentication error:", error);
        res.status(401).json({ message: "Invalid token" });
    }

}
module.exports = authMiddleware;