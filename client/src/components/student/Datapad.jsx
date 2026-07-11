// Datapad.jsx — the student game. A small state machine over socket pushes:
// title → how to play → join → (approval) → lobby → match (6 chapters) → result.
// The server owns all truth; this component only renders what it's told.

import { useEffect, useReducer, useRef, useState } from 'react';
import { getSocket, emitAck, errorText } from '../../services/socket.js';
import { Art } from '../../services/assets.jsx';
import MatchView from './MatchView.jsx';
import ResultScreen from './ResultScreen.jsx';

const initialState = {
  screen: 'title', // title | how | join | waiting_approval | lobby | match | result | ended
  joinCode: '',
  name: '',
  studentId: null,
  joinMode: 'versus',
  joinNation: 'spain',
  error: '',
  endedMessage: '',
  match: null,
  matchEnd: null,
};

function freshMatch(begin) {
  return {
    begin,
    map: begin.map,
    owners: begin.owners,
    meters: begin.meters,
    rivalMeters: begin.rivalMeters,
    eventCard: null,
    turn: null,
    feedback: null,
    partner: null, // null | 'disconnected' | 'gone' | 'replaced'
    ticker: '',
  };
}

function mergeLive(match, payload, { rival = false } = {}) {
  const next = { ...match };
  if (payload.map) next.map = payload.map;
  if (payload.owners) next.owners = payload.owners;
  if (payload.meters) {
    if (rival) next.rivalMeters = payload.meters;
    else next.meters = payload.meters;
  }
  if (!rival && payload.rivalMeters) next.rivalMeters = payload.rivalMeters;
  return next;
}

function reducer(state, action) {
  switch (action.type) {
    case 'ui':
      return { ...state, ...action.patch };
    case 'joined':
      return {
        ...state,
        studentId: action.studentId,
        error: '',
        screen: action.approved ? 'lobby' : 'waiting_approval',
      };
    case 'approved':
      return { ...state, screen: state.screen === 'waiting_approval' ? 'lobby' : state.screen };
    case 'match:begin':
      return { ...state, screen: 'match', matchEnd: null, match: freshMatch(action.payload) };
    case 'chapter:event': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload);
      return { ...state, match: { ...match, eventCard: action.payload } };
    }
    case 'turn:begin': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload);
      return { ...state, match: { ...match, turn: action.payload } };
    }
    case 'turn:resolution': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload);
      return { ...state, match: { ...match, feedback: action.payload } };
    }
    case 'rival:update': {
      if (!state.match) return state;
      const match = mergeLive(state.match, action.payload, { rival: true });
      const meta = state.match.begin.meta;
      const nation = meta.nations[action.payload.side]?.name || 'Your rival';
      const ticker = action.payload.placed
        ? `${nation} placed a ${meta.markers[action.payload.placed.marker]?.name} in ${meta.regions[action.payload.placed.region]?.name}.`
        : `${nation} made its decision.`;
      return { ...state, match: { ...match, ticker } };
    }
    case 'match:end': {
      // Hold the result until pending feedback is dismissed (chronological order).
      const showNow = !state.match?.feedback;
      return { ...state, matchEnd: action.payload, screen: showNow ? 'result' : state.screen };
    }
    case 'dismiss-feedback': {
      if (!state.match) return state;
      if (state.matchEnd) return { ...state, screen: 'result', match: { ...state.match, feedback: null } };
      return { ...state, match: { ...state.match, feedback: null } };
    }
    case 'dismiss-event':
      return state.match ? { ...state, match: { ...state.match, eventCard: null } } : state;
    case 'partner':
      return state.match ? { ...state, match: { ...state.match, partner: action.value, ticker: action.ticker ?? state.match.ticker } } : state;
    case 'sync': {
      const s = action.sync;
      if (s.screen === 'waiting_approval') return { ...state, screen: 'waiting_approval' };
      if (s.screen === 'lobby') return { ...state, screen: 'lobby' };
      if (s.screen === 'result') return { ...state, screen: 'result', matchEnd: s.matchEnd };
      if (s.screen === 'match') {
        const match = freshMatch(s.matchBegin);
        return {
          ...state,
          screen: 'match',
          matchEnd: null,
          match: { ...match, eventCard: s.chapterEvent, turn: s.turn },
        };
      }
      return state;
    }
    case 'removed':
      return { ...initialState, screen: 'join', joinCode: state.joinCode, name: '', error: 'Your teacher removed you from the session. You can join again.' };
    case 'ended':
      return { ...initialState, screen: 'ended', endedMessage: 'Your teacher ended this session. Great work today!' };
    case 'play-again':
      return {
        ...initialState,
        screen: 'join',
        joinCode: state.joinCode,
        name: state.name,
        joinMode: action.mode ?? state.joinMode,
        joinNation: action.nation ?? state.joinNation,
      };
    default:
      return state;
  }
}

