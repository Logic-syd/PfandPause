import type { Language } from '../i18n';

export const destinations = [
  { id: 'single', label: 'Einweg · 退回商店', detail: '一次性押金包装 · 0.25 €' },
  { id: 'multi15', label: 'Mehrweg · 退回商店', detail: '本题可重复使用瓶 · 0.15 €' },
  { id: 'multi8', label: 'Mehrweg · 退回商店', detail: '本题可重复使用瓶 · 0.08 €' },
  { id: 'white', label: 'Weißglas · 白玻璃箱', detail: '无押金、透明的玻璃包装' },
  { id: 'brown', label: 'Braunglas · 棕玻璃箱', detail: '无押金、棕色的玻璃包装' },
  { id: 'green', label: 'Grünglas · 绿玻璃箱', detail: '无押金、绿色或其他颜色的玻璃包装' },
] as const;
export type Destination = typeof destinations[number]['id'];
export type RecyclingItemId = 'petWater' | 'refillableWater' | 'refillableBeer' | 'clearWine' | 'brownOil' | 'greenWine' | 'blueDrink' | 'singleUseGlass';
export interface RecyclingItem {
  id: RecyclingItemId;
  name: string;
  material: string;
  color: string;
  label: string;
  destination: Destination;
  cents: number;
  explanation: string;
}
// Explicit sample labels teach inspection, rather than inferring deposits from drinks or color.
export const recyclingItems: RecyclingItem[] = [
  { id: 'petWater', name: '矿泉水塑料瓶', material: '透明 PET 塑料', color: '#c0dce7', label: 'Einweg · DPG 标识 · Pfand 0,25 €', destination: 'single', cents: 25, explanation: '这瓶有 DPG 一次性押金标识，退回商店可拿回 25 分。一次性押金包装也可能是罐或玻璃瓶，不只塑料瓶。不要压扁，以免机器无法识别。' },
  { id: 'refillableWater', name: '可重复使用矿泉水瓶', material: '透明玻璃', color: '#d4e4de', label: 'Mehrweg · Pfand 0,15 €', destination: 'multi15', cents: 15, explanation: '这瓶标明 Mehrweg 和 15 分押金，要退回接受这种瓶型的商店。透明玻璃不代表应该扔白玻璃箱。15 分是常见金额，具体看标签或购买凭证。' },
  { id: 'refillableBeer', name: '可重复使用啤酒瓶', material: '棕色玻璃', color: '#94623e', label: 'Mehrweg · Pfand 0,08 €', destination: 'multi8', cents: 8, explanation: '这瓶标明 8 分押金，退回接受这种瓶型的商店。8 分是很多可重复使用啤酒瓶的常见金额，不能把所有啤酒瓶都当成 8 分。' },
  { id: 'clearWine', name: '透明葡萄酒瓶', material: '透明玻璃', color: '#e0e7e4', label: '无押金 · kein Pfand', destination: 'white', cents: 0, explanation: '本题瓶子无押金，倒空后放入白玻璃箱。只按玻璃本身的颜色判断，不按标签颜色；可重复使用的押金酒瓶仍应退回商店。' },
  { id: 'brownOil', name: '棕色食用油瓶', material: '棕色玻璃', color: '#805536', label: '无押金 · kein Pfand', destination: 'brown', cents: 0, explanation: '本题是无押金棕色玻璃包装，倒空后放入棕玻璃箱。玻璃箱接收瓶罐包装，不接收饮水杯、陶瓷或窗玻璃。' },
  { id: 'greenWine', name: '绿色葡萄酒瓶', material: '绿色玻璃', color: '#4a7853', label: '无押金 · kein Pfand', destination: 'green', cents: 0, explanation: '无押金的绿色玻璃包装进入绿玻璃箱。把玻璃按颜色分开有助于回收再利用，投放时间和具体要求以当地标识为准。' },
  { id: 'blueDrink', name: '蓝色玻璃饮料瓶', material: '蓝色玻璃', color: '#477daa', label: '无押金 · kein Pfand', destination: 'green', cents: 0, explanation: '蓝色、红色等不属于透明或棕色的无押金玻璃包装，通常投入绿玻璃箱，绿色玻璃回收对混色更宽容。留意当地回收点的说明。' },
  { id: 'singleUseGlass', name: '一次性玻璃饮料瓶', material: '棕色玻璃', color: '#94623e', label: 'Einweg · DPG 标识 · Pfand 0,25 €', destination: 'single', cents: 25, explanation: '虽然它是棕色玻璃，但有一次性押金标识，应退回商店拿回 25 分。先判断有没有押金，再判断无押金玻璃的颜色。' },
];

