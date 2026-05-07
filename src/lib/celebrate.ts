import confetti from "canvas-confetti";

export function celebrate() {
  if (typeof window === "undefined") return;
  const colors = ["#34d399", "#22d3ee", "#10b981", "#a7f3d0"];
  confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.7 },
    colors,
    scalar: 0.9,
    ticks: 180,
  });
  setTimeout(
    () =>
      confetti({
        particleCount: 60,
        spread: 100,
        startVelocity: 35,
        origin: { y: 0.6 },
        colors,
        scalar: 0.8,
      }),
    180,
  );
}
