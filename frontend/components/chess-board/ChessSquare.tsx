import { Color, PieceSymbol, Square } from "chess.js";

const pieceUnicode: Record<PieceSymbol, Record<Color, string>> = {
  k: { w: "♔", b: "♚" },
  q: { w: "♕", b: "♛" },
  r: { w: "♖", b: "♜" },
  b: { w: "♗", b: "♝" },
  n: { w: "♘", b: "♞" },
  p: { w: "♙", b: "♟︎" },
};

interface ChessSquareProps {
  square: {
    square: Square;
    type: PieceSymbol;
    color: Color;
  } | null;
}

const ChessSquare: React.FC<ChessSquareProps> = ({ square }) => {
  return (
    <div className="h-full justify-center flex flex-col">
      {square ? (
        <span className="text-5xl">
          {pieceUnicode[square.type][square.color]}
        </span>
      ) : null}
    </div>
  );
};

export default ChessSquare;
