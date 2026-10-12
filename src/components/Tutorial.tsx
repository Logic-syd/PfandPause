import { useEffect, useRef, useState } from "react";
import { createGame, takeBottle, canUndo, undoBottle, moveOut, shuffleBoard, returnReserve, type TripleTransition } from "../game/triple";
import { triplePracticeLevel } from "../data/tutorial";
import { translations, LANGUAGE_OPTIONS, type Language } from "../i18n";
import { playSound, playWinVoice, stopVoice, unlockAudio } from "../audio";
import Dialog from "./Dialog";
import Icon from "./Icon";
import FitBoard from "./FitBoard";
import TripleBoard from "./TripleBoard";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export default function Tutorial({ language, reducedMotion, sound, onClose }: {
  language: Language; reducedMotion: boolean; sound: boolean; onClose: () => void;
}) {
  const t = translations[language];
  const [game, setGame] = useState(() => createGame(triplePracticeLevel));
  const [busy, setBusy] = useState(false);
  const [fullGroup, setFullGroup] = useState<number | null>(null);
  const lock = useRef(false), epoch = useRef(0);
  const finished = game.status === "won";
  const full = game.endReason === "full";
  const formatMoney = (cents: number) => new Intl.NumberFormat(LANGUAGE_OPTIONS.find(option => option.code === language)!.locale, { style: "currency", currency: "EUR" }).format(cents / 100);
  useEffect(() => () => { epoch.current++; stopVoice(); }, []);
  useEffect(() => { stopVoice(); }, [sound, language]);
  async function animate(result: TripleTransition) {
    if (lock.current || !result.frames.length) return;
    lock.current = true; setBusy(true); unlockAudio(); const ticket = epoch.current;
    for (const frame of result.frames) {
      if (ticket !== epoch.current) return;
      setGame(frame.state);
      setFullGroup(frame.event.kind === "full" ? frame.event.index : null);
      if (frame.event.kind !== "replace") playSound(frame.event.kind === "full" ? "full" : "pick", sound);
      await wait(reducedMotion ? 0 : frame.event.kind === "full" ? 240 : 100);
    }
    if (ticket !== epoch.current) return;
    setGame(result.state); setFullGroup(null); setBusy(false); lock.current = false;
    if (result.state.status === "won") { playSound("win", sound); void playWinVoice(language, sound); }
  }
  function reset() { epoch.current++; lock.current = false; stopVoice(); setBusy(false); setFullGroup(null); setGame(createGame(triplePracticeLevel)); }
  return <Dialog className={`tutorial-dialog ${finished ? "practice-finished" : ""}`} title={finished ? t.practiceComplete : t.practiceTitle} closeLabel={t.close} onClose={onClose}>
    <p className="practice-note">{t.practiceNote}</p>
    {!finished && <div className="practice-tools">
      <button className="text-button" onClick={reset} disabled={busy} aria-label={t.restart}><Icon name="restart" size={18} /><span>{t.restart}</span></button>
      <button className="text-button" onClick={() => setGame(shuffleBoard(game))} disabled={busy || game.shuffleUsed || game.status !== "playing"} aria-label={t.shuffle} title={t.shuffleNote}><Icon name="shuffle" size={18} /><span>{t.shuffle}</span></button>
      <button className="text-button" onClick={() => setGame(moveOut(game))} disabled={busy || game.moveOutUsed || game.buffer.length < 3 || game.reserveIds.length > 0} aria-label={t.moveOut} title={t.moveOutNote}><Icon name="lift" size={18} /><span>{t.moveOut}</span></button>
      <button className="secondary practice-recall" disabled={busy || !canUndo(game)} aria-label={t.undo} title={t.undoHint} onClick={() => setGame(undoBottle(game))}><Icon name="undo" size={18} /><span>{t.undo}</span></button>
    </div>}
    <FitBoard>{finished ? <p className="practice-summary">{t.practiceSummary}</p> : <>
      <p className={`practice-progress ${full ? "practice-full" : ""}`} role="status">{full ? game.moveOutUsed ? t.fullRecallOnly : t.practiceFull : `${game.returnedIds.length}/12 ${t.bottlesReturned}`}</p>
      <TripleBoard state={game} busy={busy} selectedGlass={null} wrongBin={false} fullGroup={fullGroup} t={t} formatMoney={formatMoney} onPick={id => void animate(takeBottle(game, id))} onReserve={index => void animate(returnReserve(game, index))} />
    </>}
    </FitBoard>
    <div className="practice-actions">
      <button className={finished ? "primary" : "text-button"} onClick={onClose}>{finished ? t.gotIt : t.skip}<Icon name="arrow" size={18} /></button>
    </div>
  </Dialog>;
}
