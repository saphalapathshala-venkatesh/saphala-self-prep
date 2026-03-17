export function triggerXpCelebration(): void {
  if (typeof window === "undefined") return;

  import("canvas-confetti").then((mod) => {
    const confetti = mod.default;

    const crackerColors = ["#8050C0", "#1040A0", "#D4A017", "#9A6FCE", "#7B3FBF"];
    const ribbonColors = ["#88C840", "#D4621A", "#8050C0", "#1040A0"];

    confetti({
      particleCount: 48,
      angle: 60,
      spread: 52,
      startVelocity: 42,
      origin: { x: 0, y: 1 },
      colors: crackerColors,
      gravity: 1.1,
      decay: 0.9,
    });

    setTimeout(() => {
      confetti({
        particleCount: 48,
        angle: 120,
        spread: 52,
        startVelocity: 42,
        origin: { x: 1, y: 1 },
        colors: crackerColors,
        gravity: 1.1,
        decay: 0.9,
      });
    }, 120);

    setTimeout(() => {
      confetti({
        particleCount: 18,
        angle: 90,
        spread: 110,
        startVelocity: 28,
        origin: { x: 0.5, y: 1 },
        colors: ribbonColors,
        shapes: ["square"],
        scalar: 1.4,
        drift: 0.8,
        gravity: 0.55,
        decay: 0.94,
      });
    }, 240);

    setTimeout(() => {
      confetti({
        particleCount: 24,
        angle: 270,
        spread: 80,
        startVelocity: 14,
        origin: { x: 0.5, y: 0 },
        colors: [...crackerColors, ...ribbonColors],
        gravity: 0.75,
        decay: 0.91,
      });
    }, 380);
  });
}
