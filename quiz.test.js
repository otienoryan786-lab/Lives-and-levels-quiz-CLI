const test = require("node:test");
const assert = require("node:assert");
const { parseChoice, getQuestionsForLevel, calculateScore, renderLives, getTopScores } = require("./quiz");

test("parseChoice handles valid and invalid input", () => {
  assert.strictEqual(parseChoice("3", 4), 2);
  assert.strictEqual(parseChoice("b", 4), 1);
  assert.strictEqual(parseChoice("9", 4), -1);
  assert.strictEqual(parseChoice("??", 4), -1);
});

test("getQuestionsForLevel returns only that level", () => {
  const data = [{ difficulty: "easy" }, { difficulty: "hard" }, { difficulty: "easy" }];
  const result = getQuestionsForLevel(data, "easy");
  assert.strictEqual(result.length, 2);
  assert.ok(result.every((q) => q.difficulty === "easy"));
});

test("calculateScore multiplies correct answers by points", () => {
  const results = [{ correct: true }, { correct: false }, { correct: true }];
  assert.strictEqual(calculateScore(results, 3), 6);
  assert.strictEqual(calculateScore([], 3), 0);
});

test("renderLives shows hearts", () => {
  assert.strictEqual(renderLives(3), "♥♥♥");
  assert.strictEqual(renderLives(1), "♥♡♡");
  assert.strictEqual(renderLives(0), "♡♡♡");
});

test("getTopScores sorts high to low, limits, and does not mutate", () => {
  const scores = [{ score: 2 }, { score: 9 }, { score: 5 }, { score: 7 }];
  assert.deepStrictEqual(getTopScores(scores, 2).map((s) => s.score), [9, 7]);
  assert.strictEqual(scores[0].score, 2);
});