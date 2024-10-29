import { randomUUID } from "crypto";
import { userJwtClaims } from "./auth";
import { WebSocket } from "ws";

// isGuest is a boolean that indicates whether the user is a guest or not
export class User {
  public socket: WebSocket;
  public id: string;
  public userId: string;
  public name: string;
  public isGuest: boolean;

  constructor(socket: WebSocket, userJwtClaims: userJwtClaims) {
    this.socket = socket;
    this.userId = userJwtClaims.userId;
    this.id = randomUUID();
    this.name = userJwtClaims.name;
    this.isGuest = userJwtClaims.isGuest;
  }
}

class SocketManager {
  private static instance: SocketManager;
  private interstedSockets: Map<string, User[]>;
  private userRoomMappping: Map<string, string>;

  private constructor() {
    this.interstedSockets = new Map<string, User[]>();
    this.userRoomMappping = new Map<string, string>();
  }

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  // change in code
  addUserToRoom(roomId: string, user: User) {
    if (!this.interstedSockets.has(roomId)) {
      this.interstedSockets.set(roomId, []);
    }
    this.interstedSockets.get(roomId)!.push(user);
    this.userRoomMappping.set(user.userId, roomId);
  }

  // change in code
  broadcast(roomId: string, message: string) {
    if (this.interstedSockets.has(roomId)) {
      this.interstedSockets.get(roomId)!.forEach((user) => {
        user.socket.send(message);
      });
    }
  }

  // change in code
  removeUserFromRoom(user: User) {
    const roomId = this.userRoomMappping.get(user.userId);
    if (roomId) {
      const users = this.interstedSockets.get(roomId);
      if (users) {
        this.interstedSockets.set(
          roomId,
          users.filter((u) => u.userId !== user.userId)
        );
      }
      this.userRoomMappping.delete(user.userId);
    }
  }
}

export const socketManager = SocketManager.getInstance();
