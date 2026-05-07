// Lightweight client-side favorite meals — instant, no backend round-trip.
// The AI Coach reads `forge:fav-meals` from the user-context payload via local prompts;
// this is intentionally simple so it works offline and across devices via cloud sync later.
import { useEffect, useState } from "react";

const KEY = "forge:fav-meals";

export type FavMeal = { id: string; slug?: string; title: string; meal_type?: string };

function read(): FavMeal[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function write(list: FavMeal[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("forge:favs-changed"));
}

export function useFavorites() {
  const [favs, setFavs] = useState<FavMeal[]>([]);
  useEffect(() => {
    setFavs(read());
    const sync = () => setFavs(read());
    window.addEventListener("forge:favs-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("forge:favs-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const isFav = (id: string) => favs.some((f) => f.id === id);
  const toggle = (m: FavMeal) => {
    const next = isFav(m.id) ? favs.filter((f) => f.id !== m.id) : [...favs, m];
    write(next);
    setFavs(next);
    return !isFav(m.id);
  };
  return { favs, isFav, toggle };
}
