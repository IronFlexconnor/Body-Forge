export type OnboardingData = {
  name: string;
  age: string;
  gender: string;
  level: string;
  goal: string;
  daysPerWeek: number;
  sessionLength: number;
  equipment: string[];
  injuries: string;
  diet: string;
  weight: string;
  height: string;
};

const KEY = "bodyforge:onboarding";
const DONE_KEY = "bodyforge:onboarded";

export function loadOnboarding(): Partial<OnboardingData> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
export function saveOnboarding(data: Partial<OnboardingData>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function markOnboarded() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DONE_KEY, "1");
}
export function isOnboarded() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(DONE_KEY) === "1";
}
