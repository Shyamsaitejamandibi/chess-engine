"use client";

import ChessBoard from "@/components/ChessBoard";
import { Button } from "@/components/ui/button";
import { useSocket } from "@/hooks/useSocket";
import { useEffect, useState } from "react";
import { Chess, Square } from "chess.js";

export const INIT_GAME = "init_game";
export const MOVE = "move";
export const GAME_OVER = "game_over";

export const Game = () => {
  const socket = useSocket();
  const [chess, setChess] = useState(new Chess());
  const [board, setBoard] = useState(chess.board());
  const [start, setStart] = useState(false);

  useEffect(() => {
    if (!socket) {
      return;
    }

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Message received", message);

      if (message.type === INIT_GAME) {
        console.log("Game started", message.payload);
        setBoard(chess.board()); // Reset the board to initial state
        setStart(true);
      } else if (message.type === MOVE) {
        const move = message.payload;
        chess.move(move); // Apply the move locally
        setBoard(chess.board()); // Update the board state after the move
        console.log("Move made", message.payload);
      } else if (message.type === GAME_OVER) {
        console.log("Game over", message.payload);
        // Handle game over logic here, if necessary
      }
    };

    return () => {
      socket.onmessage = null;
    };
  }, [chess, socket]);

  if (!socket) {
    return <div>Connecting...</div>;
  }

  return (
    <div>
      {!start && (
        <Button
          onClick={() => socket.send(JSON.stringify({ type: INIT_GAME }))}
        >
          Start Game
        </Button>
      )}
      <ChessBoard
        chess={chess}
        board={board}
        socket={socket}
        setBoard={setBoard}
      />
    </div>
  );
};

export default Game;
