const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization || req.headers.Authorization
    const token = authHeader?.match(/^Bearer\s(.+)$/)?.[1] || null

    console.log("\nRequest Path:", req.originalUrl);
    console.log("headers token :", token ? "YES" : "NO")
    if (!token) return res.status(401).json({ error: "missing_token", message: "No token provided" });
    try {
        let decodedToken;
        if (/^ey[^.]+[.][^.]+[.]/.test(token)) {
            try {
                decodedToken = await admin.auth().verifyIdToken(token);
                req.user = {
                    uid: decodedToken.uid,
                    system: 'FIREBASE',
                    email: decodedToken.email
                }
            } catch (firebaseError) {
                decodedToken = jwt.verify(token, process.env.JWT_SECRET)
                req.user = {
                    userId: decodedToken.userId,
                    system: "JWT",
                    userId: decodedToken.userId
                }
            }
        } else {
            decodedToken = jwt.verify(token, process.env.JWT_SECRET)
            req.user = {
                system: "JWT",
                userId: decodedToken.userId
            }
        }
        console.log(`[Auth] ${req.user.system} auth successful`)
        next()
    } catch (e) {
        console.error("error in authMiddleware", e.message)
        const status = e.name === 'TokenExpiredError' ? 403 : 401;
        const errorType = e.code === 'auth/id-token-revoked'
            ? 'token_revoked'
            : 'invalid_token';
        res.status(status).json({ message: e.message, error: errorType || 'invalid_token' });
    }
}
module.exports = authMiddleware;