import { useEffect, useRef, useState, type CSSProperties } from "react";
import Bottle from "./components/Bottle";
import Icon from "./components/Icon";
import Dialog from "./components/Dialog";
import Tutorial from "./components/Tutorial";
import { TUTORIAL_VERSION } from "./data/tutorial";
import { levels } from "./data/levels";
import { bottles } from "./data/bottles";
import { cloneState, createGame, takeBottle } from "./game/engine";
import type { BottleType, GameState, Place } from "./game/types";
import { translations } from "./i18n";
import { loadPreferences, savePreferences } from "./storage";
import { playSound, playWinVoice, stopVoice, unlockAudio } from "./audio";

type Screen = "start" | "play" | "levels";
type Flight = {
  source: string;
  bottle: BottleType;
  x: number;
  y: number;
  dx: number;
  dy: number;
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const locationSelector = (place: Place) =>
  `[data-place="${place.kind}-${place.index}"]`;
export default function App() {
  const [preferences, setPreferences] = useState(loadPreferences);
  const [saveError, setSaveError] = useState(false);
  const [screen, setScreen] = useState<Screen>("start");
  const [levelIndex, setLevelIndex] = useState(0);
  const [game, setGame] = useState(() => createGame(levels[0]));
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
  const [expandedOrders, setExpandedOrders] = useState(false);
  const [tutorial, setTutorial] = useState(false);
  const t = translations[preferences.language];
  const level = levels[levelIndex];
  const total = level.columns.flat().length;
  const packed =
    game.completed * 3 +
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
  }, [preferences, t.brand, t.noRush]);
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
    setLevelIndex(index);
    display(createGame(levels[index]));
    setHistory([]);
    setScreen("play");
    setModal(null);
    setExpandedOrders(false);
    setTutorial(preferences.tutorialVersion !== TUTORIAL_VERSION);
    window.scrollTo({ top: 0 });
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
  async function pick(column: number) {
    if (
      locked.current ||
      gameRef.current.status !== "playing" ||
      modal ||
      tutorial
    )
      return;
    const previous = gameRef.current;
    const result = takeBottle(previous, column);
    if (!result.frames.length) return;
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
          setFlight({
            source: `${from.kind}-${from.index}`,
            bottle,
            x: origin.left + origin.width / 2 - 24,
            y: origin.top + origin.height / 2 - 44,
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
    if (locked.current || !history.length) return;
    stopVoice();
    display(cloneState(history[history.length - 1]));
    setHistory((h) => h.slice(0, -1));
  }
  function navigate(next: Screen) {
    if (!locked.current) {
      stopVoice();
      setScreen(next);
      setTutorial(false);
      window.scrollTo({ top: 0 });
    }
  }
  const settings = (
    <Dialog
      title={t.settings}
      closeLabel={t.close}
      onClose={() => setModal(null)}
    >
      <div className="setting-row">
        <span>{t.language}</span>
        <div className="language-options">
          {(["en", "de"] as const).map((lang) => (
            <button
              key={lang}
              aria-pressed={preferences.language === lang}
              onClick={() => setPreferences((p) => ({ ...p, language: lang }))}
            >
              {lang === "en" ? "English" : "Deutsch"}
            </button>
          ))}
        </div>
      </div>
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
      className={`app ${preferences.reducedMotion ? "reduce-motion" : ""}`}
      onPointerDown={() => {
        if (preferences.sound) unlockAudio();
      }}
    >
      <header className="header">
        <button
          className="brand"
          onClick={() => navigate("start")}
          disabled={busy}
          aria-label={`${t.brand} · ${t.home}`}
        >
          <span className="brand-icon">
            <Icon name="leaf" size={23} />
          </span>
          <span>
            pfand<span className="brand-pause">pause</span>
            <span className="brand-dot">.</span>
          </span>
        </button>
        <nav>
          <button
            className="language-button"
            onClick={() =>
              setPreferences((p) => ({
                ...p,
                language: p.language === "en" ? "de" : "en",
              }))
            }
            aria-label={`${t.language}: ${preferences.language.toUpperCase()}`}
            disabled={busy}
          >
            {preferences.language.toUpperCase()}
            <Icon name="chevron" size={13} />
          </button>
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
        {screen === "start" && (
          <section className="landing">
            <div className="landing-copy">
              <p className="eyebrow">
                <span className="green-dot" />
                {t.shop}
              </p>
              <h1>
                {t.tagline.split("\n").map((line, i) => (
                  <span key={line} className={i ? "pink-text" : ""}>
                    {line}
                  </span>
                ))}
              </h1>
              <p className="intro">{t.intro}</p>
              <div className="landing-actions">
                <button
                  className="primary"
                  onClick={() => start(nextUnfinished)}
                >
                  {preferences.completed.length ? t.continue : t.play}
                  <Icon name="arrow" />
                </button>
                <button
                  className="text-button"
                  onClick={() => navigate("levels")}
                >
                  {t.chooseLevel}
                  <Icon name="grid" size={17} />
                </button>
              </div>
              <button
                className="learn-button"
                onClick={() => setTutorial(true)}
              >
                <Icon name="help" size={18} />
                {t.learn}
                <Icon name="arrow" size={16} />
              </button>
              <p className="no-rush">
                <Icon name="leaf" size={17} />
                {t.noRush}
              </p>
              {preferences.completed.length > 0 && (
                <div className="saved-progress">
                  <span>{t.progress}</span>
                  <b>
                    {preferences.completed.length} / {levels.length}
                  </b>
                  <div className="progress-track">
                    <i
                      style={{
                        width: `${(preferences.completed.length / levels.length) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
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
                <div className="hero-crate">
                  <span>pfandpause.</span>
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
          </section>
        )}
        {screen === "levels" && (
          <section className="levels-screen">
            <button className="text-button" onClick={() => navigate("start")}>
              <Icon name="back" />
              {t.back}
            </button>
            <p className="eyebrow">
              {t.progress} · {preferences.completed.length}/{levels.length}
            </p>
            <h1>{t.levels}</h1>
            <p className="muted">{t.levelsIntro}</p>
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
                      {[...new Set(l.orders)].map((type) => (
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
          </section>
        )}
        {screen === "play" && (
          <section className="game-screen">
            <div className="game-heading">
              <div>
                <button
                  className="level-link"
                  onClick={() => navigate("levels")}
                  disabled={busy}
                >
                  <Icon name="grid" size={15} />
                  {t.level} {String(level.id).padStart(2, "0")}{" "}
                  <span>/ {String(levels.length).padStart(2, "0")}</span>
                  <Icon name="chevron" size={13} />
                </button>
                <h1>{t.levelNames[levelIndex]}</h1>
              </div>
              <button
                className="icon-button help-button"
                onClick={() => setModal("help")}
                aria-label={t.help}
                disabled={busy}
              >
                <Icon name="help" />
              </button>
            </div>
            <div className="game-layout">
              <div className="play-area">
                <div className="level-progress">
                  <span>
                    <b>{packed}</b> / {total} {t.packed}
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
                                className={`bottle-pick ${flight?.source === `column-${index}` ? "moving-source" : ""} `}
                                disabled={busy || game.status !== "playing"}
                                style={
                                  {
                                    "--depth-index": depth,
                                    zIndex: column.length - depth,
                                  } as CSSProperties
                                }
                                onClick={() => void pick(index)}
                                aria-label={`${t.pick} ${t.bottleNames[type]} · ${t.column} ${index + 1}`}
                              >
                                <Bottle type={type} />
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
                  <div className="crates">
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
                        <div className="crate-body">
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
                <div className="game-toolbar">
                  <button
                    className="secondary"
                    onClick={undo}
                    disabled={!history.length || busy}
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
              </div>
              <aside className="game-aside">
                <div className="order-slip">
                  <div className="receipt-heading">
                    <Icon name="receipt" size={23} />
                    <h2>{t.orders}</h2>
                  </div>
                  <div className="receipt-subtitle">
                    <span>
                      {game.orders.length - game.nextOrder} {t.queued}
                    </span>
                    <span>
                      {game.crates.filter(Boolean).length} {t.active}
                    </span>
                  </div>
                  <p className="order-intro">{t.orderIntro}</p>
                  <div className="order-preview">
                    <span className="next-label">{t.nextUp}</span>
                    {game.orders
                      .slice(game.nextOrder, game.nextOrder + 3)
                      .map((type, i) => (
                        <div className="mini-order" key={game.nextOrder + i}>
                          <Bottle type={type} />
                          <span>{t.bottleNames[type]}</span>
                          <small>×3</small>
                        </div>
                      ))}
                    {game.nextOrder === game.orders.length && (
                      <p className="last-crates">
                        <Icon name="leaf" size={18} />
                        {t.noOrders}
                      </p>
                    )}
                  </div>
                  <button
                    className="order-toggle"
                    aria-expanded={expandedOrders}
                    onClick={() => setExpandedOrders((v) => !v)}
                  >
                    {expandedOrders ? t.hideOrders : t.allOrders}
                    <Icon name="chevron" size={16} />
                  </button>
                  {expandedOrders && orderList}
                  <div className="receipt-bottom">
                    PFAND PAUSE <span>♡</span>
                  </div>
                </div>
                <div className="gentle-note">
                  <Icon name="leaf" size={23} />
                  <h3>{t.guide}</h3>
                  <p>{t.guideText}</p>
                </div>
                <div className="aside-footer">{t.madeForPause}</div>
              </aside>
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
                : t.lost
            }
            closeLabel={t.close}
            onClose={() => navigate("levels")}
          >
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
                ? levelIndex === levels.length - 1 && allComplete
                  ? t.allDoneBody
                  : t.winBody
                : t.lostBody}
            </p>
            <div className="result-stats">
              <span>
                <b>{game.completed}</b> {t.packedCrates}
              </span>
              <span>
                <b>{game.moves}</b> {t.moves}
              </span>
            </div>
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
                  onClick={undo}
                  disabled={!history.length}
                >
                  <Icon name="undo" />
                  {t.undo}
                </button>
                <button
                  className="text-button"
                  onClick={() => start(levelIndex)}
                >
                  {t.tryAgain}
                  <Icon name="restart" size={16} />
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
