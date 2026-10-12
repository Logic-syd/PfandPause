import { useRef, useState } from 'react';
import { assessRecycling, recyclingChoiceLabels, getRecyclingDestinations, getRecyclingItems, type Destination } from '../data/recycling';
import { recyclingTranslations } from '../data/recyclingTranslations';
import { translations, type Language } from '../i18n';
import FitBoard from './FitBoard';
import Dialog from './Dialog';
import Icon from './Icon';
import { playSound, unlockAudio } from '../audio';

export default function RecyclingPractice({ language, sound, onClose }: { language: Language; sound: boolean; onClose: () => void }) {
  const t = recyclingTranslations[language];
  const recyclingItems = getRecyclingItems(language);
  const destinations = getRecyclingDestinations(language);
  const locale = { zh: 'zh-CN', en: 'en-GB', de: 'de-DE' }[language];
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Destination | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [refund, setRefund] = useState(0);
  const [notes, setNotes] = useState(false);
  const answered = useRef(false);
  const done = index === recyclingItems.length;
  const item = recyclingItems[index];
  const correct = answer !== null && answer === item?.destination;
  function choose(destination: Destination) {
    if (answered.current || done) return;
    answered.current = true;
    const result = assessRecycling(item, destination);
    if (sound) { unlockAudio(); playSound(result.correct ? 'correct' : 'wrong', true); }
    setAnswer(destination);
    if (result.correct) setCorrectCount(n => n + 1);
    setRefund(n => n + result.refundCents);
  }
  function restart() { answered.current = false; setIndex(0); setAnswer(null); setCorrectCount(0); setRefund(0); }
  function advance() { if (!answered.current) return; answered.current = false; setIndex(n => n + 1); setAnswer(null); }
  const refundAmount = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(refund / 100);
  return <section className="recycling-practice" lang={locale} aria-labelledby="recycling-title">
    <div className="recycling-heading">
      <button className="text-button" onClick={onClose}>{t.back}</button>
      <h1 id="recycling-title">{t.title}</h1>
    </div>
    <p className="sr-only">{t.eyebrow}</p>
    <p className="recycling-progress">{done ? t.completed : t.question(index + 1, recyclingItems.length)} · {t.correctCount(correctCount)} · {t.refund(refundAmount)}</p>
    <FitBoard compact grow>
      <div className="recycling-content">
        {done ? <div className="recycling-result">
          <h2>{t.summaryTitle}</h2>
          <p>{t.summary(correctCount, recyclingItems.length)}</p>
          <p>{t.depositSummary}</p>
          <p>{t.materialSummary}</p>
        </div> : <>
          <article className="recycling-item">
            <svg viewBox="0 0 80 160" width="80" height="160" role="img" aria-label={t.bottleImage(item.material)}>
              <path d="M29 9h22v35l12 19v77q0 10-10 10H27q-10 0-10-10V63l12-19Z" fill={item.color} stroke="#304c3e" strokeWidth="3" />
              <path d="M34 20v23M25 69v62" stroke="white" strokeWidth="4" opacity=".5" />
              <rect x="20" y="80" width="40" height="40" rx="4" fill="#fffbed" />
              <text x="40" y="104" textAnchor="middle" fontSize="11" fill="#304c3e">{item.cents ? 'PFAND' : 'GLAS'}</text>
            </svg>
            <div><h2>{item.name}</h2><p>{item.material}</p><p className="recycling-label">{t.packaging}<strong className={answer !== null ? 'packaging-clue' : ''}>{item.label}</strong></p></div>
          </article>
          {answer === null ? <div className="recycling-choices">{destinations.map(d => <button key={d.id} onClick={() => choose(d.id)}><strong>{recyclingChoiceLabels[language][d.id].label}</strong><span>{recyclingChoiceLabels[language][d.id].detail}</span></button>)}</div>
            : <div className={`recycling-feedback ${correct ? 'is-correct' : 'is-incorrect'}`} data-correct={correct} role="status" aria-atomic="true">
              <div className="feedback-verdict"><span className="feedback-mark"><Icon name={correct ? 'check' : 'close'} size={40} /></span><h2>{correct ? t.correct : t.incorrect}</h2></div>
              {!correct && <div className="answer-comparison chosen-answer"><Icon name="close" size={20} /><div><span>{t.yourChoice}</span><strong>{recyclingChoiceLabels[language][answer].label}</strong></div></div>}
              <div className="answer-comparison correct-answer"><span className={`destination-badge destination-${item.destination}`} aria-hidden="true"><Icon name={item.cents ? 'receipt' : 'bin'} size={22} /></span><div><span>{t.destination}</span><strong>{recyclingChoiceLabels[language][item.destination].label}</strong></div></div>
              {correct && <div className="feedback-reward"><Icon name={item.cents ? 'receipt' : 'leaf'} size={18} />{item.cents ? t.depositReward(new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(item.cents / 100)) : t.glassReward}</div>}
              <p>{item.explanation}</p>
            </div>}
        </>}
      </div>
    </FitBoard>
    <div className="recycling-actions">
      <button className="text-button" onClick={() => setNotes(true)}>{t.references}</button>
      {done ? <button className="primary" onClick={restart}>{t.restart}</button>
        : answer !== null ? <button className="primary" onClick={advance}>{index === recyclingItems.length - 1 ? t.seeSummary : t.next}</button>
          : <span>{t.prompt}</span>}
    </div>
    {notes && <Dialog className="lesson-notes" title={t.references} closeLabel={translations[language].close} onClose={() => setNotes(false)}>
      <FitBoard><div className="lesson-notes-content">
        <p>{t.intro}</p><p>{t.disclaimer}</p>
        <p><a href="https://dpg-pfandsystem.de/" target="_blank" rel="noreferrer">{t.dpg}</a> · <a href="https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/abfall" target="_blank" rel="noreferrer">{t.consumerAdvice}</a></p>
      </div></FitBoard>
    </Dialog>}
  </section>;
}
