import { Chess, Move, Square } from "chess.js";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages";
import { randomUUID } from "crypto";
import { socketManager, User } from "./SocketManager";
import Redis from "ioredis";
import db from "./db";
import { AuthProvider } from "@prisma/client";
import WebSocket from "ws"; // Import WebSocket type
require("dotenv").config();

type GAME_STATUS =
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ABANDONED"
  | "TIMEOUT"
  | "PLAYER_EXIT";
type GAME_RESULT = "WIN" | "LOSS" | "DRAW";

const GAME_TIMEOUT = 10 * 60 * 60 * 1000;

export function isPromotionMove(chess: Chess, from: Square, to: Square) {
  if (!chess.get(from)) return false;

  const piece = chess.get(from);

  if (piece?.type !== "p") return false;

  if (piece.color !== chess.turn()) return false;

  if (!["1", "8"].some((rank) => to.endsWith(rank))) return false;

  return chess
    .moves({ square: from, verbose: true })
    .map((move) => move.to)
    .includes(to);
}

// Initialize Redis client

const redis = new Redis(process.env.REDIS_URL!);

export class Game {
  public gameId: string;
  public player1UserId: string;
  public player2UserId: string | null;
  public board: Chess;
  private moveCount = 0;
  public result: GAME_RESULT | null = null;
  private timer: NodeJS.Timeout | null = null;
  private moveTimer: NodeJS.Timeout | null = null;
  private player1TimeConsumed = 0;
  private player2TimeConsumed = 0;
  private startTime = new Date(Date.now());
  private lastMoveTime = new Date(Date.now());

  constructor(
    player1UserId: string,
    player2UserId: string | null,
    gameId?: string,
    startTime?: Date
  ) {
    this.player1UserId = player1UserId;
    this.player2UserId = player2UserId;
    this.board = new Chess();
    this.gameId = gameId || randomUUID();
    if (startTime) {
      this.startTime = startTime;
      this.lastMoveTime = startTime;
    }
  }

  private serializeGame() {
    return {
      gameId: this.gameId,
      player1UserId: this.player1UserId,
      player2UserId: this.player2UserId,
    };
  }

