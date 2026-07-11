// content.test.js — sanity + historical balance checks on the content bank.
import test from 'node:test';
import assert from 'node:assert/strict';
import game, { CHAPTERS, REGIONS, MARKERS } from '../src/games/claimTheLand.js';

const SIDES = ['spain', 'france'];

test('both nations have 6 chapters, each with a valid map move and decision', () => {
  for (const side of SIDES) {
    assert.equal(CHAPTERS[side].length, 6, `${side} chapter count`);
    for (const [i, ch] of CHAPTERS[side].entries()) {
      assert.ok(ch.title && ch.year && ch.event && ch.image, `${side} ch${i} metadata`);
      // Map move: at least one 'right' rule and a catch-all (no regions/markers filter).
      const rules = ch.mapMove.rules;
      assert.ok(rules.some((r) => r.verdict === 'right'), `${side} ch${i} has a right map rule`);
      const catchAll = rules[rules.length - 1];
      assert.ok(!catchAll.regions && !catchAll.markers && !catchAll.special, `${side} ch${i} map catch-all`);
      for (const r of rules) {
        assert.ok(r.feedback?.length > 10, `${side} ch${i} map rule feedback`);
        for (const reg of r.regions || []) assert.ok(REGIONS[reg], `${side} ch${i} region ${reg}`);
        for (const m of r.markers || []) assert.ok(MARKERS[m], `${side} ch${i} marker ${m}`);
      }
      // Decision: exactly 3 choices — one right, one partial, one wrong.
      const verdicts = ch.decision.choices.map((c) => c.verdict).sort();
      assert.deepEqual(verdicts, ['partial', 'right', 'wrong'], `${side} ch${i} decision verdicts`);
      for (const c of ch.decision.choices) {
        assert.ok(c.label?.length > 5 && c.feedback?.length > 10, `${side} ch${i} choice text`);
      }
    }
  }
});

// ---------------------------------------------------------------------------
// Balance: the game must reproduce the real history (spec §1, §19).
//  - Spain played right beats France played right (Spain won the race).
//  - France played perfectly still doesn't "secure" Texas.
//  - France played badly collapses like Fort St. Louis.
// ---------------------------------------------------------------------------

function playChapter(state, side, pickMove) {
  game.chapterEvent(state, side);
  for (let step = 0; step < 2; step++) {
    const res = game.resolve(state, side, pickMove(state, side));
    assert.ok(!res.error, `move failed: ${res.error}`);
  }
}

function playAll(state, side, pickMove) {
  for (let ch = 0; ch < 6; ch++) playChapter(state, side, pickMove);
}

const rightMove = (state, side) => game.aiMove(state, side);

function wrongMove(state, side) {
  const ss = state.sides[side];
  if (ss.cursor % 2 === 0) {
    // A placement that's wrong for every chapter of that nation (asserted below).
    return side === 'spain'
      ? { kind: 'map', region: 'west', marker: 'tradingPost' }
      : { kind: 'map', region: 'west', marker: 'mission' };
  }
  const chapter = Math.floor(ss.cursor / 2);
  const realWrong = CHAPTERS[side][chapter].decision.choices.findIndex((c) => c.verdict === 'wrong');
  return { kind: 'decision', choiceIndex: ss.shuffles[chapter].indexOf(realWrong) };
}

test('all-right runs: Spain secures Texas, France holds on but does not win', () => {
  const state = game.initMatch({ mode: 'versus' });
  playAll(state, 'spain', rightMove);
  playAll(state, 'france', rightMove);
  const report = game.report(state);

  assert.equal(report.perSide.spain.accuracy, 100);
  assert.equal(report.perSide.france.accuracy, 100);
  assert.equal(report.winner, 'spain', 'accurate Spain beats accurate France (the real history)');
  assert.equal(report.perSide.spain.ending.key, 'secured');
  assert.equal(report.perSide.france.ending.key, 'held');
  assert.ok(report.perSide.spain.claimScore > report.perSide.france.claimScore);
  // The accurate-but-losing France player gets the "that IS the history" note.
  assert.ok(report.perSide.france.accuracyNote, 'France gets the accurate-loss debrief note');
});

test('all-wrong France collapses like Fort St. Louis; all-wrong Spain loses the race', () => {
  const state = game.initMatch({ mode: 'versus' });
  playAll(state, 'spain', wrongMove);
  playAll(state, 'france', wrongMove);
  const report = game.report(state);

  assert.equal(report.perSide.spain.accuracy, 0);
  assert.equal(report.perSide.france.accuracy, 0);
  assert.equal(report.perSide.france.collapsed, true, 'France strength hit 0');
  assert.equal(report.perSide.france.ending.key, 'collapsed');
  assert.equal(report.perSide.spain.ending.key, 'lost');
});

test('map grading: the wrong-for-everything placements really are wrong every chapter', () => {
  for (const side of SIDES) {
    const state = game.initMatch({ mode: 'versus' });
    for (let ch = 0; ch < 6; ch++) {
      game.chapterEvent(state, side);
      const res = game.resolve(state, side, wrongMove(state, side));
      assert.equal(res.verdict, 'wrong', `${side} ch${ch} map placement should be wrong`);
      const res2 = game.resolve(state, side, wrongMove(state, side));
      assert.equal(res2.verdict, 'wrong', `${side} ch${ch} decision should be wrong`);
    }
  }
});

test('decision shuffling: choices are mapped back through the per-match permutation', () => {
  const state = game.initMatch({ mode: 'solo', soloSide: 'spain' });
  const ss = state.sides.spain;
  game.chapterEvent(state, 'spain');
  game.resolve(state, 'spain', rightMove(state, 'spain')); // map move
  const prompt = game.currentPrompt(state, 'spain');
  assert.equal(prompt.kind, 'decision');
  // The label at presented index i must be the label of choices[shuffles[0][i]].
  const order = ss.shuffles[0];
  for (let i = 0; i < 3; i++) {
    assert.equal(prompt.choices[i], CHAPTERS.spain[0].decision.choices[order[i]].label);
  }
});

test('chapter 6 fillGap: building in the emptiest region is right, elsewhere partial', () => {
  const state = game.initMatch({ mode: 'solo', soloSide: 'spain' });
  // Play chapters 1–5 right; Spain's markers land in rioGrande, gulf, eastTx, sanAntonio, eastTx.
  for (let ch = 0; ch < 5; ch++) playChapter(state, 'spain', rightMove);
  game.chapterEvent(state, 'spain');
  // West is empty — a presidio there fills the gap.
  const res = game.resolve(state, 'spain', { kind: 'map', region: 'west', marker: 'presidio' });
  assert.equal(res.verdict, 'right');
});
