
const AudioSys = (() => {
  let ctx, master, mute = false, started = false, musicTimer = 0, step = 0;
  const notes = [196, 247, 294, 392, 294, 247, 220, 196, 165, 196, 247, 330, 294, 247, 220, 196];

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  }
  async function unlock() {
    ensure();
    if (ctx.state === "suspended") await ctx.resume();
    started = true;
  }
  function beep(freq, dur, type, vol, slide) {
    if (!ctx || mute || !started) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || "square";
    o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(ctx.currentTime + dur + 0.02);
  }
  function noise(dur, vol) {
    if (!ctx || mute || !started) return;
    const n = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    n.buffer = buf;
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 900;
    g.gain.setValueAtTime(vol || 0.12, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(); n.stop(ctx.currentTime + dur);
  }
  return {
    unlock,
    setMute(v) { mute = v; },
    isMute() { return mute; },
    shoot() { beep(880, 0.07, "square", 0.05, 220); },
    explode() { noise(0.22, 0.18); beep(120, 0.2, "sawtooth", 0.08, 40); },
    pickup() { beep(523, 0.08, "square", 0.07); beep(784, 0.12, "square", 0.06); },
    death() { beep(220, 0.35, "sawtooth", 0.1, 55); noise(0.3, 0.2); },
    ui() { beep(660, 0.08, "square", 0.06); },
    hit() { beep(160, 0.05, "square", 0.05); },
    tick(dt) {
      if (!ctx || mute || !started) return;
      musicTimer += dt;
      if (musicTimer > 0.22) {
        musicTimer = 0;
        const f = notes[step % notes.length];
        beep(f / 2, 0.18, "triangle", 0.035);
        if (step % 4 === 0) beep(98, 0.08, "square", 0.04);
        step++;
      }
    }
  };
})();
