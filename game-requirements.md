# Punto y Fama Requirements

## Overview

Punto y Fama is a simple number-guessing game. The player tries to guess a secret 4-digit number within a limited number of attempts.

## Functional Requirements

1. The game must generate a secret 4-digit number where all digits are unique (no repeated digits).
2. The secret number must be generated deterministically using a script or external tool (not chosen mentally by the host).
3. The player must have exactly 10 attempts to guess the secret number.
4. Each player guess must be a 4-digit number with no repeated digits.
5. After each guess, the game must return feedback using:
   - `F` for each digit that is correct and in the correct position.
   - `.` for each digit that exists in the secret number but is in the wrong position.
6. Digits that do not exist in the secret number must not produce any feedback character.
7. The feedback output does not need to preserve the positions of the matched digits from the guess. Put dots first and then F's.
8. The game must end immediately with a win when the player guesses all 4 digits in the correct positions.
9. The game must end with a loss when the player uses all 10 attempts without guessing the secret number.

## Examples

### Example 1

- Secret number: `1234`
- Guess: `2345`
- Feedback: `...`

Explanation:
- `2`, `3`, and `4` exist in the secret number but are in the wrong positions.
- `5` does not exist in the secret number.

### Example 2

- Secret number: `1234`
- Guess: `1263`
- Feedback: `.FF`

Explanation:
- `1` is correct and in the correct position -> `F`
- `2` is correct and in the correct position -> `F`
- `3` exists in the secret number but is in the wrong position -> `.`
- `6` does not exist in the secret number