type ItemText = Pick<RecyclingItem, 'name' | 'material' | 'label' | 'explanation'>;
const itemTranslations: Record<'en' | 'de', Record<RecyclingItemId, ItemText>> = {
  en: {
    petWater: { name: 'Plastic mineral water bottle', material: 'Clear PET plastic', label: 'Einweg · DPG logo · Pfand 0,25 €', explanation: 'The DPG logo identifies single-use deposit packaging. Return this bottle to a shop to get 25 cents back. Single-use deposit packaging also includes some cans and glass bottles. Keep the bottle intact so the return machine can identify it.' },
    refillableWater: { name: 'Refillable mineral water bottle', material: 'Clear glass', label: 'Mehrweg · Pfand 0,15 €', explanation: 'This bottle is marked Mehrweg (refillable) with a 15-cent deposit. Return it to a shop that accepts this bottle type. Clear glass does not automatically belong in the clear-glass bank. Fifteen cents is common; check the label or receipt for the actual amount.' },
    refillableBeer: { name: 'Refillable beer bottle', material: 'Brown glass', label: 'Mehrweg · Pfand 0,08 €', explanation: 'This bottle has an 8-cent deposit. Return it to a shop that accepts this bottle type. Eight cents is common for many refillable beer bottles, but the amount is not the same for every beer bottle.' },
    clearWine: { name: 'Clear wine bottle', material: 'Clear glass', label: 'No deposit · kein Pfand', explanation: 'This example has no deposit. Empty it and place it in the clear-glass bank. Look at the color of the glass itself, not the label. Refillable wine bottles with a deposit should still go back to a shop.' },
    brownOil: { name: 'Brown cooking oil bottle', material: 'Brown glass', label: 'No deposit · kein Pfand', explanation: 'This is brown glass packaging without a deposit. Empty it and place it in the brown-glass bank. Glass banks accept packaging such as bottles and jars, not drinking glasses, ceramics or window glass.' },
    greenWine: { name: 'Green wine bottle', material: 'Green glass', label: 'No deposit · kein Pfand', explanation: 'Green glass packaging without a deposit goes in the green-glass bank. Sorting glass by color helps recycling. Check local signs for permitted disposal times and other requirements.' },
    blueDrink: { name: 'Blue glass drinks bottle', material: 'Blue glass', label: 'No deposit · kein Pfand', explanation: 'Blue, red and other glass packaging that is neither clear nor brown usually goes in the green-glass bank when it has no deposit. Green glass tolerates mixed colors better during recycling. Follow the instructions at your local collection point.' },
    singleUseGlass: { name: 'Single-use glass drinks bottle', material: 'Brown glass', label: 'Einweg · DPG logo · Pfand 0,25 €', explanation: 'Although the glass is brown, the single-use deposit label means this bottle goes back to a shop for a 25-cent refund. Check for a deposit first, then sort non-deposit glass by color.' },
  },
  de: {
    petWater: { name: 'Mineralwasserflasche aus Kunststoff', material: 'Durchsichtiger PET-Kunststoff', label: 'Einweg · DPG-Logo · Pfand 0,25 €', explanation: 'Das DPG-Logo kennzeichnet pfandpflichtige Einwegverpackungen. Gib diese Flasche im Geschäft zurück und erhalte 25 Cent. Auch Dosen und Glasflaschen können Einwegpfand haben. Die Flasche nicht zerdrücken, damit der Rücknahmeautomat sie erkennen kann.' },
    refillableWater: { name: 'Mehrwegflasche für Mineralwasser', material: 'Farbloses Glas', label: 'Mehrweg · Pfand 0,15 €', explanation: 'Auf dieser Flasche stehen Mehrweg und 15 Cent Pfand. Gib sie in einem Geschäft zurück, das diesen Flaschentyp annimmt. Farbloses Glas gehört nicht automatisch in den Weißglascontainer. 15 Cent sind üblich; den genauen Betrag findest du auf dem Etikett oder Kassenbon.' },
    refillableBeer: { name: 'Mehrweg-Bierflasche', material: 'Braunes Glas', label: 'Mehrweg · Pfand 0,08 €', explanation: 'Diese Flasche hat 8 Cent Pfand. Gib sie in einem Geschäft zurück, das diesen Flaschentyp annimmt. 8 Cent sind bei vielen Mehrweg-Bierflaschen üblich, aber nicht bei jeder Bierflasche.' },
    clearWine: { name: 'Farblose Weinflasche', material: 'Farbloses Glas', label: 'Kein Pfand', explanation: 'Diese Beispielflasche hat kein Pfand. Entleere sie und wirf sie in den Weißglascontainer. Entscheidend ist die Farbe des Glases, nicht des Etiketts. Mehrweg-Weinflaschen mit Pfand gehören weiterhin zurück ins Geschäft.' },
    brownOil: { name: 'Braune Speiseölflasche', material: 'Braunes Glas', label: 'Kein Pfand', explanation: 'Das ist eine braune Glasverpackung ohne Pfand. Entleere sie und wirf sie in den Braunglascontainer. In Altglascontainer gehören Verpackungen wie Flaschen und Konservengläser, keine Trinkgläser, Keramik oder Fensterscheiben.' },
    greenWine: { name: 'Grüne Weinflasche', material: 'Grünes Glas', label: 'Kein Pfand', explanation: 'Grüne Glasverpackungen ohne Pfand gehören in den Grünglascontainer. Nach Farben getrenntes Glas lässt sich besser recyceln. Beachte die Hinweise vor Ort zu Einwurfzeiten und weiteren Vorgaben.' },
    blueDrink: { name: 'Blaue Getränkeflasche aus Glas', material: 'Blaues Glas', label: 'Kein Pfand', explanation: 'Blaue, rote und andere Glasverpackungen, die weder farblos noch braun sind, gehören ohne Pfand normalerweise in den Grünglascontainer. Grünglas verträgt beim Recycling mehr Fremdfarben. Beachte die Hinweise an deiner Sammelstelle.' },
    singleUseGlass: { name: 'Einweg-Getränkeflasche aus Glas', material: 'Braunes Glas', label: 'Einweg · DPG-Logo · Pfand 0,25 €', explanation: 'Obwohl das Glas braun ist, hat diese Flasche Einwegpfand. Gib sie im Geschäft zurück und erhalte 25 Cent. Prüfe zuerst, ob Pfand erhoben wird. Erst pfandfreie Glasverpackungen werden nach Farben sortiert.' },
  },
};

