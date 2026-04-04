// backend/src/routes/auth.ts
import { Router, Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { findUserByGoogleId, createUser, pool } from "../database";
import { authLimiter } from "../middleware/rateLimit";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();
const googleClient = new OAuth2Client(config.googleClientId);

// POST /api/auth/google
router.post("/google", authLimiter, async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ error: "Missing Google credential" });
      return;
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!googleId || !email || !name) {
      res.status(401).json({ error: "Incomplete Google profile data" });
      return;
    }

    const user = await createUser(googleId, email, name, picture || null);

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        name: user.name,
      },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name,
        profilePicture: user.profile_picture,
      },
    });
  } catch (error: any) {
    console.error("Auth error:", error.message || error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// GET /api/auth/me
router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Use the already-imported pool directly — no dynamic require needed
    const result = await pool.query(
      "SELECT * FROM users WHERE user_id = $1",
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const dbUser = result.rows[0];
    res.json({
      user: {
        id: dbUser.user_id,
        email: dbUser.email,
        name: dbUser.name,
        profilePicture: dbUser.profile_picture,
      },
    });
  } catch (error: any) {
    console.error("Me endpoint error:", error.message || error);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

export default router;