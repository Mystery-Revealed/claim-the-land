// gamemanager.test.js — drives the manager exactly the way socketHandlers does
// and inspects the emit instructions it returns. No sockets involved.
import test from 'node:test';
import assert from 'node:assert/strict';
import { GameManager } from '../src/GameManager.js';
import game from '../src/games/claimTheLand.js';

const PIN = '4242';

function makeSession(manager, { requireApproval = false } = {}) {
  const res = manager.createSession({ pin: PIN, requireApproval });
  assert.ok(res.joinCode, 'session created');
  return res.joinCode;
}

function join(manager, joinCode, nickname, mode = 'versus', nation = null) {
  const res = manager.joinStudent({ joinCode, nickname, mode, nation });
  assert.ok(!res.error, `join failed: ${res.error}`);
  return res;
}

const eventsOf = (emits, name) => emits.filter((e) => e.event === name);
const studentEvents = (emits, studentId, name) =>
  emits.filter((e) => e.to.type === 'student' && e.to.studentId === studentId && (!name || e.event === name));

// Play the student's current step with the historically right move.
function playRight(manager, joinCode, studentId) {
  const session = manager.registry.get(joinCode);
  const student = session.students.get(studentId);
  const match = session.matches.get(student.matchId);
  const side = match.solo ? match.side : Object.entries(match.sideToStudent).find(([, sid]) => sid === studentId)[0];
  const move = game.aiMove(match.gameState, side);
  return manager.submitMove({ joinCode, studentId, move });
}

test('createSession rejects a bad PIN', () => {
  const manager = new GameManager();
  assert.equal(manager.createSession({ pin: 'abc' }).error, 'bad_pin');
  assert.equal(manager.createSession({ pin: '12345' }).error, 'bad_pin');
});

test('teacher ops require the right PIN', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  assert.equal(manager.pairAndStart({ joinCode, pin: '0000' }).error, 'bad_pin');
  assert.equal(manager.endSession({ joinCode, pin: '9999' }).error, 'bad_pin');
});

test('solo student starts immediately when approval is off, and completes with 100% accuracy', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  const res = join(manager, joinCode, 'Ana', 'solo', 'france');

  const begin = studentEvents(res.emits, res.studentId, 'match:begin');
  assert.equal(begin.length, 1, 'solo match begins on join');
  assert.equal(begin[0].payload.side, 'france');
  assert.equal(begin[0].payload.mode, 'solo');
  assert.ok(studentEvents(res.emits, res.studentId, 'chapter:event').length === 1);
  assert.ok(studentEvents(res.emits, res.studentId, 'turn:begin').length === 1);

  // Play all 12 steps right.
  let last;
  for (let i = 0; i < 12; i++) {
    last = playRight(manager, joinCode, res.studentId);
    assert.ok(!last.error, `step ${i}: ${last.error}`);
  }
  const end = studentEvents(last.emits, res.studentId, 'match:end');
  assert.equal(end.length, 1, 'match ends after 12 actions');
  assert.equal(end[0].payload.you.accuracy, 100);
  assert.equal(end[0].payload.yourSide, 'france');
  // The AI opponent (Spain, played right) wins — the real history.
  assert.equal(end[0].payload.winner, 'spain');
  assert.ok(end[0].payload.you.accuracyNote, 'accurate losing France sees the history note');
  // Teacher got the end card and updated roster.
  assert.equal(eventsOf(last.emits, 'student:end').length, 1);
  const roster = manager.roster(manager.registry.get(joinCode));
  assert.equal(roster.students[0].status, 'completed');
  assert.equal(roster.students[0].accuracy, 100);
  assert.equal(roster.classAccuracy.france.count, 1);
  assert.equal(roster.classAccuracy.france.average, 100);
});

test('approval gate: solo student waits, then starts on approve', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager, { requireApproval: true });
  const res = join(manager, joinCode, 'Leo', 'solo', 'spain');
  assert.equal(res.approved, false);
  assert.equal(studentEvents(res.emits, res.studentId, 'match:begin').length, 0);

  const ok = manager.approveStudent({ joinCode, pin: PIN, studentId: res.studentId });
  assert.equal(studentEvents(ok.emits, res.studentId, 'join:approved').length, 1);
  assert.equal(studentEvents(ok.emits, res.studentId, 'match:begin').length, 1);
});

test('pair_and_start: pairs randomize nations; odd student out plays solo', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  const a = join(manager, joinCode, 'Ana');
  const b = join(manager, joinCode, 'Ben');
  const c = join(manager, joinCode, 'Cat');

  const res = manager.pairAndStart({ joinCode, pin: PIN });
  const session = manager.registry.get(joinCode);
  assert.equal(session.matches.size, 2, 'one versus match + one solo match');

  const matches = [...session.matches.values()];
  const versus = matches.find((m) => !m.solo);
  const solo = matches.find((m) => m.solo);
  assert.ok(versus && solo);
  // The versus pair has one Spain and one France.
  const sides = Object.keys(versus.sideToStudent).sort();
  assert.deepEqual(sides, ['france', 'spain']);
  // Everyone got a match:begin.
  for (const s of [a, b, c]) {
    assert.equal(studentEvents(res.emits, s.studentId, 'match:begin').length, 1);
  }
  // The solo player's opponent is the computer.
  const soloBegin = studentEvents(res.emits, solo.studentId, 'match:begin')[0];
  assert.equal(soloBegin.payload.opponentName, 'The Computer');
});