export default function Datapad() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const socket = getSocket();
    const on = (event, type) => {
      const fn = (payload) => dispatch({ type, payload });
      socket.on(event, fn);
      return [event, fn];
    };
    const subs = [
      on('match:begin', 'match:begin'),
      on('chapter:event', 'chapter:event'),
      on('turn:begin', 'turn:begin'),
      on('turn:resolution', 'turn:resolution'),
      on('rival:update', 'rival:update'),
      on('match:end', 'match:end'),
    ];
    const approved = () => dispatch({ type: 'approved' });
    const removed = () => dispatch({ type: 'removed' });
    const ended = () => dispatch({ type: 'ended' });
    const pDis = (p) => dispatch({ type: 'partner', value: 'disconnected', ticker: `${p.name} lost connection…` });
    const pBack = () => dispatch({ type: 'partner', value: null, ticker: 'Your partner is back!' });
    const pGone = () => dispatch({ type: 'partner', value: 'gone' });
    const pRepl = () => dispatch({ type: 'partner', value: null, ticker: 'The computer takes over for your rival.' });
    socket.on('join:approved', approved);
    socket.on('student:removed', removed);
    socket.on('session:ended', ended);
    socket.on('partner:disconnected', pDis);
    socket.on('partner:reconnected', pBack);
    socket.on('partner:gone', pGone);
    socket.on('partner:replaced', pRepl);

    // School wifi blip: the socket reconnects → re-attach and re-sync the screen.
    const onReconnect = async () => {
      const s = stateRef.current;
      if (!s.studentId || !s.joinCode) return;
      const res = await emitAck('student:rejoin', { joinCode: s.joinCode, studentId: s.studentId });
      if (res.ok) dispatch({ type: 'sync', sync: res.sync });
    };
    socket.io.on('reconnect', onReconnect);

    return () => {
      for (const [event, fn] of subs) socket.off(event, fn);
      socket.off('join:approved', approved);
      socket.off('student:removed', removed);
      socket.off('session:ended', ended);
      socket.off('partner:disconnected', pDis);
      socket.off('partner:reconnected', pBack);
      socket.off('partner:gone', pGone);
      socket.off('partner:replaced', pRepl);
      socket.io.off('reconnect', onReconnect);
    };
  }, []);

  const { screen } = state;
  return (
    <div className="app student-app">
      {screen === 'title' && <TitleScreen onStart={() => dispatch({ type: 'ui', patch: { screen: 'join' } })} onHow={() => dispatch({ type: 'ui', patch: { screen: 'how' } })} />}
      {screen === 'how' && <HowToPlay onBack={() => dispatch({ type: 'ui', patch: { screen: 'title' } })} />}
      {screen === 'join' && <JoinForm state={state} dispatch={dispatch} />}
      {screen === 'waiting_approval' && (
        <WaitCard title="Hold tight!" text="Your teacher is checking names. You’ll join the game in a moment." />
      )}
      {screen === 'lobby' && (
        <WaitCard
          title="You’re in!"
          text={
            state.joinMode === 'solo'
              ? 'Your solo match is being set up…'
              : 'Waiting for your teacher to pair the players. You’ll face another student — one of you plays Spain, one plays France.'
          }
        />
      )}
      {screen === 'match' && state.match && <MatchView state={state} dispatch={dispatch} />}
      {screen === 'result' && state.matchEnd && <ResultScreen state={state} dispatch={dispatch} />}
      {screen === 'ended' && (
        <WaitCard title="Session ended" text={state.endedMessage}>
          <button className="btn" onClick={() => dispatch({ type: 'ui', patch: { ...initialState, screen: 'title' } })}>
            Back to the title screen
          </button>
        </WaitCard>
      )}
      <footer className="app-footer">Made for 7th Grade Texas History · TEKS 7.2B, 7.2C</footer>
    </div>
  );
}

/* ---------------- small screens ---------------- */

function TitleScreen({ onStart, onHow }) {
  return (
    <div className="card title-screen">
      <Art name="title_hero.jpg" alt="Early Texas: a Spanish mission on one side, a French fort on the other" className="hero-art" />
      <h1 className="game-title">Claim the Land</h1>
      <p className="tagline">Spain and France both want Texas. Only one can hold it.</p>
      <p className="title-blurb">
        Play one nation in the race for Texas, 1519–1722. Place your missions,
        presidios, and trading posts on the map. Make the choices your nation
        really faced — and see why Spain won the race.
      </p>
      <div className="btn-col">
        <button className="btn big" onClick={onStart}>Join your class</button>
        <button className="btn secondary" onClick={onHow}>How to play</button>
      </div>
    </div>
  );
}

