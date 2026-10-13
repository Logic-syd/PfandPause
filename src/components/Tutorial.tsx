import { useEffect, useRef, useState } from "react";
import { availableTiles, createGame, takeBottle, type TripleTransition } from "../game/triple";
import { triplePracticeLevel } from "../data/tutorial";
import { translations, LANGUAGE_OPTIONS, type Language } from "../i18n";
import { playSound, unlockAudio } from "../audio";
import Dialog from "./Dialog";
import Icon from "./Icon";
import FitBoard from "./FitBoard";
import TripleBoard from "./TripleBoard";
import { useBottleInput } from "./useBottleInput";

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export default function Tutorial({ language, reducedMotion, sound, onClose }: {
  language: Language; reducedMotion: boolean; sound: boolean; onClose: () => void;
}) {
  const t = translations[language];
  const [game, setGame] = useState(() => createGame(triplePracticeLevel));
  const gameRef = useRef(game);
  const input = useBottleInput(async id => { await animate(takeBottle(gameRef.current, id)); });
  const [busy, setBusy] = useState(false);
  const [fullGroup, setFullGroup] = useState<number | null>(null);
  const lock = useRef(false), epoch = useRef(0);
  const finished = game.status === "won";
  const full = game.endReason === "full";
  const formatMoney = (cents: number) => new Intl.NumberFormat(LANGUAGE_OPTIONS.find(option => option.code === language)!.locale, { style: "currency", currency: "EUR" }).format(cents / 100);
  useEffect(() => () => { epoch.current++; }, []);
  async function animate(result: TripleTransition) {
    if (lock.current || !result.frames.length) return;
    lock.current = true; setBusy(true); unlockAudio(); const ticket = epoch.current;
    for (const frame of result.frames) {
      if (ticket !== epoch.current) return;
      gameRef.current = frame.state;
      setGame(frame.state);
      setFullGroup(frame.event.kind === "full" ? frame.event.index : null);
      if (frame.event.kind !== "replace") playSound(frame.event.kind === "full" ? "full" : "pick", sound);
      await wait(reducedMotion ? 0 : frame.event.kind === "full" ? 240 : 100);
    }
    if (ticket !== epoch.current) return;
    gameRef.current = result.state;
    setGame(result.state); setFullGroup(null); setBusy(false); lock.current = false;
    if (result.state.status === "won") { playSound("win", sound); }
  }
  function reset() { epoch.current++; input.clear(); lock.current = false; setBusy(false); setFullGroup(null); gameRef.current = createGame(triplePracticeLevel); setGame(gameRef.current); }
  return <Dialog className={`tutorial-dialog ${finished ? "practice-finished" : ""}`} title={finished ? t.practiceComplete : full ? t.trayFull : t.practiceTitle} closeLabel={t.close} onClose={onClose}>
    <p className="practice-note">{t.practiceNote}</p>
    <FitBoard>{finished ? <p className="practice-summary">{t.practiceSummary}</p> : <>
      <p className={`practice-progress ${full ? "practice-full" : ""}`} role="status">{full ? t.practiceFull : game.buffer.length >= 5 ? t.practiceWarning : game.completed > 0 ? t.practiceMatched : game.moves > 0 ? t.practiceCollect : t.practiceStart}</p>
      <TripleBoard state={game} busy={busy} pendingIds={input.pendingIds} selectedGlass={null} wrongBin={false} fullGroup={fullGroup} t={t} formatMoney={formatMoney} onPick={id => { if (availableTiles(gameRef.current).includes(id)) input.enqueue(id); }} onReserve={() => {}} />
    </>}
    </FitBoard>
    <div className="practice-actions">
      {!finished && <button className={full ? "primary" : "text-button"} onClick={reset} disabled={busy}><Icon name="restart" size={18} />{full ? t.tryAgain : t.restart}</button>}
      <button className={finished ? "primary" : "text-button"} onClick={onClose}>{finished ? t.gotIt : t.skip}<Icon name="arrow" size={18} /></button>
    </div>
  </Dialog>;
}
