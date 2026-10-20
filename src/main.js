import './style.css';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import { ROSTER } from './combat.js';
import { Game } from './game.js';

document.querySelector('#app').innerHTML = `
  <canvas id="world" aria-label="Third-person harbor mission"></canvas>
  <div class="vignette"></div>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">LJ<span>®</span></span><div>LIL JEFF <b>SIMULATOR</b><small>THE HARBOR RUN / PLAYABLE PROTOTYPE</small></div></div>
    <div class="top-right"><span class="live-dot"></span> STORY MODE <span class="divider">/</span> CHAPTER 01 <button id="help-button" aria-label="Pause and show controls">ESC <span>MENU</span></button></div>
  </header>
  <main id="hud" class="hidden">
    <section class="mission-panel"><div class="eyebrow">OPERATION 001 <span id="mission-step">01 / 03</span></div><h2 id="objective-title">Open the route</h2><p id="objective-description">King Draco · Reach the orange access panel.</p><div class="objective-progress"><i id="objective-progress"></i></div><div class="mission-note"><span>◇</span> ALL THREE. ONE WAY OUT.</div></section>
    <div class="compass"><span>W</span><i></i><span id="heading">N</span><i></i><span>E</span></div>
    <div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i><b></b></div>
    <div id="hit-marker">×</div>
    <div id="interaction" class="hidden"></div>
    <div id="toast" role="status"></div>
    <section class="squad-panel"><div class="eyebrow">YOUR CREW <span>1 / 2 / 3 TO SWITCH</span></div><div class="squad">${ROSTER.map((person, i) => `<button class="squad-card ${i === 0 ? 'selected' : ''}" data-character="${i}" style="--accent:${person.color}"><div class="portrait"><span>${person.tag}</span><b>${i + 1}</b></div><div class="character-info"><strong>${person.name}</strong><small>${person.role}</small><div class="health-track"><i id="health-${i}"></i></div></div><span class="active-label">${i === 0 ? 'ACTIVE' : 'READY'}</span></button>`).join('')}</div></section>
    <section class="weapon-panel"><div class="eyebrow" id="weapon-status">PRIMARY / FULL AUTO</div><h2 id="weapon-name">MICRODRAC</h2><div class="ammo"><strong id="ammo">100</strong><span>/ <span id="capacity">100</span></span><div><b id="spares">4</b><small>SPARE MAGS</small></div></div><div class="weapon-actions"><span><kbd>Q</kbd> SWAP WEAPON</span><span><kbd>R</kbd> RELOAD</span></div></section>
    <div class="bottom-help"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>C</kbd> SLIDE</span><span><kbd>LMB</kbd> FIRE</span><span><kbd>RMB</kbd> AIM</span></div>
    <div class="location"><span>◈</span> NORTH DOCKS <small>23:48 · SECTOR 07</small></div>
    <div id="damage-flash"></div>
  </main>
  <section id="menu" class="menu">
    <div class="menu-content"><div class="eyebrow"><span class="live-dot"></span> THREE CHARACTERS. ONE STORY.</div><h1>THE<br>HARBOR<span>RUN.</span></h1><p class="intro">A locked-down dock. A crew with a plan.<br>Switch between King Draco, Lil doom, and Z78<br>to open the route and get everyone out.</p><button id="start" class="start-button">ENTER THE HARBOR <span>↗</span></button><div class="menu-footnote">CHAPTER 01 <i></i> SINGLE PLAYER <i></i> THIRD PERSON</div></div>
    <aside class="briefing"><div class="eyebrow">MISSION BRIEF / 001</div><h3>Everyone has<br>a part to play.</h3>${ROSTER.map((p,i) => `<div class="brief-row"><span style="color:${p.color}">0${i+1}</span><div><b>${p.name}</b><p>${p.description}</p></div></div>`).join('')}<div class="controls-note">WASD move · Mouse look · Click fire<br>Space jump · Shift sprint · C slide<br>1–3 switch · Q weapon · R reload · E interact<br><br>Headphones optional. Keyboard + mouse required.<br>Press Esc to pause. Click to capture the mouse.</div></aside>
    <div class="menu-bottom">NORTH DOCKS / SECTOR 07 <span>EARLY BUILD · ORIGINAL PLACEHOLDER ART</span></div>
  </section>
  <section id="result" class="menu hidden"><div class="result-content"><div class="eyebrow" id="result-tag">OPERATION COMPLETE</div><h1 id="result-title">CREW<br>EXTRACTED.</h1><p id="result-detail"></p><button id="restart" class="start-button">RUN IT BACK <span>↗</span></button></div></section>
  <div id="error" class="hidden" role="alert"></div>
`;

try {
  const game = new Game(document.querySelector('#world'));
  document.querySelector('#start').addEventListener('click', () => game.start());
  document.querySelector('#help-button').addEventListener('click', () => game.pause());
  document.querySelector('#restart').addEventListener('click', () => game.reset());
  document.querySelectorAll('[data-character]').forEach(button => button.addEventListener('click', () => game.switchCharacter(Number(button.dataset.character))));
  if (new URLSearchParams(location.search).has('test')) window.__game = game;
} catch (error) {
  console.error(error);
  const box = document.querySelector('#error');
  box.classList.remove('hidden');
  box.textContent = 'The 3D renderer could not start. Enable WebGL / hardware acceleration, then reload. ' + error.message;
}
