import jwt from "jsonwebtoken";
import { WebSocket } from "ws";
import { User } from "../SocketManager";

const JWT_SECRET = process.env.JWT_SECRET;

export interface userJwtClaims {
  userId: string;
  name: string;
  isGuest: boolean;
}

export const extractAuthUser = (
  name: string,
  ws: WebSocket,
  userId: string
): User => {
  return new User(ws, name, userId);
};
