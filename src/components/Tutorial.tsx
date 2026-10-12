import { useEffect, useRef, useState } from "react";
import { createGame, takeBottle, canUndo, undoBottle } from "../game/triple";
import { levels } from "../data/levels";
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
  const [game, setGame] = useState(() => createGame(levels[0]));
  const [busy, setBusy] = useState(false);
  const [fullGroup, setFullGroup] = useState<number | null>(null);
  const lock = useRef(false), epoch = useRef(0);
  const finished = game.status === "won";
  const formatMoney = (cents: number) => new Intl.NumberFormat(LANGUAGE_OPTIONS.find(option => option.code === language)!.locale, { style: "currency", currency: "EUR" }).format(cents / 100);
  useEffect(() => () => { epoch.current++; stopVoice(); }, []);
  async function pick(id: number) {
    if (lock.current) return;
    const result = takeBottle(game, id);
    if (!result.frames.length) return;
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
  return <Dialog className={`tutorial-dialog ${finished ? "practice-finished" : ""}`} title={finished ? t.practiceComplete : t.practiceTitle} closeLabel={t.close} onClose={onClose}>
    <p className="practice-note">{t.practiceNote}</p>
    <FitBoard>{finished ? <p className="practice-summary">{t.practiceSummary}</p> :
      <TripleBoard state={game} busy={busy} selectedGlass={null} wrongBin={false} fullGroup={fullGroup} t={t} formatMoney={formatMoney} onPick={id => void pick(id)} onReserve={() => {}} />}
    </FitBoard>
    <div className="practice-actions">
      {!finished && <button className="secondary" disabled={busy || !canUndo(game)} onClick={() => setGame(undoBottle(game))}><Icon name="undo" size={18} />{t.undo}</button>}
      <button className={finished ? "primary" : "text-button"} onClick={onClose}>{finished ? t.gotIt : t.skip}<Icon name="arrow" size={18} /></button>
    </div>
  </Dialog>;
}
