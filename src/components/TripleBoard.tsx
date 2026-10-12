import type { CSSProperties } from "react";
import { availableTiles, TRAY_CAPACITY, type TripleState } from "../game/triple";
import { glassTypes, isGlass, type GlassType } from "../game/types";
import { bottleDeposits } from "../data/bottles";
import { translations } from "../i18n";
import Bottle from "./Bottle";
import Icon from "./Icon";

export default function TripleBoard({ state, busy, pendingIds, selectedGlass, wrongBin, fullGroup, flightSource, t, formatMoney, onPick, onReserve }: {
  pendingIds?: readonly number[];
  state: TripleState; busy: boolean; selectedGlass: number | null; wrongBin: boolean; fullGroup: number | null; flightSource?: string;
  t: typeof translations.en; formatMoney: (cents: number) => string;
  onPick: (id: number, bin?: GlassType) => void; onReserve: (index: number) => void;
}) {
  const available = new Set(availableTiles(state));
  const hasGlass = state.tiles.some(tile => isGlass(tile.bottle));
  return <div className={`triple-layout ${hasGlass ? "with-glass" : ""}`}>
    <section className="tile-counter">
      <div className="section-label"><span>{t.counter}</span><span>{state.columns.flat().length} <Icon name="leaf" size={12} /></span></div>
      <div className={`tile-field ${busy ? "is-busy" : ""}`} style={{ "--board-width": state.boardWidth, "--board-height": state.boardHeight } as CSSProperties} aria-label={t.tileBoard}>
        {state.tiles.filter(tile => state.columns[tile.id].length).map(tile => {
          const covered = !available.has(tile.id);
          const pending = pendingIds?.includes(tile.id) ?? false;
          return <button key={tile.id} data-column={tile.id} data-place={`column-${tile.id}`} data-covered={covered}
            className={`tile-card ${covered ? "is-covered" : ""} ${pending ? "is-pending" : ""} ${selectedGlass === tile.id ? "glass-selected" : ""} ${flightSource === `column-${tile.id}` ? "moving-source" : ""}`}
            style={{ left: `${tile.x / state.boardWidth * 100}%`, top: `${tile.y / state.boardHeight * 100}%`, width: `${1 / state.boardWidth * 100}%`, height: `${1 / state.boardHeight * 100}%`, zIndex: tile.layer * 1000 + tile.id } as CSSProperties}
            disabled={covered || (pendingIds ? pending : busy) || state.status !== "playing"} onClick={() => onPick(tile.id)}
            aria-label={`${t.pick} ${t.bottleNames[tile.bottle]} · ${isGlass(tile.bottle) ? t.noDeposit : formatMoney(bottleDeposits[tile.bottle])}`}
            title={covered ? t.coveredTile : t.bottleNames[tile.bottle]}>
            <Bottle type={tile.bottle} />
            {pending && <span className="tile-queued" aria-hidden="true"><Icon name="check" size={12} /></span>}
            <span className="tile-price">{isGlass(tile.bottle) ? t.noDeposit : formatMoney(bottleDeposits[tile.bottle])}</span>
          </button>;
        })}
      </div>
    </section>
    <div className="triple-dock">
      <section className={`shared-tray ${state.buffer.length >= 5 ? "tray-caution" : ""}`} aria-label={t.sharedTray}>
        <div className="section-label"><span>{t.sharedTray}</span><b>{state.buffer.length}/{TRAY_CAPACITY}</b></div>
        <div className="seven-slots">
          {Array.from({ length: TRAY_CAPACITY }, (_, index) => <div key={index} data-place={`buffer-${index}`}
            className={`tray-slot ${state.buffer[index] ? "occupied" : ""} ${fullGroup !== null && index >= fullGroup && index < fullGroup + 3 ? "is-matching" : ""}`}
            aria-label={state.buffer[index] ? `${t.sharedTray} ${index + 1}: ${t.bottleNames[state.buffer[index]]}` : t.emptySpot}>
            {state.buffer[index] ? <Bottle type={state.buffer[index]} /> : <span className="slot-number">{index + 1}</span>}
          </div>)}
        </div>
        <p className="tray-caption">{t.tripleRule}</p>
        <p className="tray-danger"><Icon name="close" size={14} />{t.trayDanger}</p>
      </section>
      {state.reserveIds.length > 0 && <section className="reserve-row">
        <span>{t.reserveReturn}</span>
        <div>{state.reserveIds.map((id, index) => <button key={id} data-reserve={index} data-place={`reserve-${index}`} disabled={busy || state.status !== "playing"}
          onClick={() => onReserve(index)} aria-label={`${t.reserveReturn}: ${t.bottleNames[state.tiles[id].bottle]}`}><Bottle type={state.tiles[id].bottle} /></button>)}</div>
      </section>}
      {hasGlass && <section className="glass-section">
        <div className="section-label"><span>{t.glassBins}</span><span>{state.recycled.length}</span></div>
        <p className={`glass-coach ${wrongBin ? "wrong-bin" : ""}`} role="status">{wrongBin ? t.wrongBin : selectedGlass !== null ? t.glassSelected : t.glassHint}</p>
        <div className="glass-bins">{glassTypes.map((type, index) => <button key={type} data-bin={type} data-place={`bin-${index}`} className={`glass-bin ${type}`} disabled={busy || selectedGlass === null || state.status !== "playing"}
          onClick={() => selectedGlass !== null && onPick(selectedGlass, type)}><span className="bin-opening" aria-hidden="true" /><strong>{t.binNames[type]}</strong><small>{t.noDeposit} · 0 €</small></button>)}</div>
      </section>}
    </div>
  </div>;
}
