import { WebSocket } from "ws";
import {
  EXIT_GAME,
  GAME_ADDED,
  GAME_ALERT,
  GAME_ENDED,
  GAME_JOINED,
  GAME_NOT_FOUND,
  INIT_GAME,
  JOIN_ROOM,
  MOVE,
} from "./messages";
import { Game } from "./Game";
import db from "./db";
import { socketManager, User } from "./SocketManager";

import Redis from "ioredis";
import { GameStatus } from "@prisma/client";
require("dotenv").config();

const redis = new Redis(process.env.REDIS_URL!);

export class GameManager {
  private games: Game[]; // Store games by roomId
  private pendingGameId: string | null;
  private users: User[];

  constructor() {
    this.games = [];
    this.pendingGameId = null;
    this.users = [];
  }

  async addUser(user: User) {
    this.users.push(user);
    this.addHandler(user);

    // Cache user information for faster lookup later
    await redis.set(`user:${user.userId}`, JSON.stringify(user), "EX", 3600); // Expires in 1 hour
  }

  removeUser(socket: WebSocket) {
    const user = this.users.find((user) => user.socket !== socket);
    if (!user) return;

    this.users = this.users.filter((user) => user.socket !== socket);
    socketManager.removeUserFromRoom(user);

    // Remove user from Redis cache when they disconnect
    redis.del(`user:${user.userId}`);
  }

  removeGame(gameId: string) {
    this.games = this.games.filter((game) => game.gameId !== gameId);

    // Remove game from Redis cache
    redis.del(gameId);
  }

  private async addHandler(user: User) {
    user.socket.on("message", async (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === INIT_GAME) {
        if (this.pendingGameId) {
          const game = this.games.find(
            (game) => game.gameId === this.pendingGameId
          );
          if (!game) return;

          if (user.userId === game.player1UserId) {
            socketManager.broadcast(
              game.gameId,
              JSON.stringify({
                type: GAME_ALERT,
                payload: {
                  message: "Trying to Connect with yourself?",
                },
              })
            );
            return;
          }
          socketManager.addUserToRoom(game.gameId, user);
          await redis.set(
            game.gameId,
            JSON.stringify({
              player1: game.player1UserId,
              player2: user.userId,
            }),
            "EX",
            3600 // Set expiration of 1 hour
          );
          await game?.updateSecondPlayer(user.userId);
          this.pendingGameId = null;
        } else {
          const newGame = new Game(user.userId, null);
          this.games.push(newGame);
          this.pendingGameId = newGame.gameId;
          socketManager.addUserToRoom(newGame.gameId, user);

          // Cache new game state in Redis
          await redis.set(
            newGame.gameId,
            JSON.stringify({ player1: user.userId }),
            "EX",
            3600 // Set expiration of 1 hour
          );
          socketManager.broadcast(
            newGame.gameId,
            JSON.stringify({
              type: GAME_ADDED,
              gameId: newGame.gameId,
            })
          );
        }
      }

      if (message.type === MOVE) {
        const gameId = message.payload.gameId;
        const game = this.games.find((game) => game.gameId === gameId);
        // console.log(game);
        if (game) {
          game.makeMove(user, message.payload.move);
          if (game.result) {
            this.removeGame(gameId);
          }

          // Update the game state in Redis after each move
          await redis.set(
            gameId,
            JSON.stringify({
              player1: game.player1UserId,
              player2: game.player2UserId,
              moves: await game.getMovesFromRedis(gameId),
            }),
            "EX",
            3600 // Reset the expiration timer
          );
        }
      }

      if (message.type === EXIT_GAME) {
        const gameId = message.payload.gameId;
        const game = this.games.find((game) => game.gameId === gameId);
        if (game) {
          this.removeGame(gameId);

          // Remove game from Redis when it ends
          await redis.del(gameId);
        }
      }

      if (message.type === JOIN_ROOM) {
        const gameId = message.payload?.gameId;
        if (!gameId) return;

        let availableGame = this.games.find((game) => game.gameId === gameId);
        // console.log(availableGame);
        const gameFromRedis = await redis.get(gameId);
        const gameFromDb = await db.game.findUnique({
          where: {
            id: gameId,
          },
          include: {
            moves: {
              orderBy: {
                moveNumber: "asc",
              },
            },
            blackPlayer: true,
            whitePlayer: true,
          },
        });

        if (!gameFromDb || !gameFromRedis) {
          user.socket.send(
            JSON.stringify({
              type: GAME_NOT_FOUND,
            })
          );
          return;
        }

        if (availableGame && !availableGame.player2UserId) {
          socketManager.addUserToRoom(gameId, user);
          await availableGame.updateSecondPlayer(user.userId);

          // Update game state in Redis
          await redis.set(
            gameId,
            JSON.stringify({
              player1: availableGame.player1UserId,
              player2: user.userId,
            }),
            "EX",
            3600
          );
          return;
        }

        if (gameFromDb.status !== GameStatus.IN_PROGRESS) {
          user.socket.send(
            JSON.stringify({
              type: GAME_ENDED,
              payload: {
                result: gameFromDb.result,
                status: gameFromDb.status,
                moves: gameFromDb.moves,
                blackPlayer: {
                  id: gameFromDb.blackPlayer.id,
                  name: gameFromDb.blackPlayer.name,
                },
                whitePlayer: {
                  id: gameFromDb.whitePlayer.id,
                  name: gameFromDb.whitePlayer.name,
                },
              },
            })
          );
          return;
        }

        if (!availableGame) {
          const game = new Game(
            gameFromDb.whitePlayerId,
            gameFromDb.blackPlayerId,
            gameFromDb.id,
            gameFromDb.startAt
          );
          game.seedMoves(
            gameFromDb.moves.map((move) => ({
              ...move,
              promotion: move.promotion || undefined,
            })) || []
          );

          this.games.push(game);
          availableGame = game;
        }

        // Cache the available game state and send it to the user
        await redis.set(
          gameId,
          JSON.stringify({
            player1: availableGame.player1UserId,
            player2: availableGame.player2UserId,
            moves: availableGame.getMovesFromRedis(gameId),
          }),
          "EX",
          3600
        );

        user.socket.send(
          JSON.stringify({
            type: GAME_JOINED,
            payload: {
              gameId,
              moves: gameFromDb.moves,
              blackPlayer: {
                id: gameFromDb.blackPlayer.id,
                name: gameFromDb.blackPlayer.name,
              },
              whitePlayer: {
                id: gameFromDb.whitePlayer.id,
                name: gameFromDb.whitePlayer.name,
              },
              player1TimeConsumed: availableGame.getPlayer1TimeConsumed(),
              player2TimeConsumed: availableGame.getPlayer2TimeConsumed(),
            },
          })
        );
        socketManager.addUserToRoom(gameId, user);
      }
    });
  }
}
