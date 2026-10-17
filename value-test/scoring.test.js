// 채점 규칙 시험: node value-test/scoring.test.js
// index.html 안의 스크립트를 그대로 불러와 순수 채점 함수만 돌린다.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const assert = require("assert");

const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const script = html.match(/<script>([\s\S]*)<\/script>/)[1]
  + "\n;({ countDirs, chooseSet, buildStage2, snackResult, neighbors, opposite, SETS, STAGE1, CIRCLE, DETAIL, NEAR, FAR, pairKey })";
const T = vm.runInNewContext(script, {});

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("✅ " + name);
}
const dirs = s => [...s]; // "AAAAAB" → ["A",...]
// vm 안의 배열은 프로토타입이 달라 JSON으로 비교한다
const same = (a, b) => assert.strictEqual(JSON.stringify(a), JSON.stringify(b));

test("1단계 🏆5·🤝1 → 🏆 단일 세트", () => {
  const counts = T.countDirs(dirs("AAAAAB"));
  for (let k = 0; k < 50; k++) {
    const info = T.chooseSet(counts);
    assert.strictEqual(info.mode, "single");
    assert.strictEqual(info.first, "A");
    same(T.buildStage2(info), T.SETS.A);
  }
});

test("1단계 🛡3·🤝3 → 섞은 세트 (1위 7·9·11 + 2위 8·10·12)", () => {
  const counts = T.countDirs(dirs("SSSBBB"));
  const firsts = new Set();
  for (let k = 0; k < 200; k++) {
    const info = T.chooseSet(counts);
    assert.strictEqual(info.mode, "mixed");
    same([info.first, info.second].sort(), ["B", "S"]);
    firsts.add(info.first);
    const qs = T.buildStage2(info);
    assert.strictEqual(qs.length, 6);
    [0, 2, 4].forEach(i => assert.strictEqual(qs[i], T.SETS[info.first][i]));
    [1, 3, 5].forEach(i => assert.strictEqual(qs[i], T.SETS[info.second][i]));
  }
  assert.strictEqual(firsts.size, 2, "동점 1·2위 순서가 무작위여야 함");
});

test("1단계 차이 1표 (🧭3·🏆2·🛡1) → 섞은 세트 🧭+🏆", () => {
  const info = T.chooseSet(T.countDirs(dirs("EEEAAS")));
  assert.strictEqual(info.mode, "mixed");
  assert.strictEqual(info.first, "E");
  assert.strictEqual(info.second, "A");
});

test("1단계 1위 셋 동점 (🧭2·🏆2·🛡2) → 무작위 표시", () => {
  const info = T.chooseSet(T.countDirs(dirs("EEAASS")));
  assert.strictEqual(info.mode, "random");
  assert.notStrictEqual(info.first, info.second);
  assert.ok(["E", "A", "S"].includes(info.first) && ["E", "A", "S"].includes(info.second));
});

test("2단계 AC3·PO3 → 반반 세트 (크루아상 + 홀케이크)", () => {
  const r = T.snackResult(["AC", "PO", "AC", "PO", "AC", "PO"]);
  assert.strictEqual(r.type, "half");
  same(r.tops, ["AC", "PO"]);
});

test("2단계 HE2·AC2·PO2 → 모둠 세트", () => {
  const r = T.snackResult(["HE", "AC", "PO", "HE", "AC", "PO"]);
  assert.strictEqual(r.type, "mix");
  same(r.tops, ["HE", "AC", "PO"]);
});

test("겉 SD → 닮은꼴 UN·ST, 다른 맛 CO", () => {
  const r = T.snackResult(["SD", "SD", "SD", "ST", "HE", "SD"]);
  same(r.tops, ["SD"]);
  same(T.neighbors("SD"), ["UN", "ST"]);
  assert.strictEqual(T.opposite("SD"), "CO");
  same(T.neighbors("UN"), ["BE", "SD"]);
});

test("1단계 보기는 문항마다 네 방향이 하나씩", () => {
  T.STAGE1.forEach(q => same(q.o.map(x => x.d), ["E", "A", "S", "B"]));
});

test("간식 10개 모두 해설, 닮은꼴·다른 맛 짝 설명이 있음", () => {
  T.CIRCLE.forEach(c => {
    const d = T.DETAIL[c];
    assert.ok(d && d.desc && d.moves.length === 3 && d.power && d.shadow && d.tip && d.drink && d.spot, c + " 해설");
    T.neighbors(c).forEach(n => assert.ok(T.NEAR[T.pairKey(c, n)], c + "-" + n + " 닮은꼴 설명"));
    const f = T.FAR[T.pairKey(c, T.opposite(c))];
    assert.ok(f && f.why && f.learn, c + " 다른 맛 설명");
  });
});

console.log(`\n${passed}개 모두 통과`);
