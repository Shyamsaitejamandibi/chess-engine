"use client";

import { MOVE } from "@/app/game/page";
import { Color, PieceSymbol, Square } from "chess.js";
import { useState } from "react";

const pieceUnicode: Record<PieceSymbol, Record<Color, string>> = {
  k: { w: "♔", b: "♚" },
  q: { w: "♕", b: "♛" },
  r: { w: "♖", b: "♜" },
  b: { w: "♗", b: "♝" },
  n: { w: "♘", b: "♞" },
  p: { w: "♙", b: "♟︎" },
};

export const ChessBoard = ({
  board,
  socket,
  setBoard,
  chess,
}: {
  board: ({
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null)[][];
  socket: WebSocket;
  setBoard: (board: any) => void;
  chess: any;
}) => {
  const [from, setFrom] = useState<Square | null>(null);
  const [to, setTo] = useState<Square | null>(null);

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-2xl aspect-square">
        <div className="grid grid-cols-8 h-full">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const square = `${"abcdefgh"[colIndex]}${8 - rowIndex}` as Square;
              return (
                <div
                  key={square}
                  onClick={() => {
                    if (!from) {
                      setFrom(square);
                      console.log("Setting from", square);
                    } else {
                      console.log(
                        "Sending move",
                        JSON.stringify({
                          type: MOVE,
                          payload: { from, to: square },
                        })
                      );
                      socket.send(
                        JSON.stringify({
                          type: MOVE,
                          payload: { move: { from, to: square } },
                        })
                      ); // Send the move to the server
                      setFrom(null); // Reset the from state
                      chess.move({ from, to: square });
                      setBoard(chess.board());
                    }
                  }}
                  className={`
                      flex items-center justify-center
                      ${
                        (rowIndex + colIndex) % 2 === 0
                          ? "bg-amber-200"
                          : "bg-amber-800"
                      }
                      ${piece ? "cursor-pointer hover:opacity-75" : ""}
                    `}
                >
                  {piece && (
                    <div
                      className={`text-4xl sm:text-5xl md:text-6xl ${
                        piece.color === "w" ? "text-gray-100" : "text-gray-900"
                      }`}
                    >
                      {pieceUnicode[piece.type][piece.color]}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
export default ChessBoard;
