import { Chess } from "chess.js";
import { WebSocket } from "ws";
import { GAME_OVER, INIT_GAME, MOVE } from "./messages";
import { z } from "zod";
import Redis from "ioredis";
require("dotenv").config();

// Zod schema for validating moves
const MoveSchema = z.object({
  from: z.string().length(2), // Ensure it's a valid square like "e2"
  to: z.string().length(2),
});

// Initialize Redis client

const redis = new Redis(process.env.REDIS_URL!);
export class Game {
  public player1: WebSocket;
  public player2: WebSocket;
  private roomId: string;
  public board: Chess;
  private moveCount = 0;

  constructor(player1: WebSocket, player2: WebSocket, roomId: string) {
    this.player1 = player1;
    this.player2 = player2;
    this.roomId = roomId;
    this.board = new Chess();

    // Initialize Redis room data
    redis.set(
      `game:${this.roomId}`,
      JSON.stringify({
        board: this.board.fen(), // Store the board's FEN (Forsyth–Edwards Notation)
        moves: [], // Track moves with respective colors
        moveCount: 0,
        gameOver: false,
      })
    );

    // Notify both players of game start
    this.player1.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "white",
          startTime: new Date(),
        },
      })
    );
    this.player2.send(
      JSON.stringify({
        type: INIT_GAME,
        payload: {
          color: "black",
          startTime: new Date(),
        },
      })
    );
  }

  async makeMove(
    player: WebSocket,
    move: {
      from: string;
      to: string;
    }
  ) {
    // Validate the move using Zod
    const parsedMove = MoveSchema.safeParse(move);
    if (!parsedMove.success) {
      player.send(
        JSON.stringify({
          type: "error",
          message: "Invalid move format.",
        })
      );
      return;
    }

    // Retrieve the game data from Redis
    const gameData = JSON.parse(
      (await redis.get(`game:${this.roomId}`)) || "{}"
    );

    if (gameData.gameOver) {
      player.send(
        JSON.stringify({
          type: "error",
          message: "Game is already over.",
        })
      );
      return;
    }

    const currentTurn = this.board.turn(); // 'w' or 'b'
    const currentPlayer =
      this.moveCount % 2 === 0 ? this.player1 : this.player2;

    // Ensure it's the correct player's turn
    if (player !== currentPlayer) {
      player.send(
        JSON.stringify({
          type: "error",
          message: "It's not your turn.",
        })
      );
      return;
    }

    // Try to make the move on the chess.js board
    try {
      const moveResult = this.board.move(parsedMove.data);
      if (!moveResult) {
        throw new Error("Illegal move.");
      }

      // Increment move count and store the move with the player's color
      this.moveCount++;

      gameData.moves.push({
        ...parsedMove.data,
        color: currentTurn === "w" ? "white" : "black",
      });

      // Check if the game is over
      if (this.board.isGameOver()) {
        const winner = this.board.turn() === "w" ? "black" : "white";

        gameData.gameOver = true;

        // Store game over state in Redis
        await redis.set(`game:${this.roomId}`, JSON.stringify(gameData));

        // Notify both players about the game over
        this.player1.send(
          JSON.stringify({
            type: GAME_OVER,
            payload: { winner },
          })
        );
        this.player2.send(
          JSON.stringify({
            type: GAME_OVER,
            payload: { winner },
          })
        );
        return;
      }

      // Store the updated board and moves in Redis
      gameData.board = this.board.fen();
      gameData.moveCount = this.moveCount;
      await redis.set(`game:${this.roomId}`, JSON.stringify(gameData));

      // Notify the other player about the move
      const nextPlayer = currentTurn === "w" ? this.player2 : this.player1;
      nextPlayer.send(
        JSON.stringify({
          type: MOVE,
          payload: parsedMove.data,
        })
      );
    } catch (e) {
      player.send(
        JSON.stringify({
          type: "error",
          message: (e as Error).message,
        })
      );
    }
  }
}
