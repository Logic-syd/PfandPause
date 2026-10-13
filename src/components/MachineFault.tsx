import { translations } from '../i18n';

export default function MachineFault({ t }: { t: typeof translations.en }) {
  return <div className="machine-fault-screen">
    <div className="fault-screen-header" lang="de"><span>LEERGUTAUTOMAT</span><span className="fault-status"><i />STÖRUNG</span></div>
    <div className="fault-screen-message">
      <svg viewBox="0 0 48 48" aria-hidden="true" className="fault-machine-icon" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="4" width="30" height="40" rx="4" /><rect x="14" y="9" width="20" height="14" rx="2" />
        <path d="m20 13 8 6m0-6-8 6M16 30h16M17 37h14" />
      </svg>
      <strong className="fault-german-label" lang="de">AUSSER BETRIEB</strong>
      <p className="fault-apology">{t.machineFaultApology}</p>
      <p className="fault-instruction">{t.trayFullBody}</p>
    </div>
    <div className="fault-screen-footer" lang="de"><span>PFAND PAUSE</span><span>EINZUG BLOCKIERT</span></div>
  </div>;
}
