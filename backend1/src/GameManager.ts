import { WebSocket } from "ws";
import { INIT_GAME, MOVE } from "./messages";
import { Game } from "./Game";
import Redis from "ioredis";
require("dotenv").config();

const redis = new Redis(process.env.REDIS_URL!);

export class GameManager {
  private games: Map<string, Game>; // Store games by roomId
  private pendingUser: WebSocket | null;
  private users: WebSocket[];

  constructor() {
    this.games = new Map();
    this.pendingUser = null;
    this.users = [];
  }

  addUser(socket: WebSocket) {
    this.users.push(socket);
    this.addHandler(socket);
  }

  removeUser(socket: WebSocket) {
    this.users = this.users.filter((user) => user !== socket);
  }

  private addHandler(socket: WebSocket) {
    socket.on("message", async (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === INIT_GAME) {
        if (this.pendingUser) {
          const roomId = `${new Date().getTime()}`; // Generate unique room ID

          const game = new Game(this.pendingUser, socket, roomId);
          this.games.set(roomId, game);

          // Store game information in Redis
          await redis.set(
            `game:${roomId}`,
            JSON.stringify({
              board: game.board.fen(), // Initial FEN
              moves: [],
              moveCount: 0,
              gameOver: false,
            })
          );

          this.pendingUser = null;
        } else {
          this.pendingUser = socket;
        }
      }

      if (message.type === MOVE) {
        const roomId = this.getRoomIdForSocket(socket);
        if (roomId) {
          const game = this.games.get(roomId);
          if (game) {
            game.makeMove(socket, message.payload.move);
          }
        }
      }
    });

    socket.on("close", () => {
      // Handle user disconnection
      this.removeUser(socket);
      if (this.pendingUser === socket) {
        this.pendingUser = null; // Reset pending user if they disconnect
      }
    });
  }

  private getRoomIdForSocket(socket: WebSocket): string | undefined {
    for (const [roomId, game] of this.games) {
      if (game.player1 === socket || game.player2 === socket) {
        return roomId;
      }
    }
    return undefined;
  }
}
