const BOARD_WIDTH = 7;
const BOARD_HEIGHT = 6;
const PLAYER_AI = 2;
const PLAYER_HUMAN = 1;
const WIN_LENGTH = 4;
const MAX_DEPTH = 4; // Depth limit for minimax to keep computation reasonable

class ConnectFourAI {
    board: number[][];

    constructor(board: number[][]) {
        this.board = board; //Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
    }

    public static copyBoard(board: number[][]): number[][] {
        return board.map(row => [...row]);
    }

    public findBestMove(): number {
        let bestScore = -Infinity;
        let alpha = -Infinity;
        let beta = Infinity;
        let bestMove = -1;
        
        for (let col = 0; col < BOARD_WIDTH; col++) {
            if (this.canPlay(this.board, col)) {
                const row = this.getAvailableRow(this.board, col);
                this.board[row][col] = PLAYER_AI;
                let score = this.minimax(this.board, MAX_DEPTH, false, alpha, beta);
                this.board[row][col] = 0; // Undo move

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = col;
                }
                alpha = Math.max(alpha, bestScore);
                if (beta <= alpha) break; // Beta cut-off
            }
        }
        return bestMove;
    }

    private minimax(board: number[][], depth: number, isMaximizing: boolean, alpha: number, beta: number): number {
        let result = this.checkWin(board);
        if (result !== null || depth === 0) {
            return result === null ? this.evaluateBoard(board) : (result === PLAYER_AI ? 10000 : -10000);
        }

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let col = 0; col < BOARD_WIDTH; col++) {
                if (this.canPlay(board, col)) {
                    const row = this.getAvailableRow(board, col);
                    board[row][col] = PLAYER_AI;
                    let score = this.minimax(board, depth - 1, false, alpha, beta);
                    board[row][col] = 0; // Undo the move
                    bestScore = Math.max(score, bestScore);
                    alpha = Math.max(alpha, bestScore);
                    if (beta <= alpha) break; // Beta cut-off
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let col = 0; col < BOARD_WIDTH; col++) {
                if (this.canPlay(board, col)) {
                    const row = this.getAvailableRow(board, col);
                    board[row][col] = PLAYER_HUMAN;
                    let score = this.minimax(board, depth - 1, true, alpha, beta);
                    board[row][col] = 0; // Undo the move
                    bestScore = Math.min(score, bestScore);
                    beta = Math.min(beta, bestScore);
                    if (beta <= alpha) break; // Alpha cut-off
                }
            }
            return bestScore;
        }
    }

    private canPlay(board: number[][], col: number): boolean {
        return board[0][col] === 0;
    }

    private getAvailableRow(board: number[][], col: number): number {
        for (let r = BOARD_HEIGHT - 1; r >= 0; r--) {
            if (board[r][col] === 0) return r;
        }
        return -1; // This should never happen with canPlay check
    }

    private checkWin(board: number[][]): number | null {
        // Check for horizontal wins
        for (let row = 0; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col <= BOARD_WIDTH - WIN_LENGTH; col++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row][col + 1] &&
                    board[row][col] === board[row][col + 2] &&
                    board[row][col] === board[row][col + 3]) {
                    return board[row][col];
                }
            }
        }
    
        // Check for vertical wins
        for (let col = 0; col < BOARD_WIDTH; col++) {
            for (let row = 0; row <= BOARD_HEIGHT - WIN_LENGTH; row++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row + 1][col] &&
                    board[row][col] === board[row + 2][col] &&
                    board[row][col] === board[row + 3][col]) {
                    return board[row][col];
                }
            }
        }
    
        // Check for diagonal wins (positive slope /)
        for (let row = 0; row <= BOARD_HEIGHT - WIN_LENGTH; row++) {
            for (let col = 0; col <= BOARD_WIDTH - WIN_LENGTH; col++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row + 1][col + 1] &&
                    board[row][col] === board[row + 2][col + 2] &&
                    board[row][col] === board[row + 3][col + 3]) {
                    return board[row][col];
                }
            }
        }
    
        // Check for diagonal wins (negative slope \)
        for (let row = WIN_LENGTH - 1; row < BOARD_HEIGHT; row++) {
            for (let col = 0; col <= BOARD_WIDTH - WIN_LENGTH; col++) {
                if (board[row][col] !== 0 && 
                    board[row][col] === board[row - 1][col + 1] &&
                    board[row][col] === board[row - 2][col + 2] &&
                    board[row][col] === board[row - 3][col + 3]) {
                    return board[row][col];
                }
            }
        }
    
        // Check if the board is full (draw condition)
        if (board.every(row => row.every(cell => cell !== 0))) {
            return 0; // Assuming 0 could represent a draw in this context
        }
    
        return null; // No win yet
    }

    private evaluateBoard(board: number[][]): number {
        let score = 0;

        const directions = [
            [0, 1],  // Horizontal
            [1, 0],  // Vertical
            [1, 1],  // Diagonal /
            [1, -1]  // Diagonal \
        ];

        for (let dr = 0; dr < directions.length; dr++) {
            const [dx, dy] = directions[dr];
            for (let x = 0; x < BOARD_HEIGHT; x++) {
                for (let y = 0; y < BOARD_WIDTH; y++) {
                    const window = [];
                    for (let i = 0; i < WIN_LENGTH; i++) {
                        const nx = x + dx * i;
                        const ny = y + dy * i;
                        if (nx >= 0 && nx < BOARD_HEIGHT && ny >= 0 && ny < BOARD_WIDTH) {
                            window.push(board[nx][ny]);
                        } else {
                            break;
                        }
                    }
                    
                    if (window.length === WIN_LENGTH) {
                        score += this.evaluateWindow(window);
                    }
                }
            }
        }

        return score;
    }

    private evaluateWindow(window: number[]): number {
        let aiCount = window.filter(player => player === PLAYER_AI).length;
        let humanCount = window.filter(player => player === PLAYER_HUMAN).length;
        let emptyCount = WIN_LENGTH - aiCount - humanCount;

        if (aiCount === 4) return 10000; // AI has won
        if (humanCount === 4) return -10000; // Human has won

        let score = 0;
        if (aiCount > 0 && humanCount === 0) {
            score += aiCount * 10;
            if (emptyCount === 1 && aiCount === 3) score += 50; // Very good position for AI
        } else if (humanCount > 0 && aiCount === 0) {
            score -= humanCount * 10;
            if (emptyCount === 1 && humanCount === 3) score -= 20; 
        }

        return score;
    }
}

export default ConnectFourAI;