
window.addEventListener("keydown", AetherRaid.onKey);
window.addEventListener("keyup", AetherRaid.onKey);
document.getElementById("game").addEventListener("click", AetherRaid.onClick);

const stickEl = document.getElementById("stick");
const knob = document.getElementById("knob");
const fireBtn = document.getElementById("fireBtn");
let stickId = null;

function setKnob(dx, dy) {
  const mag = Math.hypot(dx, dy);
  const n = mag > 1 ? mag : 1;
  knob.style.transform = `translate(${(dx / n) * 28}px, ${(dy / n) * 28}px)`;
}

function onStick(clientX, clientY) {
  const r = stickEl.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  const cy = r.top + r.height / 2;
  let dx = (clientX - cx) / (r.width / 2);
  let dy = (clientY - cy) / (r.height / 2);
  const mag = Math.hypot(dx, dy);
  if (mag > 1) { dx /= mag; dy /= mag; }
  if (mag < 0.15) { dx = 0; dy = 0; }
  AetherRaid.setStick(dx, dy);
  setKnob(dx, dy);
}

stickEl.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  stickEl.setPointerCapture(e.pointerId);
  stickId = e.pointerId;
  onStick(e.clientX, e.clientY);
});
stickEl.addEventListener("pointermove", (e) => {
  if (e.pointerId !== stickId) return;
  e.preventDefault();
  onStick(e.clientX, e.clientY);
});
function endStick(e) {
  if (e && e.pointerId !== stickId) return;
  stickId = null;
  AetherRaid.setStick(0, 0);
  setKnob(0, 0);
}
stickEl.addEventListener("pointerup", endStick);
stickEl.addEventListener("pointercancel", endStick);

function fireOn(e) {
  e.preventDefault();
  fireBtn.classList.add("held");
  AetherRaid.setFiring(true);
  AetherRaid.onClick();
}
function fireOff(e) {
  e.preventDefault();
  fireBtn.classList.remove("held");
  AetherRaid.setFiring(false);
}
fireBtn.addEventListener("pointerdown", fireOn);
fireBtn.addEventListener("pointerup", fireOff);
fireBtn.addEventListener("pointercancel", fireOff);
fireBtn.addEventListener("pointerleave", fireOff);

document.getElementById("pauseBtn").addEventListener("click", (e) => {
  e.preventDefault();
  AetherRaid.togglePause();
});
document.getElementById("muteBtn").addEventListener("click", (e) => {
  e.preventDefault();
  AetherRaid.toggleMute();
});

document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}

AetherRaid.start();
