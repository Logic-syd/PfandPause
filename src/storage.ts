import type { Language } from "./i18n";
export interface Preferences {
  language: Language;
  sound: boolean;
  reducedMotion: boolean;
  completed: number[];
  tutorialSeen: boolean;
  tutorialVersion: number;
}
export const STORAGE_KEY = "pfand-pause:v1";
export function languageFromLocale(locale: string): Language {
  const primary = locale.toLowerCase().split(/[-_]/)[0];
  return primary === "zh" || primary === "de" ? primary : "en";
}
export function loadPreferences(): Preferences {
  const defaults: Preferences = {
    language: languageFromLocale(navigator.language),
    sound: true,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    completed: [],
    tutorialSeen: false,
    tutorialVersion: 0,
  };
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "null",
    );
    if (!parsed || typeof parsed !== "object") return defaults;
    const p = parsed as Partial<Preferences>;
    return {
      language:
        p.language === "zh" || p.language === "de" || p.language === "en"
          ? p.language
          : defaults.language,
      sound: typeof p.sound === "boolean" ? p.sound : true,
      reducedMotion:
        typeof p.reducedMotion === "boolean"
          ? p.reducedMotion
          : defaults.reducedMotion,
      completed: Array.isArray(p.completed)
        ? [
            ...new Set(
              p.completed.filter(
                (n) => Number.isInteger(n) && n >= 1 && n <= 10,
              ),
            ),
          ]
        : [],
      tutorialSeen: p.tutorialSeen === true,
      tutorialVersion:
        typeof p.tutorialVersion === "number" &&
        Number.isInteger(p.tutorialVersion)
          ? p.tutorialVersion
          : 0,
    };
  } catch {
    return defaults;
  }
}
export function savePreferences(preferences: Preferences): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
