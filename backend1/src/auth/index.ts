import jwt from "jsonwebtoken";
import { WebSocket } from "ws";
import { User } from "../SocketManager";

const JWT_SECRET = process.env.JWT_SECRET;

export interface userJwtClaims {
  userId: string;
  name: string;
  isGuest: boolean;
}

export const extractAuthUser = (token: string, ws: WebSocket): User => {
  const decoded = jwt.verify(token, JWT_SECRET!) as userJwtClaims;
  console.log("decoded", decoded);
  return new User(ws, decoded);
};
