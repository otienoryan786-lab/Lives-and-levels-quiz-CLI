#!/usr/bin/env node
/**
 * Lives and levels quiz - a CLI trivia game that tests your knowledge of the lives and levels of various video games.
 * three lives per question, and you can level up by answering correctly. The game ends when you run out of lives or complete all questions. Per question timers are included.
 * a saved high score feature is included, allowing players to track their progress over time.
 * Run with:  node quiz.js
 * Requires: Node.js 18 or newer., fs module for file operations, path module for handling file paths, readline module for user input, and process module for handling standard input/output.
 */
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { stdin: input, stdout: output } = require('node:process');

// CONFIGURATION AND DATA
const MAX_LIVES = 3;
const WARNING_AT = 5; // seconds remaining to warn the player
const TIME_PER_QUESTION = 15; // seconds per question
const HIGH_SCORE_FILE = path.join(__dirname, 'highscore.json');
const HIGH_SCORE_KEY = 'highScore';
const HIGH_SCORE_DEFAULT = 0;
const HIGH_SCORE_MESSAGE = 'High Score: ';
const HIGH_SCORE_SAVE_MESSAGE = 'High score saved!';
const HIGH_SCORE_LOAD_ERROR = 'Error loading high score. Starting fresh.';
const HIGH_SCORE_SAVE_ERROR = 'Error saving high score.';
const HIGH_SCORE_RESET_MESSAGE = 'High score reset to 0.';
const HIGH_SCORE_RESET_ERROR = 'Error resetting high score.';
const HIGH_SCORE_RESET_CONFIRM = 'Are you sure you want to reset the high score? (y/n): ';
const HIGH_SCORE_RESET_CONFIRM_YES = 'y';
const HIGH_SCORE_RESET_CONFIRM_NO = 'n';
const HIGH_SCORE_RESET_CONFIRM_INVALID = 'Invalid input. Please enter "y" or "n".';
const HIGH_SCORE_RESET_CONFIRM_CANCELLED = 'High score reset cancelled.';
const HIGH_SCORE_RESET_CONFIRM_SUCCESS = 'High score has been reset.';
const HIGH_SCORE_RESET_CONFIRM_FAILURE = 'Failed to reset high score.';
const HIGH_SCORE_RESET_CONFIRM_ERROR = 'Error during high score reset confirmation.';
const HIGH_SCORE_RESET_CONFIRM_TIMEOUT = 10000; // 10 seconds to respond
const HIGH_SCORE_RESET_CONFIRM_TIMEOUT_MESSAGE = 'No response received. High score reset cancelled.';
const HIGH_SCORE_RESET_CONFIRM_TIMEOUT_ERROR = 'Error during high score reset confirmation timeout.';
const HIGH_SCORE_RESET_CONFIRM_TIMEOUT_SUCCESS = 'High score reset due to timeout.';
const HIGH_SCORE_RESET_CONFIRM_TIMEOUT_FAILURE = 'Failed to reset high score due to timeout.';
const HIGH_SCORE_LIMIT = 5; // maximum number of high scores to keep

//** Each level changes the time limit for answering questions, making the game progressively harder and points awarded for correct answers increase with each level. The game ends when the player runs out of lives or completes all questions. */
const DIFFICULTY_LEVELS = {
    easy: { label: 'Easy', timeLimit: 15, points: 10 },
    medium: { label: 'Medium', timeLimit: 10, points: 20 },
    hard: { label: 'Hard', timeLimit: 5, points: 30 }
};

/** `answer` is the 0-based index of the correct answer in the `options` array. */
const questions = [
    // Easy Level Questions
    {
        difficulty: "easy",
        question: "What is the capital of France?",
        options: ["London", "Berlin", "Paris", "Madrid"],
        answer: 2
    },
    {
        difficulty: "easy",
        question: "Which symbol starts a single-line comment in JavaScript?",
        options: ["//", "#", "<!--", "**"],
        answer: 0,
    },
    {
        difficulty: "easy",
        question: "What is the largest planet in our solar system?",
        options: ["Earth", "Jupiter", "Saturn", "Mars"],
        answer: 1
    },
    {
        difficulty: "easy",
        question: "Which keyword declares a variable that CAN be reassigned (block-scoped)?",
        options: ["const", "let", "define", "fixed"],
        answer: 1,
    },

    // Medium Level Questions
    {
        difficulty: "medium",
        question: "What is the output of the following code snippet?\n\nconsole.log(typeof NaN);",
        options: ["number", "NaN", "undefined", "object"],
        answer: 0,
    },
    {
        difficulty: "medium",
        question: "Which of the following is NOT a JavaScript data type?",
        options: ["String", "Boolean", "Float", "Undefined"],
        answer: 2,
    },
    {
        difficulty: "medium",
        question: "What does the 'this' keyword refer to in JavaScript?",
        options: ["The current function", "The global object", "The object that owns the method", "The parent object"],
        answer: 2,
    },

    // Hard Level Questions
    {
        difficulty: "hard",
        question: "What is the time complexity of accessing an element in a JavaScript array by index?",
        options: ["O(1)", "O(n)", "O(log n)", "O(n log n)"],
        answer: 0,
    },
    {
        difficulty: "hard",
        question: "Which of the following is a feature of ES6 (ECMAScript 2015)?",
        options: ["Arrow functions", "Promises", "Template literals", "All of the above"],
        answer: 3,
    },
    {
        difficulty: "hard",
        question: "What is the purpose of the 'use strict' directive in JavaScript?",
        options: ["To enable strict mode which catches common coding errors", "To allow the use of undeclared variables", "To disable all warnings and errors", "To enable backward compatibility with older JavaScript versions"],
        answer: 0,
    },

];

