# Lives & Levels Quiz

A command-line trivia game with **three difficulty levels, three lives, per-question timers and a saved high-score table**.

## Features
- Enter your name and choose Easy, Medium or Hard
  - Easy: 20s per question, 1 point each
  - Medium: 15s per question, 2 points each
  - Hard: 10s per question, 3 points each
- 3 lives (shown as hearts). A wrong answer or a timeout costs a life; 0 lives ends the game
- Per-question timer using `setTimeout`, with a 5-second warning
- Immediate feedback and a game-over summary
- Top-5 high scores saved to `highscores.json` (created automatically, ignored by git)

## Requirements
Node.js 18 or newer.

## Run / Test
```bash
node quiz.js      # or: npm start
npm test
```

## How it meets the lab requirements
| Requirement | Where |
|---|---|
| Start a game / view questions sequentially | `main`, `playGame` (`for...of`, `break` when lives run out) |
| Select answers + validation | `askQuestion`, `parseChoice` |
| Feedback on answers and at game over | `askQuestion`, `showSummary` |
| Timer | `setTimeout` per question + warning, `AbortController` to cancel the prompt |
| Arrays and objects | `questions` array, `DIFFICULTY` settings object, high-score array |
| Array iteration methods | `filter` (level), `reduce` (score), `map` (options), `sort` + `slice` (leaderboard), `forEach` (menus, table) |
| Error handling | `try/catch` around reading and writing the score file |
# Lives-and-levels-quiz-CLI
