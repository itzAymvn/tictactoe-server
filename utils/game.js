const winningCombinations = [
    [0, 1, 2], // top row
    [3, 4, 5], // middle row
    [6, 7, 8], // bottom row
    [0, 3, 6], // left column
    [1, 4, 7], // middle column
    [2, 5, 8], // right column
    [0, 4, 8], // left diagonal
    [2, 4, 6], // right diagonal
];

const checkWinner = (board) => {
    for (let i = 0; i < winningCombinations.length; i++) {
        const [a, b, c] = winningCombinations[i];

        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }

    return null;
};

const checkDraw = (board) => {
    // if every element in the board is not null, then it's a draw
    return board.every((element) => element !== "");
};

module.exports = {
    checkWinner,
    checkDraw,
};