//** Pure helper functions (easy to unit test) *//
/**
 * Convert raw input into a valid answer index (0-based), or -1 if invalid.
 * @param {string} input - The raw input from the user.
 * @param {number} optionsCount - The number of available options for the question.
 * @returns {number} - The selected option index, or -1 if the input is invalid.
 */
function parseChoice(input, optionsCount) {
    const text = String(input).trim().toLocaleLowerCase();

    if (/^\d+$/.test(text)) {
        const number = Number.parseInt(text, 10);
        return number >= 1 && number <= optionsCount ? number - 1 : -1;
    }
    if (/^[a-z]$/.test(text)) {
        const index = text.charCodeAt(0) - "a".charCodeAt(0);
        return index < optionsCount ? index : -1;
    }
    return -1;
}

/**
 * Select questions for a difficulty level, in random order.
 * @param {Array} allQuestions
 * @param {string} level - "easy" | "medium" | "hard"
 * @returns {Array}
 */
function getQuestionsForLevel(allQuestions, level) {
  return shuffle(allQuestions.filter((q) => q.difficulty === level));
}

/**
 * Total score = points per correct answer, summed with reduce().
 * @param {{correct: boolean}[]} results
 * @param {number} pointsPerCorrect
 * @returns {number}
 */
function calculateScore(results, pointsPerCorrect) {
  return results.reduce((total, r) => total + (r.correct ? pointsPerCorrect : 0), 0);
}

/**
 * Show lives as hearts, e.g. 2 of 3 -> "♥♥♡".
 * @param {number} lives
 * @param {number} max
 * @returns {string}
 */
function renderLives(lives, max = MAX_LIVES) {
  return "♥".repeat(Math.max(lives, 0)) + "♡".repeat(Math.max(max - lives, 0));
}

/**
 * Return the top N entries, highest score first (does not mutate the input).
 * @param {{name: string, score: number}[]} scores
 * @param {number} limit
 * @returns {Array}
 */
