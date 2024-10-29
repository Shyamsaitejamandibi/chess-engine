import { create } from "zustand";
import { Move } from "chess.js";

// Define the Zustand store
interface ChessStore {
  isBoardFlipped: boolean;
  moves: Move[];
  userSelectedMoveIndex: number | null;
  setBoardFlipped: (flipped: boolean) => void;
  addMove: (move: Move) => void;
  setUserSelectedMoveIndex: (index: number | null) => void;
}

export const useChessStore = create<ChessStore>((set) => ({
  isBoardFlipped: false,
  moves: [],
  userSelectedMoveIndex: null,

  setBoardFlipped: (flipped) => set(() => ({ isBoardFlipped: flipped })),

  addMove: (move) => set((state) => ({ moves: [...state.moves, move] })),

  setUserSelectedMoveIndex: (index) =>
    set(() => ({ userSelectedMoveIndex: index })),
}));
