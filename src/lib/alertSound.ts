// A short two-tone chime, synthesized with the Web Audio API so there's no
// audio asset to ship. Browsers block audio until the page has had some
// user interaction, so this can silently no-op on a completely untouched
// tab — that's an autoplay-policy limit, not a bug.
export function playAlertChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const tone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration);
    };
    tone(880, 0, 0.35);
    tone(1320, 0.15, 0.4);
    setTimeout(() => ctx.close(), 800);
  } catch {
    // Audio isn't available (autoplay policy, unsupported browser, etc).
  }
}
