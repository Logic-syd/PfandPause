import { bottleDeposits } from "../data/bottles";
import { returnStats } from "../game/returns";
import { isGlass, type BottleType } from "../game/types";
import { translations } from "../i18n";

export default function ReturnReceipt({ items, level, t, formatMoney, cheer }: {
  items: readonly BottleType[];
  level: number;
  t: typeof translations.en;
  formatMoney: (cents: number) => string;
  cheer: string;
}) {
  const returned = returnStats(items);
  const glass = items.length - returned.bottles;
  const deposits = [...new Set(items.filter(type => !isGlass(type)).map(type => bottleDeposits[type]))].sort((a, b) => b - a);
  const number = `PP-${String(level).padStart(2, "0")}-${String(returned.bottles).padStart(4, "0")}`;

  return <div className="receipt-printer">
    <article className="return-receipt" aria-label={t.receiptTitle}>
      <header className="return-receipt-header">
        <span className="receipt-shop-mark" aria-hidden="true">pp.</span>
        <span className="receipt-shop-name">PFAND PAUSE<small>DER KLEINE FLASCHENMARKT</small></span>
      </header>
      <h3>{t.receiptTitle}</h3>
      <p className="receipt-number">{t.returnCorner} · {String(level).padStart(2, "0")}</p>
      <div className="receipt-items">
        <div className="receipt-column-head"><span>{t.receiptQuantity}</span><span>{t.receiptAmount}</span></div>
        {deposits.map(cents => {
          const count = items.filter(type => !isGlass(type) && bottleDeposits[type] === cents).length;
          return <div className="receipt-item" key={cents}><span>{count} × {formatMoney(cents)}</span><span>{formatMoney(count * cents)}</span></div>;
        })}
      </div>
      <div className="result-stats receipt-totals">
        <span className="receipt-bottle-count"><span>{t.bottlesReturned}</span><b>{returned.bottles}</b></span>
        <span className="receipt-refund"><span>{t.depositReturned}</span><b>{formatMoney(returned.cents)}</b></span>
        {glass > 0 && <span className="receipt-glass"><span>{t.glassRecycled}</span><b>{glass}</b></span>}
      </div>
      <p className="receipt-cash-note">{t.receiptCashNote}</p>
      <div className="receipt-barcode" aria-hidden="true" />
      <p className="receipt-number">{number}</p>
      <footer className="receipt-cheer">{cheer}</footer>
    </article>
  </div>;
}