function getTopScores(scores, limit = HIGH_SCORE_LIMIT) {
  return [...scores].sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Shuffle a copy of an array (Fisher-Yates).
 * @param {Array} items
 * @returns {Array}
 */
function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Lettered option lines, e.g. "  A) //".
 * @param {string[]} options
 * @returns {string}
 */
function formatOptions(options) {
  return options.map((option, i) => `  ${String.fromCharCode(65 + i)}) ${option}`).join("\n");
}

// ---------------------------------------------------------------------------
// High-score storage (with error handling)
// ---------------------------------------------------------------------------

/**
 * Read saved scores from disk. A missing or corrupt file gives an empty list.
 * @returns {Array}
 */
function loadHighScores() {
  try {
    const parsed = JSON.parse(fs.readFileSync(HIGH_SCORE_FILE, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add a score and save the top results back to disk.
 * @param {{name: string, score: number, level: string}} entry
 * @returns {Array} The updated top scores.
 */
function saveHighScore(entry) {
  const updated = getTopScores([...loadHighScores(), entry]);
  try {
    fs.writeFileSync(HIGH_SCORE_FILE, JSON.stringify(updated, null, 2));
  } catch (error) {
    console.log(`  (Could not save high scores: ${error.message})`);
  }
  return updated;
}

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------

/**
 * Ask one question with a time limit (setTimeout + AbortController).
 * @param {readline.Interface} rl
 * @param {object} q - Question.
 * @param {{timeLimit: number}} level - Difficulty settings.
 * @param {number} number - 1-based question number.
 * @param {number} total
 * @param {number} lives - Lives left (for display).
 * @returns {Promise<{question: string, correct: boolean, timedOut: boolean}>}
 */
async function askQuestion(rl, q, level, number, total, lives) {
  console.log(`\nQuestion ${number} of ${total}   Lives: ${renderLives(lives)}   Time: ${level.timeLimit}s`);
  console.log(q.question);
  console.log(formatOptions(q.options));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), level.timeLimit * 1000);
  const warningId = setTimeout(
    () => console.log(`\n  ... ${WARNING_AT} seconds left!`),
    Math.max(level.timeLimit - WARNING_AT, 0) * 1000
  );

  const correctText = `${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}`;

  try {
    while (true) {
      const raw = await rl.question("Your answer: ", { signal: controller.signal });
      const choice = parseChoice(raw, q.options.length);

      if (choice === -1) {
        console.log(`  Please enter a number 1-${q.options.length} or a letter A-${String.fromCharCode(64 + q.options.length)}.`);
        continue;
      }

      const correct = choice === q.answer;
      console.log(correct ? "  Correct!" : `  Incorrect (-1 life). The answer was ${correctText}.`);
      return { question: q.question, correct, timedOut: false };
    }
  } catch (error) {
    if (error.name !== "AbortError") throw error;
    console.log(`\n  Time's up (-1 life)! The answer was ${correctText}.`);
    return { question: q.question, correct: false, timedOut: true };
  } finally {
    clearTimeout(timeoutId);
    clearTimeout(warningId);
  }
}

/**
 * Play one game at the chosen difficulty.
 * @param {readline.Interface} rl
 * @param {string} levelKey - Key of DIFFICULTY_LEVELS.
 * @returns {Promise<{results: Array, lives: number, total: number, elapsedMs: number}>}
 */
async function playGame(rl, levelKey) {
  const level = DIFFICULTY_LEVELS[levelKey];
  const gameQuestions = getQuestionsForLevel(questions, levelKey);
  const results = [];
  let lives = MAX_LIVES;
  const startTime = Date.now();

  for (const [index, q] of gameQuestions.entries()) {
    const result = await askQuestion(rl, q, level, index + 1, gameQuestions.length, lives);
    results.push(result);
    if (!result.correct) lives -= 1;
    if (lives === 0) break;
  }

  return { results, lives, total: gameQuestions.length, elapsedMs: Date.now() - startTime };
}

/**
 * Show the end-of-game summary and the high-score table.
 * @param {string} playerName
 * @param {string} levelKey
 * @param {{results: Array, lives: number, total: number, elapsedMs: number}} game
 */
function showSummary(playerName, levelKey, game) {
  const level = DIFFICULTY_LEVELS[levelKey];
  const { results, lives, total, elapsedMs } = game;
  const score = calculateScore(results, level.points);
  const correctCount = results.filter((r) => r.correct).length;
  const finishedAll = results.length === total && lives > 0;

  console.log("\n==============================");
  console.log("          GAME OVER");
  console.log("==============================");
  console.log(finishedAll ? "You survived every question!" : "You ran out of lives.");
  console.log(`Player:     ${playerName}`);
  console.log(`Level:      ${level.label} (${level.points} pt each)`);
  console.log(`Correct:    ${correctCount} of ${results.length} answered`);
  console.log(`Lives left: ${renderLives(lives)}`);
  console.log(`Time:       ${(elapsedMs / 1000).toFixed(1)}s`);
  console.log(`SCORE:      ${score}`);

  const board = saveHighScore({ name: playerName, score, level: level.label });
  console.log("\n--- HIGH SCORES ---");
  board.forEach((entry, i) => {
    console.log(`${i + 1}. ${entry.name.padEnd(12)} ${String(entry.score).padStart(3)}  (${entry.level})`);
  });
}

/**
 * Ask the player to pick a difficulty from a menu.
 * @param {readline.Interface} rl
 * @returns {Promise<string>} A key of DIFFICULTY_LEVELS.
 */
async function chooseDifficulty(rl) {
  const keys = Object.keys(DIFFICULTY_LEVELS);
  console.log("\nChoose a difficulty:");
  keys.forEach((key, i) => {
    const { label, timeLimit, points } = DIFFICULTY_LEVELS[key];
    console.log(`  ${i + 1}) ${label} - ${timeLimit}s per question, ${points} pt per correct answer`);
  });

  while (true) {
    const index = parseChoice(await rl.question("Difficulty number: "), keys.length);
    if (index !== -1) return keys[index];
    console.log(`  Please enter a number from 1 to ${keys.length}.`);
  }
}

/** Entry point. */
async function main() {
  const rl = readline.createInterface({ input: stdin, output: stdout });

  try {
    console.log("==============================");
    console.log("    WELCOME TO LIVES & LEVELS");
    console.log("==============================");
    console.log(`You have ${MAX_LIVES} lives. A wrong answer or a timeout costs one.`);

    const typedName = (await rl.question("\nEnter your name: ")).trim();
    const playerName = typedName.slice(0, 12) || "Player";

    let playing = true;
    while (playing) {
      const levelKey = await chooseDifficulty(rl);
      await rl.question("\nPress Enter to start...");
      showSummary(playerName, levelKey, await playGame(rl, levelKey));

      const again = await rl.question("\nPlay again? (y/n): ");
      playing = again.trim().toLowerCase().startsWith("y");
    }
    console.log("\nThanks for playing. Goodbye!");
  } catch (error) {
    console.log("\nGame ended early. Goodbye!");
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { parseChoice, getQuestionsForLevel, calculateScore, renderLives, getTopScores, shuffle, formatOptions };
