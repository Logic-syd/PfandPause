import { useEffect, useRef, useState, type CSSProperties } from "react";
import Bottle from "./components/Bottle";
import Icon from "./components/Icon";
import Dialog from "./components/Dialog";
import Tutorial from "./components/Tutorial";
import RecyclingPractice from "./components/RecyclingPractice";
import FitBoard from "./components/FitBoard";
import { useRoundClock } from "./components/useRoundClock";
import { timeLimit, MAX_GLASS_MISTAKES } from "./game/time";
import { TUTORIAL_VERSION } from "./data/tutorial";
import { levels } from "./data/levels";
import { returnStats } from "./game/returns";
import { bottles, bottleDeposits } from "./data/bottles";
import { cloneState, createGame, takeBottle } from "./game/engine";
import { glassTypes, isGlass, type GlassType, type BottleType, type GameState, type Place } from "./game/types";
import { LANGUAGE_OPTIONS, translations } from "./i18n";
import { loadPreferences, savePreferences } from "./storage";
import { playSound, playWinVoice, stopVoice, unlockAudio } from "./audio";

type Screen = "start" | "play" | "levels" | "recycling";
type Flight = {
  source: string;
  bottle: BottleType;
  x: number;
  y: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const locationSelector = (place: Place) =>
  `[data-place="${place.kind}-${place.index}"]`;
function scrollToStart() {
  // Reset secondary screens before returning to the fitted board.
  document.getElementById("root")?.scrollTo({ top: 0 });
}
export default function App() {
  const [preferences, setPreferences] = useState(loadPreferences);
  const [saveError, setSaveError] = useState(false);
  const [screen, setScreen] = useState<Screen>("start");
  const [levelIndex, setLevelIndex] = useState(() => Math.max(
    0, levels.findIndex((level) => !preferences.completed.includes(level.id)),
  ));
  const [game, setGame] = useState(() => createGame(levels[levelIndex]));
  const gameRef = useRef(game);
  const [history, setHistory] = useState<GameState[]>([]);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const epoch = useRef(0);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [fullCrate, setFullCrate] = useState<number | null>(null);
  const [modal, setModal] = useState<"settings" | "help" | "orders" | null>(
    null,
  );
  const [tutorial, setTutorial] = useState(false);
  const [selectedGlass, setSelectedGlass] = useState<number | null>(null);
  const [wrongBin, setWrongBin] = useState(false);
  const [penaltyNotice, setPenaltyNotice] = useState<"buffer" | "bin" | null>(null);
  const t = translations[preferences.language];
  const level = levels[levelIndex];
  const clock = useRoundClock(screen === "play" && game.status === "playing" && !modal && !tutorial, timeLimit(level));
  const seconds = Math.ceil(clock.milliseconds / 1000);
  const returned = returnStats(level.columns.flat());
  const total = level.columns.flat().length;
  const hasGlass = level.columns.flat().some(isGlass);
  const formatDeposit = (cents: number) => new Intl.NumberFormat(
    LANGUAGE_OPTIONS.find(option => option.code === preferences.language)!.locale,
    { style: "currency", currency: "EUR" },
  ).format(cents / 100);
  const refundAmount = formatDeposit(returned.cents);
  const packed =
    game.recycled.length + game.completed * 3 +
    game.crates.reduce((sum, c) => sum + (c?.count ?? 0), 0);
  const remaining = game.columns.flat().length;
  const nextUnfinished = Math.max(
    0,
    levels.findIndex((l) => !preferences.completed.includes(l.id)),
  );
  const allComplete = preferences.completed.length === levels.length;

  const orderList = (
    <ol className="all-orders">
      {game.orders.map((type, i) => {
        const active = game.crates.some((c) => c?.order === i);
        const completed = i < game.nextOrder && !active;
        return (
          <li className={completed ? "order-completed" : ""} key={i}>
            <span>{String(i + 1).padStart(2, "0")}</span>
            <Bottle type={type} />
            <span>
              {t.bottleNames[type]}
              <small>
                {completed ? t.delivered : active ? t.inProgress : t.waiting}
              </small>
            </span>
            <b>{completed ? "✓" : "×3"}</b>
          </li>
        );
      })}
    </ol>
  );

  useEffect(() => {
    setSaveError(!savePreferences(preferences));
    document.documentElement.lang = preferences.language;
    document.title = `${t.brand} · ${t.noRush}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", t.metaDescription);
  }, [preferences, t.brand, t.noRush, t.metaDescription]);
  useEffect(
    () => () => {
      epoch.current++;
      stopVoice();
    },
    [],
  );
  useEffect(() => {
    stopVoice();
  }, [preferences.sound, preferences.language]);
  useEffect(() => {
    if (clock.milliseconds <= 0 && screen === "play" && game.status === "playing") expire();
  }, [clock.milliseconds, screen, game.status]);

  function expire() {
    epoch.current++;
    locked.current = false;
    setBusy(false);
    setFlight(null);
    setFullCrate(null);
    display({ ...gameRef.current, status:"lost", endReason:"time" });
  }

  function display(state: GameState) {
    gameRef.current = state;
    setGame(state);
  }
  function start(index: number) {
    stopVoice();
    epoch.current++;
    locked.current = false;
    setBusy(false);
    setFlight(null);
    setFullCrate(null);
    setSelectedGlass(null);
    setWrongBin(false);
    setPenaltyNotice(null);
    clock.reset(timeLimit(levels[index]));
    setLevelIndex(index);
    display(createGame(levels[index]));
    setHistory([]);
    setScreen("play");
    setModal(null);
    setTutorial(false);
    scrollToStart();
  }
  function dismissTutorial() {
    stopVoice();
    setTutorial(false);
    setPreferences((p) => ({
      ...p,
      tutorialSeen: true,
      tutorialVersion: TUTORIAL_VERSION,
    }));
  }
  async function pick(column: number, bin?: GlassType) {
    if (
      locked.current ||
      gameRef.current.status !== "playing" ||
      modal ||
      tutorial
    )
      return;
    const previous = gameRef.current;
    if (clock.read() <= 0) { expire(); return; }
    const type = previous.columns[column]?.[0];
    if (type && isGlass(type) && bin === undefined) {
      setSelectedGlass(column);
      setWrongBin(false);
      return;
    }
    const result = takeBottle(previous, column, bin);
    if (!result.frames.length) return;
    const penalty = result.frames.find(frame => frame.event.kind === "penalty");
    if (penalty?.event.kind === "penalty") {
      clock.deduct(penalty.event.seconds);
      setWrongBin(penalty.event.reason === "bin");
      setPenaltyNotice(penalty.event.reason);
      display(result.state);
      if (clock.read() <= 0 && result.state.status === "playing") expire();
      return;
    }
    setSelectedGlass(null);
    setWrongBin(false);
    setPenaltyNotice(null);
    locked.current = true;
    setBusy(true);
    unlockAudio();
    const ticket = epoch.current;
    setHistory((h) => [...h, cloneState(previous)]);
    for (const frame of result.frames) {
      if (ticket !== epoch.current) return;
      if (frame.event.kind === "move") {
        const { from, to, bottle } = frame.event;
        const origin = document
          .querySelector(locationSelector(from))
          ?.getBoundingClientRect();
        const target = document
          .querySelector(locationSelector(to))
          ?.getBoundingClientRect();
        if (origin && target && !preferences.reducedMotion) {
          const art = document.querySelector(`${locationSelector(from)} .bottle`)
            ?.getBoundingClientRect();
          const width = Math.min(48, art?.width ?? 48);
          const height = width * 88 / 48;
          setFlight({
            source: `${from.kind}-${from.index}`,
            bottle,
            x: origin.left + origin.width / 2 - width / 2,
            y: origin.top + origin.height / 2 - height / 2,
            width,
            height,
            dx:
              target.left + target.width / 2 - (origin.left + origin.width / 2),
            dy:
              target.top + target.height / 2 - (origin.top + origin.height / 2),
          });
          await pause(230);
        }
        if (ticket !== epoch.current) return;
        display(frame.state);
        setFlight(null);
        playSound("pick", preferences.sound);
        // Yield once even without motion, so a burst cannot reuse the old visible bottle.
        await pause(0);
      } else if (frame.event.kind === "full") {
        setFullCrate(frame.event.index);
        playSound("full", preferences.sound);
        await pause(preferences.reducedMotion ? 0 : 240);
      } else {
        display(frame.state);
        setFullCrate(null);
        await pause(preferences.reducedMotion ? 0 : 120);
      }
    }
    if (ticket !== epoch.current) return;
    if (clock.read() <= 0) { expire(); return; }
    display(result.state);
    setBusy(false);
    locked.current = false;
    if (result.state.status === "won") {
      playSound("win", preferences.sound);
      void playWinVoice(preferences.language, preferences.sound);
      setTutorial(false);
      setPreferences((p) => ({
        ...p,
        tutorialSeen: p.tutorialSeen || level.id === 1,
        completed: [...new Set([...p.completed, level.id])],
      }));
    }
  }
  function undo() {
    if (locked.current || !history.length || gameRef.current.status === "lost") return;
    stopVoice();
    setSelectedGlass(null);
    setWrongBin(false);
    setPenaltyNotice(null);
    const previous = cloneState(history[history.length - 1]);
    display({ ...previous, penalties:gameRef.current.penalties, mistakes:gameRef.current.mistakes });
    setHistory((h) => h.slice(0, -1));
  }
  function navigate(next: Screen) {
    if (!locked.current) {
      stopVoice();
      setScreen(next);
      setSelectedGlass(null);
      setWrongBin(false);
      setTutorial(false);
      scrollToStart();
    }
  }
  const settings = (
    <Dialog
      title={t.settings}
      closeLabel={t.close}
      onClose={() => setModal(null)}
    >
      <div className="setting-row">
        <span>{t.sound}</span>
        <button
          className="toggle"
          role="switch"
          aria-checked={preferences.sound}
          aria-label={t.sound}
          onClick={() => {
            unlockAudio();
            setPreferences((p) => ({ ...p, sound: !p.sound }));
          }}
        >
          {preferences.sound ? t.on : t.off}
          <span />
        </button>
      </div>
      <div className="setting-row">
        <span>{t.motion}</span>
        <button
          className="toggle"
          role="switch"
          aria-checked={preferences.reducedMotion}
          aria-label={t.motion}
          onClick={() =>
            setPreferences((p) => ({ ...p, reducedMotion: !p.reducedMotion }))
          }
        >
          {preferences.reducedMotion ? t.on : t.off}
          <span />
        </button>
      </div>
      <p className="fine-print">{t.noRush}</p>
    </Dialog>
  );

  return (
    <div
      className={`app ${["start", "play", "recycling", "levels"].includes(screen) ? "is-fitted" : ""} ${screen === "play" ? "is-playing" : ""} ${preferences.reducedMotion ? "reduce-motion" : ""}`}
      onPointerDown={() => {
        if (preferences.sound) unlockAudio();
      }}
    >
      <header className="header">
        <div className="header-leading">
          <button
            className="brand"
            onClick={() => navigate("start")}
            disabled={busy}
            aria-label={`${t.brand} · ${t.home}`}
          >
            <span className="brand-icon">
              <Icon name={screen === "play" ? "menu" : "leaf"} size={20} />
            </span>
            <span className="brand-name">
              pfand<span className="brand-pause">pause</span>
              <span className="brand-dot">.</span>
            </span>
          </button>
          {screen === "play" && (
            <button
              className="level-link"
              aria-label={t.chooseLevel}
              title={t.levelNames[levelIndex]}
              onClick={() => navigate("levels")}
              disabled={busy}
            >
              <span className="level-label">{t.level}</span>
              <strong>{String(level.id).padStart(2, "0")}</strong>
              <span className="level-total">/ {String(levels.length).padStart(2, "0")}</span>
              <Icon name="chevron" size={13} />
            </button>
          )}
        </div>
        <nav>
          <div className="language-switch" role="group" aria-label={t.language}>
            {LANGUAGE_OPTIONS.map(({ code, label }) => (
              <button
                key={code}
                className="language-choice"
                aria-label={label}
                aria-pressed={preferences.language === code}
                onClick={() => setPreferences((p) => ({ ...p, language: code }))}
                disabled={busy}
              >
                {code === "zh" ? "中文" : code.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            className="icon-button sound-button"
            onClick={() => {
              unlockAudio();
              setPreferences((p) => ({ ...p, sound: !p.sound }));
            }}
            aria-label={t.sound}
            aria-pressed={preferences.sound}
            disabled={busy}
          >
            <Icon name={preferences.sound ? "sound" : "mute"} />
          </button>
          <button
            className="icon-button help-button"
            onClick={() => setModal("help")}
            aria-label={t.help}
            disabled={busy}
          >
            <Icon name="help" />
          </button>
          <button
            className="icon-button"
            onClick={() => setModal("settings")}
            aria-label={t.settings}
            disabled={busy}
          >
            <Icon name="settings" />
          </button>
        </nav>
      </header>
      {saveError && (
        <p className="save-error" role="status">
          {t.saveError}
        </p>
      )}
      <main>
        {screen === "recycling" && (
          <RecyclingPractice
            language={preferences.language}
            onClose={() => navigate("start")}
          />
        )}
        {screen === "start" && (
          <section className="home-screen">
            <FitBoard>
              <div className="landing">
                <div className="landing-copy">
                  <p className="eyebrow"><span className="green-dot" />{t.shop}</p>
                  <h1>{t.tagline.split("\n").map((line, i) => (
                    <span key={line} className={i ? "pink-text" : ""}>{line}</span>
                  ))}</h1>
                  <p className="intro">{t.intro}</p>
                  <p className="no-rush"><Icon name="leaf" size={17} />{t.noRush}</p>
                  {preferences.completed.length > 0 && (
                    <div className="saved-progress">
                      <span>{t.progress}</span><b>{preferences.completed.length} / {levels.length}</b>
                      <div className="progress-track"><i style={{ width: `${preferences.completed.length / levels.length * 100}%` }} /></div>
                    </div>
                  )}
                </div>
                <div className="home-art">
                  <div className="store-illustration" aria-hidden="true">
                    <div className="illustration-spark one">✧</div>
                    <div className="illustration-spark two">✳</div>
                    <div className="store-sign">
                      {t.returnCorner}
                      <span>✦</span>
                    </div>
                    <div className="awning">
                      <div />
                      <div />
                      <div />
                      <div />
                      <div />
                      <div />
                      <div />
                    </div>
                    <div className="store-interior">
                      <div className="hanging-sign">
                        {t.shopOpen}
                        <Icon name="heart" size={16} />
                      </div>
                      <div className="shop-shelf">
                        <Bottle type="malt" />
                        <Bottle type="apple" />
                        <Bottle type="kola" />
                        <span className="shelf-plant">
                          <i />
                          <i />
                          <i />
                          <b />
                        </span>
                      </div>
                      <div className="hero-bottles">
                        <Bottle type="lemon" />
                        <Bottle type="water" />
                        <Bottle type="currant" />
                      </div>
                      <div className="hero-crate hero-machine">
                        <span>PFAND · 0,25 / 0,15 / 0,08 €</span>
                        <div>
                          <i />
                          <i />
                          <i />
                        </div>
                      </div>
                      <div className="shop-counter" />
                    </div>
                    <div className="shop-base" />
                    <span className="store-note">{t.madeForPause}</span>
                  </div>
                </div>
              </div>
            </FitBoard>
            <div className="home-actions">
              <button className="primary" onClick={() => game.status === "playing" ? navigate("play") : start(nextUnfinished)}>
                {preferences.completed.length ? t.continue : t.play}<Icon name="arrow" />
              </button>
              <button className="primary recycling-entry" onClick={() => navigate("recycling")}>
                <Icon name="leaf" size={18} />{t.recyclingEntry}
              </button>
              <button className="text-button" onClick={() => navigate("levels")}>
                {t.chooseLevel}<Icon name="grid" size={17} />
              </button>
              <button className="learn-button" onClick={() => setTutorial(true)}>
                <Icon name="help" size={18} />{t.learn}
              </button>
            </div>
          </section>
        )}
        {screen === "levels" && (
          <section className="levels-screen">
            <FitBoard>
            <button className="text-button" onClick={() => navigate("start")}>
              <Icon name="back" />
              {t.back}
            </button>
            <p className="eyebrow">
              {t.progress} · {preferences.completed.length}/{levels.length}
            </p>
            <h1>{t.levels}</h1>
            <div className="level-grid">
              {levels.map((l, i) => {
                const complete = preferences.completed.includes(l.id);
                const unlocked =
                  i === 0 || preferences.completed.includes(l.id - 1);
                return (
                  <button
                    className={`level-card ${complete ? "complete" : ""}`}
                    key={l.id}
                    disabled={!unlocked}
                    onClick={() => start(i)}
                    aria-label={`${t.level} ${l.id}: ${t.levelNames[i]}. ${complete ? t.completed : unlocked ? t.available : t.locked}`}
                  >
                    <span className="level-number">
                      {String(l.id).padStart(2, "0")}
                    </span>
                    <Icon
                      name={complete ? "check" : unlocked ? "arrow" : "lock"}
                    />
                    <strong>{t.levelNames[i]}</strong>
                    <span className="level-mini-bottles">
                      {[...new Set(l.columns.flat())].map((type) => (
                        <Bottle key={type} type={type} />
                      ))}
                    </span>
                    <small>
                      {complete
                        ? t.completed
                        : unlocked
                          ? t.available
                          : t.locked}
                    </small>
                  </button>
                );
              })}
            </div>
            </FitBoard>
          </section>
        )}
        {screen === "play" && (
          <section className="game-screen">
            <h1 className="sr-only">{t.levelNames[levelIndex]}</h1>
            <div className="level-progress">
              <span>
                <b>{packed}</b> / {total} {t.packed}
              </span>
              <span className={`round-clock ${seconds <= 15 ? "clock-urgent" : ""}`} aria-label={`${t.timeLeft}: ${seconds}`}>
                ⏱ {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2,"0")}
                {hasGlass && <small> · {game.mistakes}/{MAX_GLASS_MISTAKES} {t.mistakes}</small>}
              </span>
              <button
                className="order-count-button"
                onClick={() => setModal("orders")}
                disabled={busy}
              >
                <Icon name="receipt" size={13} />
                {game.orders.length - game.nextOrder} {t.queued}
                <Icon name="chevron" size={12} />
              </button>
              <div key={level.id} className="progress-track">
                <i style={{ width: `${(packed / total) * 100}%` }} />
              </div>
            </div>
            {penaltyNotice === "buffer" && <p className="time-penalty" role="status">{t.bufferPenalty}</p>}
            <FitBoard>
              <div className={`game-layout ${hasGlass ? "has-glass" : ""}`}>
                <div className="play-area">
                  <div className="counter">
                    <div className="section-label">
                      <span>{t.counter}</span>
                      <span className="counter-count">
                        {remaining} <Icon name="leaf" size={12} />
                      </span>
                    </div>
                    <div
                      className={`stacks ${busy ? "is-busy" : ""}`}
                      style={
                        {
                          "--columns": game.columns.length,
                          "--depth": Math.max(
                            2,
                            ...level.columns.map((c) => c.length),
                          ),
                        } as CSSProperties
                      }
                    >
                      {game.columns.map((column, index) => (
                        <div
                          className="stack"
                          key={index}
                          style={
                            { "--stack-height": column.length } as CSSProperties
                          }
                        >
                          <span className="stack-number">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {column.length ? (
                            column.map((type, depth) =>
                              depth === 0 ? (
                                <button
                                  key={`${game.moves}-${depth}`}
                                  data-column={index}
                                  data-place={`column-${index}`}
                                  className={`bottle-pick ${selectedGlass === index ? "glass-selected" : ""} ${flight?.source === `column-${index}` ? "moving-source" : ""} `}
                                  aria-pressed={isGlass(type) ? selectedGlass === index : undefined}
                                  disabled={busy || game.status !== "playing"}
                                  style={
                                    {
                                      "--depth-index": depth,
                                      zIndex: column.length - depth,
                                    } as CSSProperties
                                  }
                                  onClick={() => void pick(index)}
                                  aria-label={`${t.pick} ${t.bottleNames[type]} · ${isGlass(type) ? t.noDeposit : formatDeposit(bottleDeposits[type])} · ${t.column} ${index + 1}`}
                                >
                                  <Bottle type={type} />
                                  <span className="bottle-deposit-tag">{isGlass(type) ? t.noDeposit : formatDeposit(bottleDeposits[type])}</span>
                                  <span className="pick-dot" />
                                </button>
                              ) : (
                                <div
                                  key={`${game.moves}-${depth}`}
                                  className="buried-bottle"
                                  style={
                                    {
                                      "--depth-index": depth,
                                      zIndex: column.length - depth,
                                    } as CSSProperties
                                  }
                                >
                                  <Bottle type={type} />
                                  <span className="sr-only">
                                    {t.bottleNames[type]}
                                  </span>
                                </div>
                              ),
                            )
                          ) : (
                            <div className="empty-stack">
                              <Icon name="check" size={17} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="counter-edge" />
                    <p className="counter-caption">
                      <span className="tiny-spark">✧</span>
                      {t.counterHint}
                    </p>
                  </div>
                  <div
                    className={`buffer-section ${game.buffer.length === 2 ? "buffer-caution" : ""}`}
                  >
                    <div className="buffer-copy">
                      <h2>{t.spare}</h2>
                      <p>{t.spareHint}</p>
                      <span className="buffer-count">
                        {game.buffer.length} / 3
                      </span>
                    </div>
                    <div className="buffer-slots" aria-label={t.buffer}>
                      {[0, 1, 2].map((i) => (
                        <div
                          className={`buffer-slot ${flight?.source === `buffer-${i}` ? "moving-source" : ""} ${game.buffer[i] ? "occupied" : ""}`}
                          key={i}
                          data-place={`buffer-${i}`}
                          aria-label={
                            game.buffer[i]
                              ? `${t.buffer} ${i + 1}: ${t.bottleNames[game.buffer[i]]}`
                              : t.emptySpot
                          }
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
                  <div className="crates-section">
                    <div className="section-label">
                      <span>{t.crates}</span>
                      <span>{t.crateHint}</span>
                    </div>
                    <div className="crates machine-trays">
                      {game.crates.map((crate, i) => (
                        <div
                          data-place={`crate-${i}`}
                          key={i}
                          className={`crate-wrap ${fullCrate === i ? "crate-full" : ""} ${!crate ? "crate-finished" : ""}`}
                          style={
                            {
                              "--crate-color": crate
                                ? bottles[crate.type].color
                                : "#768778",
                              "--crate-light": crate
                                ? bottles[crate.type].light
                                : "#e6ecdf",
                            } as CSSProperties
                          }
                          aria-label={
                            crate
                              ? `${t.crate} ${i + 1}: ${t.bottleNames[crate.type]}, ${crate.count}/3`
                              : t.crateDone
                          }
                        >
                          <div className="crate-heading">
                            {crate ? (
                              <>
                                <span className="type-dot" />
                                <span className="crate-name">
                                  {t.bottleNames[crate.type]}
                                  <small className="machine-deposit">{formatDeposit(bottleDeposits[crate.type])}</small>
                                </span>
                                <span className="crate-amount">
                                  {crate.count}
                                  <small> / 3</small>
                                </span>
                              </>
                            ) : (
                              <>
                                <Icon name="check" size={17} />
                                {t.crateDone}
                              </>
                            )}
                          </div>
                          <div className="crate-body machine-body">
                            <div className="crate-slots">
                              {[0, 1, 2].map((j) => (
                                <div
                                  className={`crate-slot ${crate && j < crate.count ? "has-bottle" : ""}`}
                                  key={j}
                                >
                                  {crate ? (
                                    <Bottle type={crate.type} />
                                  ) : (
                                    <Icon name="check" size={18} />
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="crate-front">
                              <span className="crate-handle" />
                              {[0, 1, 2].map((j) => (
                                <i
                                  className={
                                    crate && j < crate.count ? "filled" : ""
                                  }
                                  key={j}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {hasGlass && (
                    <section className="glass-section">
                      <div className="section-label"><span>{t.glassBins}</span><span>{game.recycled.length}</span></div>
                      <p className={`glass-coach ${wrongBin ? "wrong-bin" : ""}`} role="status">
                        {wrongBin ? `${t.binPenalty} ${t.wrongBin}` : selectedGlass !== null ? t.glassSelected : t.glassHint}
                      </p>
                      <div className="glass-bins">
                        {glassTypes.map((type, index) => (
                          <button key={type} data-bin={type} data-place={`bin-${index}`}
                            className={`glass-bin ${type}`} disabled={busy || selectedGlass === null || game.status !== "playing"}
                            onClick={() => selectedGlass !== null && void pick(selectedGlass, type)}>
                            <span className="bin-opening" aria-hidden="true" /><strong>{t.binNames[type]}</strong><small>{t.noDeposit} · 0 €</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </FitBoard>
            <div className="game-toolbar">
              <button
                className="secondary"
                onClick={undo}
                disabled={!history.length || busy || game.status === "lost"}
              >
                <Icon name="undo" size={18} />
                {t.undo}
              </button>
              <span>
                {game.moves} {t.moves}
              </span>
              <button
                className="text-button"
                onClick={() => start(levelIndex)}
                disabled={busy}
              >
                <Icon name="restart" size={17} />
                {t.restart}
              </button>
            </div>
          </section>
        )}
      </main>
      <footer className="footer">
        <span>{t.brand}</span>
        <span>{t.noRush}</span>
        <button
          className="text-button"
          onClick={() => setModal("help")}
          disabled={busy}
        >
          {t.help}
          <Icon name="help" size={14} />
        </button>
      </footer>
      {tutorial && (
        <Tutorial
          language={preferences.language}
          reducedMotion={preferences.reducedMotion}
          sound={preferences.sound}
          onClose={dismissTutorial}
        />
      )}
      {modal === "settings" && settings}
      {modal === "orders" && (
        <Dialog
          title={t.orders}
          closeLabel={t.close}
          onClose={() => setModal(null)}
        >
          <p className="muted">
            {game.orders.length - game.nextOrder} {t.queued} ·{" "}
            {game.crates.filter(Boolean).length} {t.active}
          </p>
          <p className="order-intro">{t.orderIntro}</p>
          {orderList}
        </Dialog>
      )}
      {modal === "help" && (
        <Dialog
          title={t.helpTitle}
          closeLabel={t.close}
          onClose={() => setModal(null)}
        >
          <button
            className="primary replay-practice"
            onClick={() => {
              setModal(null);
              setTutorial(true);
            }}
          >
            <Icon name="help" />
            {t.learn}
          </button>
          <div className="bottle-legend">
            {Object.keys(bottles).map((key) => (
              <div key={key}>
                <Bottle type={key as BottleType} />
                <span>{t.bottleNames[key as BottleType]}</span>
              </div>
            ))}
          </div>
          <ol className="rules">
            {[t.rule1, t.rule2, t.rule3, t.rule4, t.rule5, t.rule6].map(
              (rule) => (
                <li key={rule}>{rule}</li>
              ),
            )}
          </ol>
          <p className="fine-print">{t.fictional}</p>
        </Dialog>
      )}
      {screen === "play" &&
        game.status !== "playing" &&
        !busy &&
        !modal &&
        !tutorial && (
          <Dialog
            className={`result-dialog ${game.status}`}
            title={
              game.status === "won"
                ? levelIndex === levels.length - 1 && allComplete
                  ? t.allDone
                  : t.nice
                : game.endReason === "time" ? t.timeOver : t.tooManyMistakes.replace("{count}", String(game.mistakes))
            }
            closeLabel={t.close}
            onClose={() => navigate("levels")}
          >
            <FitBoard>
              <div className="result-content">
                <div className="result-art" aria-hidden="true">
                  <span>✧</span>
                  <Bottle type={game.status === "won" ? "kola" : "currant"} />
                  <span>{game.status === "won" ? "✦" : "♡"}</span>
                  <i>
                    <Icon
                      name={game.status === "won" ? "check" : "undo"}
                      size={26}
                    />
                  </i>
                </div>
                <p>
                  {game.status === "won"
                    ? t.winCheers[levelIndex]
                    : game.endReason === "time" ? t.timeOverBody : t.fineNotice}
                </p>
                <div className="result-stats">
                  <span>
                    <b>{game.status === "won" ? returned.bottles : game.completed}</b>{" "}
                    {game.status === "won" ? t.bottlesReturned : t.packedCrates}
                  </span>
                  <span>
                    <b>{game.status === "won" ? refundAmount : game.moves}</b>{" "}
                    {game.status === "won" ? t.depositReturned : t.moves}
                  </span>
                  {game.status === "won" && hasGlass && <span><b>{game.recycled.length}</b> {t.glassRecycled}</span>}
                </div>
              </div>
            </FitBoard>
            {game.status === "won" ? (
              <>
                <button
                  className="primary"
                  onClick={() =>
                    levelIndex < levels.length - 1
                      ? start(levelIndex + 1)
                      : navigate("levels")
                  }
                >
                  {levelIndex < levels.length - 1 ? t.nextLevel : t.chooseLevel}
                  <Icon name="arrow" />
                </button>
                <button
                  className="text-button"
                  onClick={() => start(levelIndex)}
                >
                  {t.replay}
                  <Icon name="restart" size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary"
                  onClick={() => start(levelIndex)}
                >
                  <Icon name="restart" />
                  {t.tryAgain}
                </button>
                <button
                  className="text-button"
                  onClick={() => navigate("start")}
                >
                  {t.home}
                  <Icon name="back" size={16} />
                </button>
              </>
            )}
          </Dialog>
        )}
      {flight && (
        <div
          className="bottle-flight"
          style={
            {
              left: flight.x,
              top: flight.y,
              width: flight.width,
              height: flight.height,
              "--dx": `${flight.dx}px`,
              "--dy": `${flight.dy}px`,
            } as CSSProperties
          }
        >
          <Bottle type={flight.bottle} />
        </div>
      )}
      <div className="sr-only" role="status" aria-live="polite">
        {!busy && screen === "play"
          ? `${packed} ${t.packed}. ${game.buffer.length}/3 ${t.buffer}. ${game.status === "won" ? t.nice : game.status === "lost" ? t.spareFull : ""}`
          : ""}
      </div>
    </div>
  );
}
