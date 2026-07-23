// MatchView.jsx — one chapter beat at a time: event card → map move →
// feedback → decision → feedback → rival's turn. The map is always on screen;
// the action panel swaps.

import { useEffect, useState } from 'react';
import { emitAck, errorText } from '../../services/socket.js';
import { Art } from '../../services/assets.jsx';
import TexasMap, { MarkerGlyph } from '../shared/TexasMap.jsx';
import MetersBar from '../shared/MetersBar.jsx';

export default function MatchView({ state, dispatch }) {
  const { match } = state;
  const { begin, eventCard, turn, feedback, partner, ticker } = match;
  const meta = begin.meta;
  const mySide = begin.side;
  const myNation = meta.nations[mySide];
  const rivalSide = mySide === 'spain' ? 'france' : 'spain';
  const rivalNation = meta.nations[rivalSide];

  // Region picked for the current map move (cleared whenever the step changes).
  const [pickedRegion, setPickedRegion] = useState(null);
  useEffect(() => setPickedRegion(null), [turn?.stepIndex, turn?.kind]);

  // The server pushes the NEXT chapter's chapter:event AND its first turn:begin
  // synchronously with the CURRENT chapter's LAST turn:resolution — it doesn't
  // wait for the student to dismiss anything. So while a chapter-ending verdict
  // is on screen, eventCard AND turn have BOTH already raced ahead, and
  // preferring either would make the chip read one chapter ahead. Only
  // feedback.stepIndex is baked into the feedback payload itself and can't
  // race — derive the chapter from it (2 steps per chapter, the same rule the
  // server's chapterOf uses). Once feedback is dismissed, eventCard/turn are
  // exactly what's on screen next, so THEIR chapter is what should show.
  const chapters = meta.chapters?.[mySide] || [];
  const stepsPerChapter = meta.stepsPerChapter || 2;
  const chapterIndexFor = (stepIndex) => Math.floor(stepIndex / stepsPerChapter);
  const liveChapterIndex = feedback ? chapterIndexFor(feedback.stepIndex)
    : turn?.yourTurn ? chapterIndexFor(turn.stepIndex)
    : eventCard ? eventCard.chapter.index
    : null;
  const chapter = liveChapterIndex != null && chapters[liveChapterIndex]
    ? { index: liveChapterIndex, count: chapters.length, ...chapters[liveChapterIndex] }
    : (eventCard?.chapter || turn?.chapter); // fallback if meta.chapters is ever absent
  const mapTurnActive = !feedback && !eventCard && !!turn?.yourTurn && turn.kind === 'map';
  const lowStrength = match.meters.strength > 0 && match.meters.strength <= 15;

  return (
    <div className="match">
      <header className="match-header">
        <div className={`nation-chip ${mySide}`}>
          You are <b>{myNation.name}</b>
        </div>
        <div className="vs-chip">
          vs {begin.opponentName} (<span className={`dot ${rivalSide}`} aria-hidden="true" />{rivalNation.name})
        </div>
        {chapter && (
          <div className="chapter-chip">
            Chapter {chapter.index + 1} of {chapter.count} · {chapter.year}
          </div>
        )}
      </header>

      <div className="meters-row">
        <MetersBar meters={match.meters} meta={meta} title={`Your meters — ${myNation.name}`} />
        <MetersBar meters={match.rivalMeters} meta={meta} compact title={`Rival — ${rivalNation.name}`} />
      </div>

      {lowStrength && (
        <div className="banner danger" role="alert">
          ⚠️ Your Strength is very low. If it hits 0, your colony collapses!
        </div>
      )}

      {partner === 'disconnected' && (
        <div className="banner" role="status">⏳ Waiting for your partner…</div>
      )}
      {partner === 'gone' && (
        <div className="banner offer" role="alert">
          <span>Your partner seems to be gone.</span>
          <FinishVsAIButton />
        </div>
      )}

      <div className="match-body">
        <section className="action-panel" aria-live="polite">
          {feedback ? (
            <FeedbackPanel
              feedback={feedback}
              meta={meta}
              matchEnded={!!state.matchEnd}
              onContinue={() => dispatch({ type: 'dismiss-feedback' })}
            />
          ) : eventCard ? (
            <EventCard eventCard={eventCard} meta={meta} onContinue={() => dispatch({ type: 'dismiss-event' })} />
          ) : turn?.yourTurn && turn.kind === 'map' ? (
            <MapMovePanel turn={turn} meta={meta} region={pickedRegion} onChangeRegion={setPickedRegion} />
          ) : turn?.yourTurn && turn.kind === 'decision' ? (
            <DecisionPanel turn={turn} />
          ) : (
            <WaitingPanel rivalNation={rivalNation} ticker={ticker} />
          )}
        </section>

        <section className="map-panel">
          <TexasMap
            meta={meta}
            map={match.map}
            owners={match.owners}
            mySide={mySide}
            selectable={mapTurnActive}
            selected={pickedRegion}
            onSelect={setPickedRegion}
          />
          <MapLegend meta={meta} />
          {ticker && <p className="ticker" role="status">{ticker}</p>}
        </section>
      </div>
    </div>
  );
}

/* -------- panels -------- */