test('versus: server turn lock and chapter-grouped turns', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  const a = join(manager, joinCode, 'Ana');
  const b = join(manager, joinCode, 'Ben');
  manager.pairAndStart({ joinCode, pin: PIN });

  const session = manager.registry.get(joinCode);
  const match = [...session.matches.values()][0];
  const spainId = match.sideToStudent.spain;
  const franceId = match.sideToStudent.france;

  // France may not move first.
  assert.equal(playRight(manager, joinCode, franceId).error, 'not_your_turn');

  // Spain plays its MAP move — and keeps the turn for its decision.
  assert.ok(!playRight(manager, joinCode, spainId).error);
  assert.equal(match.gameState.whoseTurn, 'spain', 'Spain keeps the turn mid-chapter');
  assert.equal(playRight(manager, joinCode, franceId).error, 'not_your_turn');

  // Spain plays its DECISION — now the turn passes to France.
  const res = playRight(manager, joinCode, spainId);
  assert.ok(!res.error);
  assert.equal(match.gameState.whoseTurn, 'france');
  // France saw Spain's board changes but never Spain's feedback text.
  const franceSaw = studentEvents(res.emits, franceId);
  assert.ok(franceSaw.some((e) => e.event === 'rival:update'));
  assert.ok(!franceSaw.some((e) => e.payload && e.payload.feedback));
  // Spain is locked out while France plays.
  assert.equal(playRight(manager, joinCode, spainId).error, 'not_your_turn');

  // France plays its chapter; the turn returns to Spain for chapter 2.
  assert.ok(!playRight(manager, joinCode, franceId).error);
  assert.ok(!playRight(manager, joinCode, franceId).error);
  assert.equal(match.gameState.whoseTurn, 'spain');
  assert.equal(match.gameState.chapterIndex, 1);
});

test('a wrong-kind move is rejected', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  const res = join(manager, joinCode, 'Ana', 'solo', 'spain');
  // First step is a map move; submit a decision instead.
  const bad = manager.submitMove({ joinCode, studentId: res.studentId, move: { kind: 'decision', choiceIndex: 0 } });
  assert.equal(bad.error, 'wrong_step_kind');
});

test('drop-out: partner is offered the computer, match converts and finishes', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  const a = join(manager, joinCode, 'Ana');
  const b = join(manager, joinCode, 'Ben');
  manager.pairAndStart({ joinCode, pin: PIN });

  const session = manager.registry.get(joinCode);
  const match = [...session.matches.values()][0];
  const spainId = match.sideToStudent.spain;
  const franceId = match.sideToStudent.france;

  // Spain plays chapter 1, then France's player disconnects mid-turn.
  playRight(manager, joinCode, spainId);
  playRight(manager, joinCode, spainId);
  const dis = manager.markDisconnected({ joinCode, studentId: franceId });
  assert.ok(dis.hadActiveVersusMatch);
  assert.equal(studentEvents(dis.emits, spainId, 'partner:disconnected').length, 1);

  // Grace period passes → the offer; Spain accepts.
  const offer = manager.offerFinishVsAI({ joinCode, studentId: franceId });
  assert.equal(studentEvents(offer.emits, spainId, 'partner:gone').length, 1);
  const conv = manager.finishVsAI({ joinCode, studentId: spainId });
  assert.ok(!conv.error);
  assert.ok(match.solo, 'match now runs vs the computer');
  // The AI caught France up to chapter 2, so Spain can keep playing.
  assert.equal(match.gameState.sides.france.cursor, 2);

  for (let i = 0; i < 10; i++) {
    const r = playRight(manager, joinCode, spainId);
    assert.ok(!r.error, `post-convert step ${i}: ${r.error}`);
  }
  const student = session.students.get(spainId);
  assert.equal(student.status, 'completed');
  assert.equal(student.accuracy, 100, 'accuracy still counts after converting');
});

test('rejoin returns a full snapshot of the live turn', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  const res = join(manager, joinCode, 'Ana', 'solo', 'spain');
  playRight(manager, joinCode, res.studentId); // map move done; decision pending

  manager.markDisconnected({ joinCode, studentId: res.studentId });
  const back = manager.rejoinStudent({ joinCode, studentId: res.studentId });
  assert.ok(!back.error);
  assert.equal(back.sync.screen, 'match');
  assert.equal(back.sync.turn.kind, 'decision');
  assert.equal(back.sync.turn.yourTurn, true);
  assert.ok(back.sync.matchBegin.meta.regions, 'meta ships with the snapshot');
  assert.ok(Array.isArray(back.sync.turn.choices) && back.sync.turn.choices.length === 3);
});

test('end_session wipes the session from memory', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  join(manager, joinCode, 'Ana', 'solo', 'spain');
  const res = manager.endSession({ joinCode, pin: PIN });
  assert.ok(eventsOf(res.emits, 'session:ended').length >= 2, 'teacher + student notified');
  assert.equal(manager.registry.get(joinCode), undefined);
});

test('students cannot reach teacher data: roster/report require the PIN', () => {
  const manager = new GameManager();
  const joinCode = makeSession(manager);
  assert.equal(manager.sessionReport({ joinCode, pin: '1111' }).error, 'bad_pin');
  assert.ok(manager.sessionReport({ joinCode, pin: PIN }).report);
});