  seedMoves(
    moves: {
      id: string;
      gameId: string;
      moveNumber: number;
      from: string;
      to: string;
      promotion?: string;
      timeTaken: number | null;
      createdAt: Date;
    }[]
  ) {
    moves.forEach((move) => {
      if (isPromotionMove(this.board, move.from as Square, move.to as Square)) {
        this.board.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });
      } else {
        this.board.move({ from: move.from, to: move.to });
      }
    });
    this.moveCount = moves.length;
    if (moves[moves.length - 1]) {
      this.lastMoveTime = moves[moves.length - 1].createdAt;
    }

    moves.map((move, index) => {
      if (move.timeTaken) {
        if (index % 2 === 0) {
          this.player1TimeConsumed += move.timeTaken;
        } else {
          this.player2TimeConsumed += move.timeTaken;
        }
      }
    });

    redis.set(`game:${this.gameId}`, JSON.stringify(this.serializeGame()));

    this.resetAbandonTimer();
    this.resetMoveTimer();
  }

  async updateSecondPlayer(player2UserId: string) {
    this.player2UserId = player2UserId;

    const users = await db.user.findMany({
      where: {
        id: {
          in: [this.player1UserId, this.player2UserId],
        },
      },
    });

    try {
      this.createGameInDBandRedis();
    } catch (e) {
      console.error(e);
      return;
    }

    const whitePlayer = users.find((user) => user.id === this.player1UserId);
    const blackPlayer = users.find((user) => user.id === this.player2UserId);

    socketManager.broadcast(
      this.gameId,
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          gameId: this.gameId,
          whitePlayer: {
            name: whitePlayer?.name,
            id: this.player1UserId,
            isGuest: whitePlayer?.provider === AuthProvider.GUEST,
          },
          blackPlayer: {
            name: blackPlayer?.name,
            id: this.player2UserId,
            isGuest: blackPlayer?.provider === AuthProvider.GUEST,
          },
          fen: this.board.fen(),
          moves: [],
        },
      })
    );
  }

  async createGameInDBandRedis() {
    this.startTime = new Date(Date.now());
    this.lastMoveTime = this.startTime;

    const game = await db.game.create({
      data: {
        id: this.gameId,
        status: "IN_PROGRESS",
        startAt: this.startTime,
        currentFen: this.board.fen(),
        whitePlayer: {
          connect: {
            id: this.player1UserId,
          },
        },
        blackPlayer: {
          connect: {
            id: this.player2UserId ?? "",
          },
        },
      },
      include: {
        blackPlayer: true,
        whitePlayer: true,
      },
    });

    redis.set(`game:${this.gameId}`, JSON.stringify(this.serializeGame()));
  }

  async addMoveToDB(move: Move, moveTimestamp: Date) {
    await db.$transaction([
      db.move.create({
        data: {
          gameId: this.gameId,
          moveNumber: this.moveCount,
          from: move.from,
          to: move.to,
          before: move.before,
          after: move.after,
          piece: this.board.get(move.from)?.type || "p",
          promotion: move.promotion,
          createdAt: moveTimestamp,
          san: move.san,
        },
      }),
      db.game.update({
        data: {
          currentFen: this.board.fen(),
        },
        where: {
          id: this.gameId,
        },
      }),
    ]);
  }
  async makeMove(user: User, move: Move) {
    const cachedGame = await redis.get(`game:${this.gameId}`);
    console.log(cachedGame);
    // if (cachedGame) {
    //   this.board.load(JSON.parse(cachedGame).board);
    // }
    // console.log(this.board.turn());
    // console.log(user.userId);
    // console.log(this.player1UserId);
    if (this.board.turn() === "w" && user.userId !== this.player1UserId) {
      console.log("Not your turn", this.board.turn(), user.userId);
      return;
    }

    if (this.board.turn() === "b" && user.userId !== this.player2UserId) {
      console.log("Not your turn", this.board.turn(), user.userId);
      return;
    }

    if (this.result) {
      console.log("Game is already over");
      return;
    }

    const moveTimestamp = new Date(Date.now());
    // console.log(move);
    try {
      if (isPromotionMove(this.board, move.from, move.to)) {
        this.board.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });
      } else {
        this.board.move({ from: move.from, to: move.to });
      }
    } catch (e) {
      console.error(e);
      return;
    }
    // console.log(this.board.fen());
    if (this.board.turn() === "w") {
      this.player1TimeConsumed =
        this.player1TimeConsumed +
        (moveTimestamp.getTime() - this.lastMoveTime.getTime());
    }
    // console.log(this.board.turn());
    if (this.board.turn() === "b") {
      this.player2TimeConsumed =
        this.player2TimeConsumed +
        (moveTimestamp.getTime() - this.lastMoveTime.getTime());
    }
    console.log(this.board.fen());
    await this.addMoveToDB(move, moveTimestamp);
    await this.addMoveToRedis(this.gameId, move); // Cache move in Redis
    await redis.set(
      `game:${this.gameId}`,
      JSON.stringify(this.serializeGame()),
      "EX",
      GAME_TIMEOUT / 1000
    ); // Update cached game state

    this.resetAbandonTimer();
    this.resetMoveTimer();

    this.lastMoveTime = moveTimestamp;

    socketManager.broadcast(
      this.gameId,
      JSON.stringify({
        type: MOVE,
        payload: {
          move,
          player1TimeConsumed: this.player1TimeConsumed,
          player2TimeConsumed: this.player2TimeConsumed,
        },
      })
    );

    if (this.board.isGameOver()) {
      const result = this.board.isDraw()
        ? "DRAW"
        : this.board.turn() === "b"
        ? "WIN"
        : "LOSS";
      this.endGame("COMPLETED", result);
    }

    this.moveCount++;
  }

  getPlayer1TimeConsumed() {
    if (this.board.turn() === "w") {
      return (
        this.player1TimeConsumed +
        (new Date(Date.now()).getTime() - this.lastMoveTime.getTime())
      );
    }
    return this.player1TimeConsumed;
  }

  getPlayer2TimeConsumed() {
    if (this.board.turn() === "b") {
      return (
        this.player2TimeConsumed +
        (new Date(Date.now()).getTime() - this.lastMoveTime.getTime())
      );
    }
    return this.player2TimeConsumed;
  }

  async resetAbandonTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.endGame("ABANDONED", this.board.turn() === "b" ? "LOSS" : "WIN");
    }, 60 * 1000);
  }

  async resetMoveTimer() {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
    }
    const turn = this.board.turn();
    const timeLeft =
      GAME_TIMEOUT -
      (turn === "w" ? this.player1TimeConsumed : this.player2TimeConsumed);

    this.moveTimer = setTimeout(() => {
      this.endGame("TIMEOUT", turn === "b" ? "LOSS" : "WIN");
    }, timeLeft);
  }

  async endGame(status: GAME_STATUS, result: GAME_RESULT) {
    const updatedGame = await db.game.update({
      data: {
        status,
        result: result,
      },
      where: {
        id: this.gameId,
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

    redis.del(`game:${this.gameId}`);

    socketManager.broadcast(
      this.gameId,
      JSON.stringify({
        type: GAME_OVER,
        payload: {
          status,
          result,
          moves: updatedGame.moves,
          whitePlayer: {
            name: updatedGame.whitePlayer.name,
            id: updatedGame.whitePlayer.id,
          },
          blackPlayer: {
            name: updatedGame.blackPlayer.name,
            id: updatedGame.blackPlayer.id,
          },
        },
      })
    );

    this.clearTimer();
    this.clearMoveTimer();
  }

  clearMoveTimer() {
    if (this.moveTimer) {
      clearTimeout(this.moveTimer);
    }
  }

  setTimer(timer: NodeJS.Timeout) {
    this.timer = timer;
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }
  async getGameState(gameId: string): Promise<Game | null> {
    const cachedGame = await redis.get(`game:${gameId}`);
    if (cachedGame) {
      return JSON.parse(cachedGame); // Return cached game if available
    }

    // If not in Redis, query the database and cache it in Redis
    const game = await db.game.findUnique({
      where: { id: gameId },
      include: {
        moves: true,
        whitePlayer: true,
        blackPlayer: true,
      },
    });

    if (game) {
      redis.set(`game:${gameId}`, JSON.stringify(game), "EX", GAME_TIMEOUT);
    }

    if (game) {
      const newGame = new Game(
        game.whitePlayer.id,
        game.blackPlayer?.id || null,
        game.id,
        game.startAt
      );
      if (game.currentFen) {
        newGame.board.load(game.currentFen);
      }
      newGame.moveCount = game.moves.length;
      newGame.player1TimeConsumed = game.moves
        .filter((_, index) => index % 2 === 0)
        .reduce((acc, move) => acc + ((move as any).timeTaken || 0), 0);
      newGame.player2TimeConsumed = game.moves
        .filter((_, index) => index % 2 !== 0)
        .reduce((acc, move) => acc + ((move as any).timeTaken || 0), 0);
      return newGame;
    }
    return null;
  }

  async addMoveToRedis(gameId: string, move: Move) {
    const redisKey = `game:${gameId}:moves`;
    await redis.rpush(redisKey, JSON.stringify(move));
  }

  async getMovesFromRedis(gameId: string) {
    const redisKey = `game:${gameId}:moves`;
    const moves = await redis.lrange(redisKey, 0, -1);
    return moves.map((move) => JSON.parse(move));
  }
  async getUser(userId: string): Promise<User | null> {
    const cachedUser = await redis.get(`user:${userId}`);
    if (cachedUser) {
      return JSON.parse(cachedUser); // Return cached user if available
    }

    // If not in Redis, query the database and cache it in Redis
    const user = await db.user.findUnique({ where: { id: userId } });

    if (user) {
      redis.set(`user:${userId}`, JSON.stringify(user), "EX", 60 * 60); // Cache user for 1 hour
    }

    if (user) {
      const completeUser: User = {
        ...user,
        socket: null as unknown as WebSocket, // or appropriate value
        userId: user.id,
        name: user.name ?? "", // Provide a default value if name is null
      };
      return completeUser;
    }
    return null;
  }
}
