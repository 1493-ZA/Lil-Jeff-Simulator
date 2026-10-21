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
  <canvas id="world" aria-label="Third-person Enter CHIRAQ mission"></canvas>
  <div class="vignette"></div>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">LJ<span>®</span></span><div>LIL JEFF <b>SIMULATOR</b><small>ENTER CHIRAQ / CHAPTER 01</small></div></div>
    <div class="top-right"><div class="music-control"><button id="music-toggle" aria-label="Toggle mission music" aria-pressed="true">MUSIC ON</button><input id="music-volume" type="range" min="0" max="100" value="20" aria-label="Music volume"></div><span class="live-dot"></span> STORY MODE <span class="divider">/</span> CHAPTER 01 <button id="help-button" aria-label="Pause and show controls">ESC <span>MENU</span></button></div>
  </header>
  <main id="hud" class="hidden">
    <section class="mission-panel"><div class="eyebrow">OPERATION 001 <span id="mission-step">01 / 03</span></div><h2 id="objective-title">Settle the score</h2><p id="objective-description">King Draco · 3 armed opps or the Special Opp.</p><p id="objective-count" class="objective-count"></p><div class="objective-progress"><i id="objective-progress"></i></div><div class="mission-note"><span>◇</span> ALL THREE. ONE WAY OUT.</div></section>
    <div class="compass"><span>W</span><i></i><span id="heading">N</span><i></i><span>E</span></div>
    <div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i><b></b></div>
    <div id="hit-marker">×</div>
    <div id="interaction" class="hidden"></div>
    <div id="toast" role="status"><span id="toast-text"></span><small>N NEXT LINE · ESC TO READ DIALOGUE HISTORY</small></div>
    <section class="squad-panel"><div class="eyebrow">YOUR CREW <span>1 / 2 / 3 TO SWITCH</span></div><div class="squad">${ROSTER.map((person, i) => `<button class="squad-card ${i === 0 ? 'selected' : ''}" data-character="${i}" style="--accent:${person.color}"><div class="portrait"><span>${person.tag}</span><b>${i + 1}</b></div><div class="character-info"><strong>${person.name}</strong><small>${person.role}</small><div class="health-track"><i id="health-${i}"></i></div><div class="xp-track"><i id="xp-${i}"></i></div><small class="xp-label" id="xp-label-${i}">XP 0/100</small></div><span class="active-label">${i === 0 ? 'ACTIVE' : 'READY'}</span></button>`).join('')}</div></section>
    <section class="weapon-panel"><div class="eyebrow" id="weapon-status">PRIMARY / FULL AUTO</div><h2 id="weapon-name">MICRODRAC</h2><div class="ammo"><strong id="ammo">100</strong><span>/ <span id="capacity">100</span></span><div><b id="spares">4</b><small>SPARE MAGS</small></div></div><div id="special-status">SPECIAL CHARGE 0/100</div><div class="weapon-actions"><span><kbd>Q</kbd> SWAP WEAPON</span><span><kbd>R</kbd> RELOAD</span></div></section>
    <div class="bottom-help"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>SHIFT</kbd> SPRINT</span><span><kbd>C</kbd> SLIDE</span><span><kbd>LMB</kbd> FIRE</span><span><kbd>RMB</kbd> AIM</span></div>
    <div class="location"><span>◈</span> SOUTH SIDE <small>19:48 · FICTIONAL BLOCK</small></div>
    <section id="rap-panel" class="activity-panel hidden"><div class="eyebrow">LIL DOOM / SIDEWALK SESSION <span id="rap-score">0/8</span></div><h2 id="rap-lyric">Streetlights on, we make our own way</h2><div class="rap-lane"><div class="rap-target"></div><div id="rap-notes"></div></div><p id="rap-feedback">J / K / L when the note reaches the line</p><small>6 OF 8 TO PASS · ESC PAUSES THE BEAT</small></section>
    <section id="drive-panel" class="activity-panel drive-panel hidden"><div class="eyebrow"><b id="drive-mode">Z78 / THE GETAWAY</b> <span id="drive-route">0/3</span></div><h2><span id="drive-speed">0</span> <small>KM/H</small></h2><p>CAR <b id="car-integrity">100%</b> · <b id="drive-kills">AMBUSH CLEARED 0/2</b></p><small id="drive-help">W / S DRIVE · A / D STEER · SPACE BRAKE · E EXIT</small></section>
    <div id="damage-flash"></div>
  </main>
  <section id="menu" class="menu">
    <div class="menu-content"><div class="eyebrow"><span class="live-dot"></span> THREE CHARACTERS. ONE STORY.</div><h1>ENTER<span>CHIRAQ.</span></h1><p class="intro">One block. Three names. A night to remember.<br>Draco clears the street. Doom owns the mic.<br>Z78 takes the wheel. Draco covers from the back.</p><button id="start" class="start-button">ENTER CHIRAQ <span>→</span></button><div class="menu-footnote">CHAPTER 01 <i></i> SINGLE PLAYER <i></i> THIRD PERSON</div></div>
    <aside class="briefing"><div class="eyebrow">MISSION BRIEF / 001</div><h3>Everyone has<br>a part to play.</h3>${ROSTER.map((p,i) => `<div class="brief-row"><span style="color:${p.color}">0${i+1}</span><div><b>${p.name}</b><p>${p.description}</p></div></div>`).join('')}<div class="controls-note">WASD move · Mouse look · Click fire<br>Space jump · Shift sprint · C slide<br>1–3 switch · Q weapon · R reload · E interact<br><br>Headphones optional. Keyboard + mouse required.<br>Esc: pause / return to main menu.<br>At the mic: J / K / L on beat.<br>Driving: WASD · Space brake · E exit.<br>In car: 1 Draco · 2 doom · 3 driver.<br>WASD drive + mouse fire at the same time.<br>N next narration · F special status · M music.</div></aside>
    <div class="menu-bottom">SOUTH SIDE INSPIRED / FICTIONAL CHICAGO BLOCK <span>EARLY BUILD · ORIGINAL PLACEHOLDER ART</span></div>
  </section>
  <section id="pause-menu" class="menu hidden" aria-label="Mission paused"><div class="result-content"><div class="eyebrow">ENTER CHIRAQ / MISSION PAUSED</div><h1>TAKE A<br>BREATHER.</h1><p>Your mission is paused. Return to the block or end this run.</p><button id="resume" class="start-button">RESUME MISSION <span>→</span></button><button id="quit" class="secondary-button">RETURN TO MAIN MENU</button><p class="quit-note">Mission progress resets. Earned special charge stays saved.</p><details class="dialogue-history"><summary>READ DIALOGUE HISTORY</summary><div id="narration-log"></div></details></div></section>
  <section id="result" class="menu hidden"><div class="result-content"><div class="eyebrow" id="result-tag">OPERATION COMPLETE</div><h1 id="result-title">CREW<br>EXTRACTED.</h1><p id="result-detail"></p><button id="restart" class="start-button">RUN IT BACK <span>→</span></button><button id="result-menu" class="secondary-button">RETURN TO MAIN MENU</button></div></section>
  <div id="error" class="hidden" role="alert"></div>
`;

try {
  const game = new Game(document.querySelector('#world'));
  game.updateMusicUI();
  document.querySelector('#music-toggle').addEventListener('click',()=>{game.music.toggle();game.updateMusicUI();});
  document.querySelector('#music-volume').addEventListener('input',event=>{game.music.setVolume(Number(event.target.value)/100);game.updateMusicUI();});
  document.querySelector('#start').addEventListener('click', () => game.start());
  document.querySelector('#help-button').addEventListener('click', () => game.pause());
  document.querySelector('#resume').addEventListener('click', () => game.start());
  document.querySelector('#quit').addEventListener('click', () => game.returnToMenu());
  document.querySelector('#result-menu').addEventListener('click', () => game.returnToMenu());
  document.querySelector('#restart').addEventListener('click', () => game.reset());
  document.querySelectorAll('[data-character]').forEach(button => button.addEventListener('click', () => game.switchCharacter(Number(button.dataset.character))));
  if (new URLSearchParams(location.search).has('test')) window.__game = game;
} catch (error) {
  console.error(error);
  const box = document.querySelector('#error');
  box.classList.remove('hidden');
  box.textContent = 'The 3D renderer could not start. Enable WebGL / hardware acceleration, then reload. ' + error.message;
}
