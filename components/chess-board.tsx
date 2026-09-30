import { Chess } from "chess.js";

const PIECES: Record<string, string> = {
  wk: "♔", wq: "♕", wr: "♖", wb: "♗", wn: "♘", wp: "♙",
  bk: "♚", bq: "♛", br: "♜", bb: "♝", bn: "♞", bp: "♟",
};

type ChessBoardProps = {
  fen: string;
  lastMove?: { from: string; to: string };
  compact?: boolean;
};

export function ChessBoard({ fen, lastMove, compact = false }: ChessBoardProps) {
  const game = new Chess(fen);
  const board = game.board();

  return (
    <div className={`board-shell ${compact ? "board-shell--compact" : ""}`}>
      <div className="chess-board" role="grid" aria-label="Current chess position">
        {board.flatMap((rank, rankIndex) =>
          rank.map((piece, fileIndex) => {
            const file = String.fromCharCode(97 + fileIndex);
            const rankLabel = String(8 - rankIndex);
            const square = `${file}${rankLabel}`;
            const isLight = (rankIndex + fileIndex) % 2 === 0;
            const isLast = square === lastMove?.from || square === lastMove?.to;
            const pieceKey = piece ? `${piece.color}${piece.type}` : "";
            const pieceName = piece ? `${piece.color === "w" ? "white" : "black"} ${piece.type}` : "empty";

            return (
              <div
                className={`square ${isLight ? "square--light" : "square--dark"} ${isLast ? "square--last" : ""}`}
                key={square}
                role="gridcell"
                aria-label={`${square}, ${pieceName}`}
              >
                {fileIndex === 0 ? <span className="rank-label">{rankLabel}</span> : null}
                {rankIndex === 7 ? <span className="file-label">{file}</span> : null}
                {piece ? (
                  <span className={`piece piece--${piece.color}`} aria-hidden="true">{PIECES[pieceKey]}</span>
                ) : null}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
