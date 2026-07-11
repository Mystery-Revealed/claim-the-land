// ResultScreen.jsx — match result + debrief. Two separate stories, told in
// order: (1) who won the match, (2) the score that actually matters — accuracy.

import { Art } from '../../services/assets.jsx';

export default function ResultScreen({ state, dispatch }) {
  const end = state.matchEnd;
  const meta = end.meta || state.match?.begin?.meta;
  const mySide = end.yourSide;
  const rivalSide = end.rival.side;
  const myName = nationName(meta, mySide);
  const rivalName = nationName(meta, rivalSide);

  const headline =
    end.winner === 'tie' ? 'A dead heat!'
    : end.winner === mySide ? `You claimed the land for ${myName}!`
    : `${rivalName} claimed more of Texas.`;

  return (
    <div className="card result-screen">
      <div className="event-kicker">The era ends — 1722</div>
      <h1 className={`result-headline ${end.winner === mySide ? 'win' : end.winner === 'tie' ? 'tie' : 'loss'}`}>
        {headline}
      </h1>

      <Art name={meta?.nations?.[mySide]?.banner} alt={`${myName} in early Texas`} className="result-art" />

      <div className={`ending-block ${mySide}`}>
        <h2>{end.you.ending.title}</h2>
        <p>{end.you.ending.text}</p>
      </div>

      <div className="score-compare" aria-label="Final claim scores">
        <ScoreRow label={`${myName} (you)`} side={mySide} score={end.you.claimScore} regions={end.you.regionsHeld} collapsed={end.you.collapsed} />
        <ScoreRow label={end.rival.isAI ? `${rivalName} (computer)` : rivalName} side={rivalSide} score={end.rival.claimScore} regions={end.rival.regionsHeld} collapsed={end.rival.collapsed} />
      </div>

      <div className="accuracy-block">
        <div className="accuracy-number">{end.you.accuracy}%</div>
        <div>
          <b>Your accuracy — the score your teacher sees.</b>
          <p>How well your 12 choices matched what your nation really did in history. Winning the match is separate!</p>
        </div>
      </div>

      {end.you.accuracyNote && <div className="note history-note">⭐ {end.you.accuracyNote}</div>}

      <div className="debrief">
        <h3>What really happened</h3>
        <p>{end.you.debrief}</p>
      </div>

      <div className="btn-col">
        <button
          className="btn big"
          onClick={() => dispatch({ type: 'play-again', mode: 'solo', nation: rivalSide })}
        >
          Try the other nation ({rivalName})
        </button>
        <button className="btn secondary" onClick={() => dispatch({ type: 'play-again' })}>
          Play again
        </button>
      </div>
    </div>
  );
}

function ScoreRow({ label, side, score, regions, collapsed }) {
  return (
    <div className={`score-row ${side}`}>
      <span className="score-label"><span className={`dot ${side}`} aria-hidden="true" /> {label}</span>
      <span className="score-bar-track">
        <span className="score-bar" style={{ width: `${Math.min(100, (score / 220) * 100)}%` }} />
      </span>
      <span className="score-value">
        {collapsed ? '💥 collapsed · ' : ''}{score} pts · {regions} region{regions === 1 ? '' : 's'}
      </span>
    </div>
  );
}

const nationName = (meta, side) => meta?.nations?.[side]?.name || (side === 'spain' ? 'Spain' : 'France');
