import express, { Request, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import db from "./db";
import { v4 as uuidv4 } from "uuid";

const app = express();
app.use(cookieParser());
app.use(express.json());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:3000", // Update for production
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

interface UserDetails {
  id: string;
  token?: string;
  name: string;
  isGuest?: boolean;
}

interface userJwtClaims extends jwt.JwtPayload {
  userId: string;
  name: string;
  isGuest: boolean;
}

const JWT_SECRET = "test123";
export const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

app.post("/login", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const guestUUID = "guest-" + uuidv4();

    const user = await db.user.create({
      data: {
        username: guestUUID,
        email: `${guestUUID}@chess100x.com`,
        name: name || guestUUID,
        provider: "GUEST",
      },
    });

    const token = jwt.sign(
      { userId: user.id, name: user.name, isGuest: true },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const userDetails: UserDetails = {
      id: user.id,
      name: user.name || "Guest",
      token,
      isGuest: true,
    };

    res.cookie("guest", token, { maxAge: COOKIE_MAX_AGE, httpOnly: true });
    res.status(200).json(userDetails);
  } catch (error) {
    res.status(500).json({ message: "Login failed" });
  }
});

app.get("/user", async (req: Request, res: Response) => {
  console.log("req.cookies", req.cookies.guest);

  try {
    const token = req.cookies.guest;
    if (!token) {
      res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as userJwtClaims;
    const userDb = await db.user.findFirst({ where: { id: decoded.userId } });

    console.log("userDb", userDb);
    if (!userDb) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const refreshedToken = jwt.sign(
      { userId: userDb.id, name: userDb.name, isGuest: true },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.cookie("guest", refreshedToken, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
    });
    res.status(200).json({
      token: refreshedToken,
      id: userDb.id,
      name: userDb.name,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve user" });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("guest");
  res.json({ message: "Logged out!" });
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