const destinationTranslations: Record<'en' | 'de', Record<Destination, { label: string; detail: string }>> = {
  en: {
    single: { label: 'Einweg · Return to a shop', detail: 'Single-use deposit packaging · €0.25' },
    multi15: { label: 'Mehrweg · Return to a shop', detail: 'This refillable bottle · €0.15' },
    multi8: { label: 'Mehrweg · Return to a shop', detail: 'This refillable bottle · €0.08' },
    white: { label: 'Weißglas · Clear-glass bank', detail: 'Clear glass packaging without a deposit' },
    brown: { label: 'Braunglas · Brown-glass bank', detail: 'Brown glass packaging without a deposit' },
    green: { label: 'Grünglas · Green-glass bank', detail: 'Green or other colored glass packaging without a deposit' },
  },
  de: {
    single: { label: 'Einweg · Zurück ins Geschäft', detail: 'Einwegverpackung mit Pfand · 0,25 €' },
    multi15: { label: 'Mehrweg · Zurück ins Geschäft', detail: 'Diese Mehrwegflasche · 0,15 €' },
    multi8: { label: 'Mehrweg · Zurück ins Geschäft', detail: 'Diese Mehrwegflasche · 0,08 €' },
    white: { label: 'Weißglas · Weißglascontainer', detail: 'Farblose Glasverpackungen ohne Pfand' },
    brown: { label: 'Braunglas · Braunglascontainer', detail: 'Braune Glasverpackungen ohne Pfand' },
    green: { label: 'Grünglas · Grünglascontainer', detail: 'Grüne und andersfarbige Glasverpackungen ohne Pfand' },
  },
};

export function getRecyclingItems(language: Language): RecyclingItem[] {
  if (language === 'zh') return recyclingItems;
  return recyclingItems.map(item => ({ ...item, ...itemTranslations[language][item.id] }));
}

export function getRecyclingDestinations(language: Language): { id: Destination; label: string; detail: string }[] {
  return destinations.map(destination => ({ ...destination, ...(language === 'zh' ? {} : destinationTranslations[language][destination.id]) }));
}

export function assessRecycling(item: RecyclingItem, destination: Destination) {
  const correct = item.destination === destination;
  return { correct, refundCents: correct ? item.cents : 0 };
}