function EventCard({ eventCard, meta, onContinue }) {
  const ch = eventCard.chapter;
  return (
    <div className="event-card">
      <div className="event-kicker">Chapter {ch.index + 1} of {ch.count} · {ch.year}</div>
      <h2>{ch.title}</h2>
      <Art name={ch.image} alt={ch.title} className="event-art" />
      <p className="event-text">{eventCard.text}</p>
      {eventCard.eventEffects && (
        <div className="effects-row">
          {Object.entries(eventCard.eventEffects).map(([k, v]) => (
            <span key={k} className={`effect-chip ${v > 0 ? 'up' : 'down'}`}>
              {meta.meters[k]?.name} {v > 0 ? `+${v}` : v}
            </span>
          ))}
        </div>
      )}
      <button className="btn big" onClick={onContinue}>To the map!</button>
    </div>
  );
}

function MapMovePanel({ turn, meta, region, onChangeRegion }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function place(marker) {
    if (busy || !region) return;
    setBusy(true);
    const res = await emitAck('student:submit_move', { move: { kind: 'map', region, marker } });
    if (!res.ok) { setErr(errorText(res.error)); setBusy(false); }
    // On success the server pushes turn:resolution and this panel unmounts.
  }

  return (
    <div className="move-panel">
      <h2>🗺️ Your map move</h2>
      <p className="prompt">{turn.prompt}</p>
      {turn.hint && <p className="hint">💡 {turn.hint}</p>}
      {!region ? (
        <p className="instruction">👉 Tap a region on the map to build there.</p>
      ) : (
        <>
          <p className="instruction">
            Building in <b>{meta.regions[region]?.name}</b>{' '}
            <button className="btn tiny ghost" disabled={busy} onClick={() => onChangeRegion(null)}>
              change region
            </button>
          </p>
          <div className="marker-cards">
            {Object.entries(meta.markers).map(([id, m]) => (
              <button key={id} className="marker-card" disabled={busy} onClick={() => place(id)}>
                <svg viewBox="0 0 20 20" className="marker-card-icon" aria-hidden="true">
                  <MarkerGlyph marker={id} color="#5f3c1a" />
                </svg>
                <span className="pick-title">{m.name}</span>
                <span className="pick-sub">{m.blurb}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <p className="err" role="alert">{err}</p>
    </div>
  );
}

function DecisionPanel({ turn }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function choose(choiceIndex) {
    if (busy) return;
    setBusy(true);
    const res = await emitAck('student:submit_move', { move: { kind: 'decision', choiceIndex } });
    if (!res.ok) { setErr(errorText(res.error)); setBusy(false); }
  }

  return (
    <div className="move-panel">
      <h2>🤔 Your decision</h2>
      <p className="prompt">{turn.prompt}</p>
      <div className="choice-list">
        {(turn.choices || []).map((label, i) => (
          <button key={i} className="choice-btn" disabled={busy} onClick={() => choose(i)}>
            {label}
          </button>
        ))}
      </div>
      <p className="err" role="alert">{err}</p>
    </div>
  );
}

const VERDICT_UI = {
  right: { label: 'Right on target!', className: 'right', icon: '✓' },
  partial: { label: 'Halfway there', className: 'partial', icon: '≈' },
  wrong: { label: 'Not what happened', className: 'wrong', icon: '✗' },
};

function FeedbackPanel({ feedback, meta, matchEnded, onContinue }) {
  const v = VERDICT_UI[feedback.verdict] || VERDICT_UI.partial;
  return (
    <div className="feedback-panel">
      <div className={`verdict-badge ${v.className}`}>
        <span aria-hidden="true">{v.icon}</span> {v.label}
      </div>
      {feedback.placed && (
        <p className="placed-line">
          You placed a <b>{meta.markers[feedback.placed.marker]?.name}</b> in{' '}
          <b>{meta.regions[feedback.placed.region]?.name}</b>.
        </p>
      )}
      <p className="feedback-text">{feedback.feedback}</p>
      <div className="effects-row">
        {Object.entries(feedback.effects || {}).map(([k, val]) => (
          <span key={k} className={`effect-chip ${val > 0 ? 'up' : 'down'}`}>
            {meta.meters[k]?.name} {val > 0 ? `+${val}` : val}
          </span>
        ))}
      </div>
      {feedback.collapsed && (
        <div className="banner danger">💥 Your Strength hit 0 — your colony has collapsed, like Fort St. Louis!</div>
      )}
      <button className="btn big" onClick={onContinue}>
        {matchEnded ? 'See how it ends' : 'Continue'}
      </button>
    </div>
  );
}

function WaitingPanel({ rivalNation, ticker }) {
  return (
    <div className="waiting-panel">
      <div className="pulse-dot" aria-hidden="true" />
      <h2>{rivalNation.name} is making its move…</h2>
      <p>{ticker || 'Watch the map — you’ll see their markers appear.'}</p>
    </div>
  );
}

function FinishVsAIButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true);
    const res = await emitAck('student:finish_vs_ai', {});
    if (!res.ok) { setErr(errorText(res.error)); setBusy(false); }
  }
  return (
    <span>
      <button className="btn" disabled={busy} onClick={go}>Finish vs the computer</button>
      {err && <span className="err inline">{err}</span>}
    </span>
  );
}

function MapLegend({ meta }) {
  return (
    <div className="map-legend">
      {Object.entries(meta.nations).map(([id, n]) => (
        <span key={id} className="legend-item">
          <span className={`dot ${id}`} aria-hidden="true" /> {n.name}
        </span>
      ))}
      <span className="legend-item"><span className="dot contested" aria-hidden="true" /> Contested</span>
    </div>
  );
}