function HowToPlay({ onBack }) {
  return (
    <div className="card how-screen">
      <h2>How to play</h2>
      <ol className="how-list">
        <li><b>Join with your class code.</b> Face another student head-to-head, or play solo against the computer.</li>
        <li><b>Play 6 chapters of real history</b> (1519–1722). Each chapter you make <b>two moves</b>:</li>
      </ol>
      <div className="how-grid">
        <div className="how-card"><span className="how-icon">🗺️</span><b>Map move</b><p>Tap a region and place a marker. The <i>where</i> and the <i>what</i> both count.</p></div>
        <div className="how-card"><span className="how-icon">🤔</span><b>Decision</b><p>Pick 1 of 3 answers to the chapter’s big question.</p></div>
      </div>
      <h3>Your three meters</h3>
      <ul className="how-list">
        <li>🗺️ <b>Territory</b> — how much of Texas you claim.</li>
        <li>🏰 <b>Strength</b> — forts and soldiers. <b>If it hits 0, your colony collapses!</b></li>
        <li>🤝 <b>Support</b> — missions and Native alliances. Friends make a claim real.</li>
      </ul>
      <div className="note">
        <b>Winning ≠ your grade.</b> The match winner is whoever claims more of
        Texas. But your <b>accuracy</b> — how well your choices match real
        history — is the score your teacher sees. France lost the real race for
        Texas, so a smart France player can lose the match and still earn a
        top accuracy score!
      </div>
      <h3>Words to know</h3>
      <ul className="how-list">
        <li><b>Mission</b> — a religious settlement Spanish priests built to convert Native peoples and teach Spanish ways.</li>
        <li><b>Presidio</b> — a military fort built to protect missions and settlers.</li>
        <li><b>Trading post</b> — a small trade fort. France’s specialty.</li>
        <li><b>Alliance</b> — a friendly agreement, here between a nation and a Native people.</li>
        <li><b>Claim</b> — saying land is yours. Holding it takes people and forts, not just a flag.</li>
      </ul>
      <button className="btn" onClick={onBack}>Back</button>
    </div>
  );
}

function JoinForm({ state, dispatch }) {
  const [busy, setBusy] = useState(false);
  const set = (patch) => dispatch({ type: 'ui', patch });

  async function join() {
    if (busy) return;
    setBusy(true);
    set({ error: '' });
    const res = await emitAck('student:join', {
      joinCode: state.joinCode.trim(),
      nickname: state.name.trim(),
      mode: state.joinMode,
      nation: state.joinMode === 'solo' ? state.joinNation : null,
    });
    setBusy(false);
    if (!res.ok) return set({ error: errorText(res.error) });
    dispatch({ type: 'joined', studentId: res.studentId, approved: res.approved });
  }

  return (
    <div className="card join-screen">
      <h2>Join your class</h2>
      <label htmlFor="join-code">Class code</label>
      <input
        id="join-code" inputMode="numeric" autoComplete="off" maxLength={6}
        placeholder="6-digit code" value={state.joinCode}
        onChange={(e) => set({ joinCode: e.target.value.replace(/\D/g, '') })}
      />
      <label htmlFor="join-name">Your first name</label>
      <input
        id="join-name" maxLength={20} placeholder="e.g. Ana R." value={state.name}
        onChange={(e) => set({ name: e.target.value })}
      />

      <fieldset className="mode-pick">
        <legend>How do you want to play?</legend>
        <button
          type="button"
          className={`pick-card ${state.joinMode === 'versus' ? 'picked' : ''}`}
          onClick={() => set({ joinMode: 'versus' })}
        >
          <span className="pick-title">⚔️ Face a rival</span>
          <span className="pick-sub">Your teacher pairs you with a classmate. Spain vs France — assigned at random.</span>
        </button>
        <button
          type="button"
          className={`pick-card ${state.joinMode === 'solo' ? 'picked' : ''}`}
          onClick={() => set({ joinMode: 'solo' })}
        >
          <span className="pick-title">🤖 Play solo</span>
          <span className="pick-sub">You choose a nation. The computer plays the other one, using its real strategy.</span>
        </button>
      </fieldset>

      {state.joinMode === 'solo' && (
        <fieldset className="mode-pick nations">
          <legend>Pick your nation</legend>
          <button type="button" className={`pick-card spain ${state.joinNation === 'spain' ? 'picked' : ''}`} onClick={() => set({ joinNation: 'spain' })}>
            <span className="pick-title">Spain</span>
            <span className="pick-sub">Hold Texas with missions and presidios.</span>
          </button>
          <button type="button" className={`pick-card france ${state.joinNation === 'france' ? 'picked' : ''}`} onClick={() => set({ joinNation: 'france' })}>
            <span className="pick-title">France</span>
            <span className="pick-sub">Win Texas with trade and alliances.</span>
          </button>
        </fieldset>
      )}

      <p className="err" role="alert">{state.error}</p>
      <div className="btn-col">
        <button className="btn big" disabled={busy || state.joinCode.length !== 6 || state.name.trim().length < 2} onClick={join}>
          {busy ? 'Joining…' : 'Join'}
        </button>
        <button className="btn ghost" onClick={() => set({ screen: 'title', error: '' })}>Back</button>
      </div>
    </div>
  );
}

function WaitCard({ title, text, children }) {
  return (
    <div className="card wait-card">
      <div className="pulse-dot" aria-hidden="true" />
      <h2>{title}</h2>
      <p>{text}</p>
      {children}
    </div>
  );
}
