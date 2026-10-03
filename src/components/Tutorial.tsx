import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createGame, takeBottle, cloneState } from "../game/engine";
import type { GameState } from "../game/types";
import { tutorialLevel, tutorialSteps } from "../data/tutorial";
import { translations, type Language } from "../i18n";
import { bottles } from "../data/bottles";
import { playSound, playWinVoice, stopVoice, unlockAudio } from "../audio";
import Bottle from "./Bottle";
import Dialog from "./Dialog";
import Icon from "./Icon";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export default function Tutorial({
  language,
  reducedMotion,
  sound,
  onClose,
}: {
  language: Language;
  reducedMotion: boolean;
  sound: boolean;
  onClose: () => void;
}) {
  const t = translations[language];
  const [game, setGame] = useState(() => createGame(tutorialLevel));
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fullCrate, setFullCrate] = useState<number | null>(null);
  const history = useRef<GameState[]>([]);
  const lock = useRef(false);
  const epoch = useRef(0);
  const target = useRef<HTMLButtonElement>(null);
  const current = tutorialSteps[step];
  const finished = step === tutorialSteps.length;
  const packed =
    game.completed * 3 + game.crates.reduce((n, c) => n + (c?.count ?? 0), 0);
  useEffect(
    () => () => {
      epoch.current++;
      stopVoice();
    },
    [],
  );
  useEffect(() => {
    if (!busy) target.current?.focus({ preventScroll: true });
  }, [step, busy]);

  useEffect(() => {
    stopVoice();
  }, [sound, language]);

  async function act(column: number | null) {
    if (lock.current || !current || current.column !== column) return;
    lock.current = true;
    setBusy(true);
    unlockAudio();
    const ticket = epoch.current;
    if (column === null) {
      const previous = history.current.pop();
      if (previous) setGame(previous);
      await wait(0);
    } else {
      const result = takeBottle(game, column);
      history.current.push(cloneState(game));
      for (const frame of result.frames) {
        if (ticket !== epoch.current) return;
        setGame(frame.state);
        setFullCrate(frame.event.kind === "full" ? frame.event.index : null);
        if (frame.event.kind !== "replace")
          playSound(frame.event.kind === "full" ? "full" : "pick", sound);
        await wait(reducedMotion ? 0 : frame.event.kind === "full" ? 300 : 180);
      }
      if (ticket !== epoch.current) return;
      setGame(result.state);
      setFullCrate(null);
      if (result.state.status === "won") {
        playSound("win", sound);
        void playWinVoice(language, sound);
      }
    }
    if (ticket !== epoch.current) return;
    setStep((i) => i + 1);
    setBusy(false);
    lock.current = false;
  }

  return (
    <Dialog
      className="tutorial-dialog"
      title={t.practiceTitle}
      closeLabel={t.close}
      onClose={onClose}
    >
      <p className="practice-note">{t.practiceNote}</p>
      <div
        className={`practice-coach ${game.status === "lost" ? "practice-warning" : ""}`}
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="practice-number">
          {finished ? (
            <Icon name="check" size={18} />
          ) : (
            `${current.lesson + 1}/6`
          )}
        </span>
        <div>
          <h3>
            {finished ? t.practiceComplete : t.practiceTitles[current.lesson]}
          </h3>
          <p>{finished ? t.practiceSummary : t.practiceSteps[step]}</p>
        </div>
      </div>
      <div className="practice-board" data-step={step} aria-busy={busy}>
        <div className="practice-counter">
          <div className="section-label">
            <span>{t.counter}</span>
            <span>
              {packed}/9 {t.practicePacked}
            </span>
          </div>
          <div className="practice-stacks">
            {game.columns.map((column, i) => (
              <div className="practice-stack" key={i}>
                <span className="practice-stack-number">{i + 1}</span>
                {column.map((type, depth) => {
                  const style = {
                    top: depth * 20,
                    zIndex: column.length - depth,
                  };
                  return depth === 0 ? (
                    <button
                      key={`${game.moves}-${depth}`}
                      ref={current?.column === i ? target : undefined}
                      data-tutorial-column={i}
                      className={`practice-bottle ${current?.column === i ? "practice-target" : ""}`}
                      disabled={busy || finished || current?.column !== i}
                      style={style}
                      onClick={() => void act(i)}
                      aria-label={`${t.pick} ${t.bottleNames[type]} · ${t.column} ${i + 1}`}
                    >
                      <Bottle type={type} />
                    </button>
                  ) : (
                    <div
                      className="practice-bottle practice-buried"
                      key={`${game.moves}-${depth}`}
                      style={style}
                    >
                      <Bottle type={type} />
                    </div>
                  );
                })}
                {!column.length && (
                  <span className="practice-empty">
                    <Icon name="check" size={17} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div
          className={`practice-buffer ${game.status === "lost" ? "practice-buffer-full" : ""}`}
        >
          <div>
            <strong>{t.buffer}</strong>
            <span>{game.buffer.length}/3</span>
          </div>
          <div className="buffer-slots">
            {[0, 1, 2].map((i) => (
              <div
                className={`buffer-slot ${game.buffer[i] ? "occupied" : ""}`}
                key={i}
              >
                {game.buffer[i] ? (
                  <Bottle type={game.buffer[i]} />
                ) : (
                  <span>+</span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="practice-crates">
          {game.crates.map((crate, i) => (
            <div
              key={i}
              className={`practice-crate ${fullCrate === i ? "crate-full" : ""}`}
              style={
                {
                  "--crate-light": crate
                    ? bottles[crate.type].light
                    : "#e5ecdf",
                  "--crate-color": crate
                    ? bottles[crate.type].color
                    : "#73866d",
                } as CSSProperties
              }
              aria-label={
                crate
                  ? `${t.crate} ${i + 1}: ${t.bottleNames[crate.type]}, ${crate.count}/3`
                  : t.crateDone
              }
            >
              <div className="crate-heading">
                <span className="crate-name">
                  {crate ? t.bottleNames[crate.type] : t.crateDone}
                </span>
                <span className="crate-amount">
                  {crate ? `${crate.count}/3` : "✓"}
                </span>
              </div>
              <div className="practice-crate-slots">
                {[0, 1, 2].map((j) => (
                  <div
                    className={crate && j < crate.count ? "has-bottle" : ""}
                    key={j}
                  >
                    {crate ? (
                      <Bottle type={crate.type} />
                    ) : (
                      <Icon name="check" size={15} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="practice-next">
          <Icon name="receipt" size={16} />
          {t.practiceNext}:{" "}
          <strong>
            {game.orders[game.nextOrder]
              ? t.bottleNames[game.orders[game.nextOrder]]
              : t.noOrders}
          </strong>
        </div>
      </div>
      <div className="practice-actions">
        {!finished && (
          <button className="text-button" onClick={onClose}>
            {t.skip}
          </button>
        )}
        {current?.column === null && (
          <button
            ref={target}
            className="primary"
            disabled={busy}
            onClick={() => void act(null)}
          >
            <Icon name="undo" size={18} />
            {t.practiceUndo}
          </button>
        )}
        {finished && (
          <button className="primary" onClick={onClose}>
            {t.gotIt}
            <Icon name="arrow" size={18} />
          </button>
        )}
      </div>
    </Dialog>
  );
}
