// CommandCenter.jsx — the teacher dashboard. Create a session → share the code
// → approve names → Pair & Start → watch live pairings, status, and per-nation
// accuracy → download the PDF → End Session (deletes everything from memory).

import { useEffect, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getSocket, emitAck, errorText } from '../../services/socket.js';

const NATION_LABEL = { spain: 'Spain', france: 'France' };
const STATUS_LABEL = { not_started: 'Not started', in_progress: 'In progress', completed: 'Completed' };

export default function CommandCenter() {
  const [phase, setPhase] = useState('gate'); // gate | dash
  const [pin, setPin] = useState('');
  const [resumeCode, setResumeCode] = useState('');
  const [requireApproval, setRequireApproval] = useState(true);
  const [roster, setRoster] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirmEnd, setConfirmEnd] = useState(false);
  const credentials = useRef(null); // { joinCode, pin } — memory only, by design

  useEffect(() => {
    const socket = getSocket();
    const onRoster = (payload) => setRoster(payload);
    const onEnded = () => {
      credentials.current = null;
      setRoster(null);
      setPhase('gate');
      setNotice('Session ended. All session data has been deleted.');
    };
    const onReconnect = async () => {
      if (!credentials.current) return;
      const res = await emitAck('teacher:resume', credentials.current);
      if (res.ok) setRoster(res.roster);
    };
    socket.on('lobby:update', onRoster);
    socket.on('session:ended', onEnded);
    socket.io.on('reconnect', onReconnect);
    return () => {
      socket.off('lobby:update', onRoster);
      socket.off('session:ended', onEnded);
      socket.io.off('reconnect', onReconnect);
    };
  }, []);

  async function createSession() {
    setError('');
    const res = await emitAck('teacher:create_session', { pin, requireApproval });
    if (!res.ok) return setError(res.error === 'bad_pin' ? 'PIN must be exactly 4 digits.' : errorText(res.error));
    credentials.current = { joinCode: res.joinCode, pin };
    setRoster(res.roster);
    setPhase('dash');
    setNotice('');
  }

  async function resumeSession() {
    setError('');
    const res = await emitAck('teacher:resume', { joinCode: resumeCode.trim(), pin });
    if (!res.ok) return setError(errorText(res.error));
    credentials.current = { joinCode: res.joinCode, pin };
    setRoster(res.roster);
    setPhase('dash');
    setNotice('');
  }

  async function op(event, extra = {}, okNotice = '') {
    setError('');
    const res = await emitAck(event, { ...credentials.current, ...extra });
    if (!res.ok) setError(errorText(res.error));
    else if (okNotice) setNotice(okNotice);
    return res;
  }

  if (phase === 'gate') {
    return (
      <div className="app teacher-app">
        <h1>Teacher Command Center</h1>
        <p className="muted">Claim the Land · Spain vs France · TEKS 7.2B, 7.2C</p>
        {notice && <div className="note">{notice}</div>}
        <div className="gate-grid">
          <div className="card">
            <h2>Start a new session</h2>
            <label htmlFor="pin">Choose a 4-digit PIN</label>
            <input id="pin" type="password" inputMode="numeric" maxLength={4} value={pin}
                   onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 4321" />
            <label className="switch">
              <input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} />
              Students wait for my approval before playing
            </label>
            <button className="btn big" disabled={pin.length !== 4} onClick={createSession}>Create session</button>
          </div>
          <div className="card">
            <h2>Resume a session</h2>
            <p className="muted">Got disconnected? Enter the same code and PIN.</p>
            <label htmlFor="rcode">Class code</label>
            <input id="rcode" inputMode="numeric" maxLength={6} value={resumeCode}
                   onChange={(e) => setResumeCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code" />
            <label htmlFor="rpin">PIN</label>
            <input id="rpin" type="password" inputMode="numeric" maxLength={4} value={pin}
                   onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} />
            <button className="btn" disabled={resumeCode.length !== 6 || pin.length !== 4} onClick={resumeSession}>Resume</button>
          </div>
        </div>
        <p className="err" role="alert">{error}</p>
        <div className="note">
          <b>Session-only data:</b> everything lives in server memory. Ending the
          session (or ~2 hours of inactivity) deletes it all. The PDF you download
          is the only lasting record.
        </div>
      </div>
    );
  }

  const students = roster?.students || [];
  const pending = students.filter((s) => !s.approved);
  const waitingVersus = students.filter((s) => s.approved && s.mode === 'versus' && s.status === 'not_started');
  const partnerName = (s) => {
    if (!s.matchId) return '—';
    const match = roster.matches.find((m) => m.matchId === s.matchId);
    if (!match) return '—';
    if (match.solo) return 'The Computer';
    const other = match.players.find((p) => p.studentId !== s.id && p.studentId !== 'AI');
    if (!other) return 'The Computer';
    return students.find((x) => x.id === other.studentId)?.name || '—';
  };
  const convertible = (s) => {
    if (!s.matchId || s.status !== 'in_progress') return false;
    const match = roster.matches.find((m) => m.matchId === s.matchId);
    if (!match || match.solo || match.status !== 'active') return false;
    // Offer convert when this row's player is the disconnected one.
    return !s.connected;
  };

  return (
    <div className="app teacher-app">
      <header className="row">
        <div>
          <h1>Teacher Command Center</h1>
          <p className="muted">Claim the Land · session-only data · download the PDF before you end</p>
        </div>
        <button className="btn danger" onClick={() => setConfirmEnd(true)}>End Session</button>
      </header>

      <div className="card row code-card">
        <div>
          <div className="muted">Class code — students enter this to join</div>
          <div className="code-display">{roster?.joinCode}</div>
        </div>
        <label className="switch">
          <input
            type="checkbox"
            checked={!!roster?.requireApproval}
            onChange={(e) => op('teacher:set_approval', { requireApproval: e.target.checked })}
          />
          Name approval required
        </label>
      </div>

      {notice && <div className="note">{notice}</div>}
      <p className="err" role="alert">{error}</p>

      {pending.length > 0 && (
        <div className="card">
          <h2>Waiting for approval ({pending.length})</h2>
          {pending.map((s) => (
            <div key={s.id} className="row approval-row">
              <b>{s.name}</b>
              <span>
                <button className="btn small" onClick={() => op('teacher:approve_name', { studentId: s.id })}>Approve</button>
                <button className="btn small secondary" onClick={() => {
                  const name = window.prompt('New name for this student:', s.name);
                  if (name) op('teacher:rename', { studentId: s.id, name });
                }}>Rename</button>
                <button className="btn small danger" onClick={() => op('teacher:kick', { studentId: s.id })}>Remove</button>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="row">
          <div>
            <h2>Matchmaking</h2>
            <p className="muted">
              {waitingVersus.length} student{waitingVersus.length === 1 ? '' : 's'} waiting to be paired.
              Pairs and nations are random; an odd student out plays solo vs the computer.
              Solo joiners start on their own as soon as they’re approved.
            </p>
          </div>
          <button
            className="btn big"
            disabled={waitingVersus.length === 0}
            onClick={() => op('teacher:pair_and_start', {}, 'Players paired and matches started!')}
          >
            ⚔️ Pair &amp; Start
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Roster ({students.length})</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Student</th><th>Mode</th><th>Nation</th><th>Partner</th><th>Status</th><th>Accuracy</th><th></th></tr>
            </thead>
            <tbody>
              {students.length === 0 && (
                <tr><td colSpan={7} className="muted">Nobody has joined yet. Share the class code!</td></tr>
              )}
              {students.map((s) => (
                <tr key={s.id}>
                  <td>
                    <span className={`conn-dot ${s.connected ? 'on' : 'off'}`} title={s.connected ? 'Connected' : 'Disconnected'} />{' '}
                    {s.name}{!s.approved && <span className="badge pending">pending</span>}
                  </td>
                  <td>{s.mode === 'solo' ? 'Solo' : 'Head-to-head'}</td>
                  <td>{s.nation ? <span className={`badge nation ${s.nation}`}>{NATION_LABEL[s.nation]}</span> : '—'}</td>
                  <td>{partnerName(s)}</td>
                  <td><span className={`badge ${s.status}`}>{STATUS_LABEL[s.status]}</span></td>
                  <td className="num">{s.accuracy != null ? `${s.accuracy}%` : '—'}</td>
                  <td className="row-actions">
                    {convertible(s) && (
                      <button className="btn small secondary"
                              title="The computer takes over for this disconnected player"
                              onClick={() => op('teacher:convert_to_solo', { matchId: s.matchId }, 'Match converted — the computer plays on.')}>
                        Convert to solo
                      </button>
                    )}
                    <button className="btn small danger" onClick={() => op('teacher:kick', { studentId: s.id })}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Class accuracy by nation</h2>
        <div className="nation-cards">
          {['spain', 'france'].map((n) => {
            const g = roster?.classAccuracy?.[n];
            return (
              <div key={n} className={`nation-card ${n}`}>
                <b>{NATION_LABEL[n]}</b>
                <div className="big-number">{g?.count ? `${g.average}%` : '—'}</div>
                <div className="muted">{g?.count || 0} completed</div>
              </div>
            );
          })}
        </div>
        <div className="btn-row">
          <button className="btn" onClick={() => downloadPdf(roster)}>⬇ Download PDF report</button>
        </div>
        <p className="muted">The PDF is the only record that survives the session. Download it before you end.</p>
      </div>

      {confirmEnd && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className="card dialog">
            <h2 id="end-title">End this session?</h2>
            <p><b>This will delete session data. Do you want to proceed?</b></p>
            <p className="muted">
              Every student record for this session is erased from server memory
              immediately. There is no undo. Make sure you downloaded the PDF first.
            </p>
            <div className="btn-row right">
              <button className="btn secondary" onClick={() => setConfirmEnd(false)}>Cancel</button>
              <button className="btn danger" onClick={async () => { setConfirmEnd(false); await op('teacher:end_session'); }}>
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="app-footer">7th Grade Texas History · Claim the Land · TEKS 7.2B, 7.2C</footer>
    </div>
  );
}

/* ---------------- PDF (jsPDF + autotable, fully client-side) ---------------- */

function downloadPdf(roster) {
  if (!roster) return;
  const date = new Date().toISOString().slice(0, 10);
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text('Claim the Land — Session Report', 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(90);
  const versusCount = roster.matches.filter((m) => !m.solo).length;
  doc.text(
    `Class code: ${roster.joinCode}   ·   Date: ${date}   ·   Students: ${roster.students.length}   ·   Head-to-head matches: ${versusCount}`,
    14, 23
  );

  const students = roster.students.map((s) => {
    let partner = '—';
    if (s.matchId) {
      const match = roster.matches.find((m) => m.matchId === s.matchId);
      const other = match && !match.solo && match.players.find((p) => p.studentId !== s.id && p.studentId !== 'AI');
      partner = other ? (roster.students.find((x) => x.id === other.studentId)?.name || '—') : 'The Computer';
    }
    return [
      s.name,
      s.nation ? NATION_LABEL[s.nation] : '—',
      s.mode === 'solo' ? 'Solo' : 'Versus',
      partner,
      STATUS_LABEL[s.status],
      s.accuracy != null ? `${s.accuracy}%` : '—',
    ];
  });

  autoTable(doc, {
    startY: 30,
    head: [['Student', 'Nation', 'Mode', 'Partner', 'Status', 'Accuracy']],
    body: students,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [140, 90, 43] },
  });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [['Nation', 'Completed', 'Average accuracy']],
    body: ['spain', 'france'].map((n) => [
      NATION_LABEL[n],
      String(roster.classAccuracy?.[n]?.count ?? 0),
      roster.classAccuracy?.[n]?.count ? `${roster.classAccuracy[n].average}%` : '—',
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [140, 90, 43] },
  });

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.text('7th Grade Texas History · Claim the Land · TEKS 7.2B, 7.2C', 14, doc.internal.pageSize.getHeight() - 8);

  doc.save(`claim-the-land_${roster.joinCode}_${date}.pdf`);
}
