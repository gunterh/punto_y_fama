(function () {
    'use strict';

    // --- Game State ---
    let secretNumber = [];
    let currentGuess = [];
    let attempts = 0;
    const maxAttempts = 10;
    const messageResetDelayMS = 2500;
    const challengeTokenSeed = 'PYF_CHALLENGE_V1';
    let gameOver = false;
    let challengeCode = null;

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
    const modeLabel = document.getElementById('mode-label');
    const btnShare = document.getElementById('btn-share');
    const btnJoin = document.getElementById('btn-join');
    const btnSolo = document.getElementById('btn-solo');
    const joinCodeInput = document.getElementById('join-code-input');
    const shareMsg = document.getElementById('share-msg');

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

    function parseChallengeCode(rawValue) {
        const value = String(rawValue || '').trim();
        if (!/^\d{4}$/.test(value)) return null;
        const digits = value.split('').map(ch => parseInt(ch, 10));
        if (digits[0] === 0) return null;
        if (new Set(digits).size !== 4) return null;
        return digits;
    }

    function toBase64Url(value) {
        return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }

    function fromBase64Url(value) {
        const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
        return atob(padded);
    }

    function randomDigit() {
        if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            const buffer = new Uint8Array(1);
            do {
                window.crypto.getRandomValues(buffer);
            } while (buffer[0] >= 250);
            return buffer[0] % 10;
        }
        return Math.floor(Math.random() * 10);
    }

    function deriveKeyDigits(nonce) {
        let state = 2166136261;
        const seed = `${challengeTokenSeed}:${nonce}`;
        for (let i = 0; i < seed.length; i++) {
            state ^= seed.charCodeAt(i);
            state = Math.imul(state, 16777619) >>> 0;
        }

        const keyDigits = [];
        for (let i = 0; i < 4; i++) {
            state ^= (state << 13) >>> 0;
            state ^= state >>> 17;
            state ^= (state << 5) >>> 0;
            keyDigits.push((state >>> 0) % 10);
        }
        return keyDigits;
    }

    function encodeChallengeToken(codeDigits) {
        if (!Array.isArray(codeDigits) || codeDigits.length !== 4) return null;
        const nonceDigits = Array.from({ length: 4 }, () => randomDigit());
        const nonce = nonceDigits.join('');
        const keyDigits = deriveKeyDigits(nonce);
        const encryptedDigits = codeDigits.map((digit, i) => (digit + keyDigits[i]) % 10);
        const payload = `1${nonce}${encryptedDigits.join('')}`;
        return toBase64Url(payload);
    }

    function decodeChallengeToken(rawValue) {
        const direct = parseChallengeCode(rawValue);
        if (direct) return direct;

        try {
            const payload = fromBase64Url(rawValue);
            if (!/^1\d{8}$/.test(payload)) return null;

            const nonce = payload.slice(1, 5);
            const keyDigits = deriveKeyDigits(nonce);
            const encryptedDigits = payload.slice(5, 9).split('').map(ch => parseInt(ch, 10));
            const decrypted = encryptedDigits.map((digit, i) => (digit - keyDigits[i] + 10) % 10);
            return parseChallengeCode(decrypted.join(''));
        } catch (e) {
            return null;
        }
    }

    function getChallengeCodeFromQuery(params) {
        return decodeChallengeToken(params.get('challenge'));
    }

    function setChallengeInUrl(codeDigits) {
        const url = new URL(window.location.href);
        if (codeDigits) {
            const token = encodeChallengeToken(codeDigits);
            if (token) {
                url.searchParams.set('challenge', token);
            } else {
                url.searchParams.delete('challenge');
            }
        } else {
            url.searchParams.delete('challenge');
        }
        window.history.replaceState({}, '', url.toString());
    }

    function setModeLabel() {
        if (!modeLabel) return;
        modeLabel.textContent = `MODE: ${challengeCode ? 'FRIEND CHALLENGE' : 'SOLO'}`;
    }

    function showShareMessage(msg, isError) {
        if (!shareMsg) return;
        shareMsg.textContent = msg;
        shareMsg.style.color = isError ? '#ff3333' : '#00ccff';
        shareMsg.style.textShadow = isError ? '0 0 4px #ff3333' : '0 0 4px #00ccff';
        setTimeout(() => {
            shareMsg.textContent = '';
        }, messageResetDelayMS);
    }

    function extractChallengeCode(inputValue) {
        const raw = String(inputValue || '').trim();
        const direct = decodeChallengeToken(raw);
        if (direct) return direct;

        try {
            const parsedUrl = new URL(raw);
            return decodeChallengeToken(parsedUrl.searchParams.get('challenge'));
        } catch (e) {
            return null;
        }
    }

    async function shareChallenge() {
        const link = new URL(window.location.href);
        const token = encodeChallengeToken(secretNumber);
        if (!token) {
            showShareMessage('FAILED TO CREATE CHALLENGE LINK', true);
            return;
        }
        link.searchParams.set('challenge', token);
        const challengeLink = link.toString();

        try {
            await navigator.clipboard.writeText(challengeLink);
            showShareMessage('CHALLENGE LINK COPIED');
        } catch (e) {
            if (joinCodeInput) {
                joinCodeInput.value = challengeLink;
                joinCodeInput.focus();
                joinCodeInput.select();
            }
            showShareMessage('COPY LINK FROM INPUT FIELD');
        }
    }

    function joinChallenge() {
        const code = extractChallengeCode(joinCodeInput ? joinCodeInput.value : '');
        if (!code) {
            showShareMessage('INVALID CHALLENGE CODE OR LINK', true);
            return;
        }

        challengeCode = code;
        setChallengeInUrl(challengeCode);
        if (joinCodeInput) joinCodeInput.value = '';
        restartGame();
        showShareMessage('FRIEND CHALLENGE LOADED');
    }

    function switchToSoloMode() {
        challengeCode = null;
        setChallengeInUrl(null);
        if (joinCodeInput) joinCodeInput.value = '';
        restartGame();
        showShareMessage('SOLO MODE ENABLED');
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
        errorMsg.textContent = '';
    }

    // --- Restart Game ---
    function restartGame() {
        secretNumber = challengeCode ? [...challengeCode] : generateSecret();
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

        setModeLabel();
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
    btnShare.addEventListener('click', shareChallenge);
    btnJoin.addEventListener('click', joinChallenge);
    btnSolo.addEventListener('click', switchToSoloMode);

    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (joinCodeInput && document.activeElement === joinCodeInput && e.key === 'Enter') {
            e.preventDefault();
            joinChallenge();
            return;
        }
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
    const queryParams = new URLSearchParams(window.location.search);
    const hasChallengeQuery = queryParams.has('challenge');
    challengeCode = getChallengeCodeFromQuery(queryParams);
    if (hasChallengeQuery && !challengeCode) {
        setChallengeInUrl(null);
        showShareMessage('INVALID CHALLENGE LINK: STARTED SOLO', true);
    }
    restartGame();
})();
