(function () {
    'use strict';

    // --- Game State ---
    let secretNumber = [];
    let currentGuess = [];
    let attempts = 0;
    const maxAttempts = 10;
    let gameOver = false;

    // --- DOM Elements ---
    const attemptsDisplay = document.getElementById('attempts-left');
    const gameStatus = document.getElementById('game-status');
    const guessHistory = document.getElementById('guess-history');
    const digitBoxes = [
        document.getElementById('d0'),
        document.getElementById('d1'),
        document.getElementById('d2'),
        document.getElementById('d3')
    ];
    const errorMsg = document.getElementById('error-msg');
    const gameScreen = document.getElementById('game-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const btnRestart = document.getElementById('btn-restart');
    const btnDelete = document.getElementById('btn-delete');
    const btnSubmit = document.getElementById('btn-submit');

    // --- Generate Secret Number ---
    function generateSecret() {
        const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        // Fisher-Yates shuffle
        for (let i = digits.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [digits[i], digits[j]] = [digits[j], digits[i]];
        }
        // Pick first 4, but ensure first digit is not 0
        let result = digits.slice(0, 4);
        if (result[0] === 0) {
            // Swap with a non-zero digit from elsewhere
            for (let k = 4; k < digits.length; k++) {
                if (digits[k] !== 0) {
                    [result[0], digits[k]] = [digits[k], result[0]];
                    break;
                }
            }
        }
        return result;
    }

    // --- Evaluate Guess ---
    function evaluate(guess, secret) {
        let famas = 0;
        let puntos = 0;

        for (let i = 0; i < 4; i++) {
            if (guess[i] === secret[i]) {
                famas++;
            } else if (secret.includes(guess[i])) {
                puntos++;
            }
        }

        return { famas, puntos };
    }

    // --- Render Feedback ---
    function renderFeedback(famas, puntos) {
        let html = '';
        for (let i = 0; i < puntos; i++) {
            html += '<span class="p-char">.</span>';
        }
        for (let i = 0; i < famas; i++) {
            html += '<span class="f-char">F</span>';
        }
        if (famas === 0 && puntos === 0) {
            html = '<span style="color:#666">—</span>';
        }
        return html;
    }

    // --- Update Digit Display ---
    function updateDigitDisplay() {
        for (let i = 0; i < 4; i++) {
            if (i < currentGuess.length) {
                digitBoxes[i].textContent = currentGuess[i];
                digitBoxes[i].classList.add('filled');
                digitBoxes[i].classList.remove('active');
            } else if (i === currentGuess.length) {
                digitBoxes[i].textContent = '_';
                digitBoxes[i].classList.remove('filled');
                digitBoxes[i].classList.add('active');
            } else {
                digitBoxes[i].textContent = '_';
                digitBoxes[i].classList.remove('filled', 'active');
            }
        }
    }

    // --- Add Digit ---
    function addDigit(digit) {
        if (gameOver || currentGuess.length >= 4) return;
        clearError();
        currentGuess.push(digit);
        updateDigitDisplay();
    }

    // --- Delete Digit ---
    function deleteDigit() {
        if (gameOver || currentGuess.length === 0) return;
        clearError();
        currentGuess.pop();
        updateDigitDisplay();
    }

    // --- Submit Guess ---
    function submitGuess() {
        if (gameOver) return;

        if (currentGuess.length !== 4) {
            showError('ENTER 4 DIGITS');
            return;
        }

        // Check for duplicate digits
        const unique = new Set(currentGuess);
        if (unique.size !== 4) {
            showError('NO REPEATED DIGITS');
            return;
        }

        attempts++;
        const result = evaluate(currentGuess, secretNumber);

        // Add to history
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
            <span class="attempt-num">${String(attempts).padStart(2, '0')}</span>
            <span class="guess-digits">${currentGuess.join('')}</span>
            <span class="feedback">${renderFeedback(result.famas, result.puntos)}</span>
        `;
        guessHistory.appendChild(row);
        guessHistory.scrollTop = guessHistory.scrollHeight;

        // Update HUD
        attemptsDisplay.textContent = maxAttempts - attempts;

        // Check win
        if (result.famas === 4) {
            endGame(true);
            return;
        }

        // Check loss
        if (attempts >= maxAttempts) {
            endGame(false);
            return;
        }

        // Reset for next guess
        currentGuess = [];
        updateDigitDisplay();
    }

    // --- End Game ---
    function endGame(won) {
        gameOver = true;
        gameStatus.textContent = won ? 'YOU WIN!' : 'GAME OVER';
        gameStatus.style.color = won ? '#00ff41' : '#ff3333';

        setTimeout(() => {
            gameScreen.classList.add('hidden');
            gameOverScreen.classList.remove('hidden');

            if (won) {
                resultTitle.textContent = 'VICTORY!';
                resultTitle.className = 'blink win';
                resultMessage.textContent = `CODE CRACKED IN ${attempts} ATTEMPT${attempts > 1 ? 'S' : ''}`;
            } else {
                resultTitle.textContent = 'GAME OVER';
                resultTitle.className = 'blink lose';
                resultMessage.textContent = `THE CODE WAS: ${secretNumber.join('')}`;
            }
        }, 600);
    }

    // --- Error Handling ---
    function showError(msg) {
        errorMsg.textContent = msg;
        setTimeout(() => clearError(), 2000);
    }

    function clearError() {
        errorMsg.innerHTML = '&nbsp;';
    }

    // --- Restart Game ---
    function restartGame() {
        secretNumber = generateSecret();
        currentGuess = [];
        attempts = 0;
        gameOver = false;

        attemptsDisplay.textContent = maxAttempts;
        gameStatus.textContent = 'PLAYING';
        gameStatus.style.color = '#00ff41';
        guessHistory.innerHTML = '';
        clearError();

        gameOverScreen.classList.add('hidden');
        gameScreen.classList.remove('hidden');

        updateDigitDisplay();
    }

    // --- Event Listeners ---
    document.querySelectorAll('.num-btn[data-digit]').forEach(btn => {
        btn.addEventListener('click', () => {
            addDigit(parseInt(btn.dataset.digit, 10));
        });
    });

    btnDelete.addEventListener('click', deleteDigit);
    btnSubmit.addEventListener('click', submitGuess);
    btnRestart.addEventListener('click', restartGame);

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (e.key >= '0' && e.key <= '9') {
            addDigit(parseInt(e.key, 10));
        } else if (e.key === 'Backspace') {
            deleteDigit();
        } else if (e.key === 'Enter') {
            if (gameOver && !gameOverScreen.classList.contains('hidden')) {
                restartGame();
            } else {
                submitGuess();
            }
        }
    });

    // --- Initialize ---
    restartGame();
})();
