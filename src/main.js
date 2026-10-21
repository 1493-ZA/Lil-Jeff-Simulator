import './style.css';
import {crewPortrait} from './portraits.js';
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/500.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import '@fontsource/barlow-condensed/800.css';
import { ROSTER } from './combat.js';
import {setQuality} from './quality.js';
import { Game } from './game.js';

document.querySelector('#app').innerHTML = `
  <canvas id="world" aria-label="Third-person Enter CHIRAQ mission"></canvas>
  <div class="vignette"></div>
  <header class="topbar">
    <div class="brand"><span class="brand-mark">LJ<span>®</span></span><div>LIL JEFF <b>SIMULATOR</b><small id="level-title">ENTER CHIRAQ</small></div></div>
    <div class="top-right"><div class="music-control"><button id="music-toggle" aria-label="Toggle mission music" aria-pressed="true">MUSIC ON</button><input id="music-volume" type="range" min="0" max="100" value="20" aria-label="Music volume"></div><span class="live-dot"></span> STORY MODE <span class="divider">/</span> <span id="chapter-label">MISSION 01</span> <button id="help-button" aria-label="Pause and show controls"><b data-action="menu">ESC</b> <span>MENU</span></button></div>
  </header>
  <main id="hud" class="hidden">
    <section class="mission-panel"><div class="eyebrow">OPERATION 001 <span id="mission-step">01 / 03</span></div><h2 id="objective-title">Settle the score</h2><p id="objective-description">King Draco · 3 armed opps or the Special Opp.</p><p id="objective-count" class="objective-count"></p><div class="objective-progress"><i id="objective-progress"></i></div><div class="mission-note"><span>◇</span> <b id="enemy-remaining">OPPS LEFT 6</b></div></section>
    <div id="required-character" class="hidden"></div><div id="destination-indicator" class="hidden"></div><section id="minimap-panel" class="hidden"><canvas id="minimap" width="220" height="220" aria-label="North-up neighborhood minimap"></canvas><strong id="map-zone">HOME BLOCK</strong><small>♫ CYPHER · ◆ RIVALS · ▣ JOB · ◎ TARGET<br>▲ YOU · ● CREW · 4 NEXT MISSION</small></section><div id="completion-banner" role="status" class="hidden"></div><div id="low-health" class="hidden">♥ LOW HEALTH · FIND COVER</div><div class="compass"><span>W</span><i></i><span id="heading">N</span><i></i><span>E</span></div>
    <div class="crosshair" id="crosshair"><i></i><i></i><i></i><i></i><b></b></div>
    <div id="bark" class="hidden"><span id="bark-text"></span></div><div id="hit-marker">×</div>
    <div id="interaction" class="hidden"></div>
    <div id="toast" role="status"><span id="toast-text"></span><small>N NEXT LINE · ESC TO READ DIALOGUE HISTORY</small></div>
    <section class="squad-panel"><div class="eyebrow">YOUR CREW <span>1 / 2 / 3 TO SWITCH</span></div><div class="squad">${ROSTER.map((person, i) => `<button class="squad-card ${i === 0 ? 'selected' : ''}" data-character="${i}" style="--accent:${person.color}"><div class="portrait">${crewPortrait(i)}<span>${person.tag}</span><b>${i + 1}</b></div><div class="character-info"><strong><span class="health-heart">♥</span> ${person.name}<b class="body-count" id="body-count-${i}">BODY 0</b></strong><small>${person.role}</small><div class="health-track"><i id="health-${i}"></i></div><div class="xp-track"><i id="xp-${i}"></i></div><small class="xp-label" id="xp-label-${i}">◇ STREET CRED 0</small><small class="hp-label" id="hp-label-${i}">HP 100/100</small></div><span class="active-label">${i === 0 ? 'ACTIVE' : 'READY'}</span></button>`).join('')}</div></section>
    <section class="weapon-panel"><div class="eyebrow" id="weapon-status">PRIMARY / FULL AUTO</div><h2 id="weapon-name">MICRODRAC</h2><div class="ammo"><strong id="ammo">100</strong><span>/ <span id="capacity">100</span></span><div><b id="spares">4</b><small>SPARE MAGS</small></div></div><div id="special-status">STREET CRED 0</div><div class="weapon-actions"><span><kbd data-action="swap">Q</kbd> SWAP WEAPON</span><span><kbd data-action="reload">R</kbd> RELOAD</span></div></section>
    <div class="bottom-help"><span><kbd data-action="move">W A S D</kbd> MOVE</span><span><kbd data-action="jump">SPACE</kbd> JUMP</span><span><kbd data-action="sprint">SHIFT</kbd> SPRINT</span><span><kbd>C</kbd> COVER · SHIFT+C SLIDE</span><span><kbd data-action="fire">LMB</kbd> FIRE</span><span><kbd data-action="aim">RMB</kbd> AIM</span></div>
    <div class="location"><span>◈</span> SOUTH SIDE <small>19:48 · FICTIONAL BLOCK</small></div>
    <section id="rap-panel" class="activity-panel hidden"><div class="eyebrow"><b id="rap-session-name">LIL DOOM / SIDEWALK SESSION</b> <span id="rap-score">0/8</span></div><h2 id="rap-lyric">Streetlights on, we make our own way</h2><div class="rap-lane"><div class="rap-target"></div><div id="rap-notes"></div></div><p id="rap-feedback">J / K / L when the note reaches the line</p><small>6 OF 8 TO PASS · ESC PAUSES THE BEAT</small></section>
    <section id="drive-panel" class="activity-panel drive-panel hidden"><div class="eyebrow"><b id="drive-mode">Z78 / THE GETAWAY</b> <span id="drive-route">0/3</span></div><h2><span id="drive-speed">0</span> <small>KM/H</small></h2><p>CAR <b id="car-integrity">100%</b> · <b id="drive-kills">AMBUSH CLEARED 0/3</b></p><small id="drive-help">W / S DRIVE · A / D STEER · SPACE BRAKE · E EXIT</small></section>
<section id="car-work-panel" class="activity-panel car-work-panel hidden"><div class="eyebrow">Z78 / HOLD E</div><h2 id="car-work-title">BREAK INTO THE CAR</h2><div class="work-track"><i id="car-work-progress"></i></div><div id="wire-puzzle" class="hidden"></div><small>KEEP HOLDING E · RELEASE TO CANCEL</small></section>
    <div id="stance-status"></div>
    <div id="damage-flash"></div>
  </main>
  <section id="menu" class="menu">
    <div class="menu-content"><div class="eyebrow"><span class="live-dot"></span> THREE CHARACTERS. ONE STORY.</div><h1>ENTER<span>CHIRAQ.</span></h1><p class="intro">One neighborhood. Three names. A night to remember.<br>Draco clears the street. Doom owns the mic.<br>Z78 takes the wheel. Clear every opp.<br>CLAIM THE BLOCK. Shake the police.<br>Then put the whole night on wax.</p><button id="start" class="start-button">ENTER CHIRAQ <span>→</span></button><label class="quality-control">GRAPHICS <select data-quality aria-label="Graphics quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><details class="coop-settings"><summary>ONLINE CO-OP</summary><label>Relay address <input id="coop-url" placeholder="wss://your-relay.example" aria-label="Co-op relay address"></label><label>Room code <input id="coop-room" maxlength="12" placeholder="Leave blank to create" aria-label="Co-op room code"></label><button id="coop-connect">CREATE / JOIN ROOM</button><button id="coop-leave">LEAVE ROOM</button><p id="coop-status" role="status">Optional · up to 3 players · host starts the mission.</p></details><div class="menu-footnote">3 MISSIONS <i></i> FREE ROAM <i></i> SOLO / CO-OP</div></div>
    <aside class="briefing"><div class="eyebrow">MISSION BRIEF / 001</div><h3>Everyone has<br>a part to play.</h3>${ROSTER.map((p,i) => `<div class="brief-row"><span style="color:${p.color}">0${i+1}</span><div><b>${p.name}</b><p>${p.description}</p></div></div>`).join('')}<div class="controls-note">WASD move · Mouse look · Click fire<br>Space jump · Shift sprint · C crouch · Shift+C slide<br>1–3 switch · Q weapon · R reload · E interact<br><br>Keyboard / mouse or Xbox controller.<br>Esc: pause / return to main menu.<br>At the mic: J / K / L on beat.<br>Car: Z78 holds E to break in, then solves a short signal puzzle.<br>Driving: WASD · Space brake · E exit.<br>In car: 1 Draco · 2 doom · 3 driver.<br>WASD drive + mouse fire at the same time.<br>C cover · RMB auto-peek / aim assist.<br>N next narration · F street cred · M music.</div></aside>
    <div class="menu-bottom">SOUTH SIDE INSPIRED / FICTIONAL CHICAGO BLOCK <span>EARLY BUILD · ORIGINAL PLACEHOLDER ART</span></div>
  </section>
  <section id="pause-menu" class="menu hidden" aria-label="Mission paused"><div class="result-content"><div class="eyebrow">ENTER CHIRAQ / MISSION PAUSED</div><h1>TAKE A<br>BREATHER.</h1><p>Your mission is paused. Return to the block or end this run.</p><button id="resume" class="start-button">RESUME MISSION <span>→</span></button><button id="quit" class="secondary-button">RETURN TO MAIN MENU</button><label class="quality-control">GRAPHICS <select data-quality aria-label="Paused graphics quality"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><p class="quit-note">Mission progress resets. Earned street cred stays saved.</p><details class="dialogue-history"><summary>READ DIALOGUE HISTORY</summary><div id="narration-log"></div></details></div></section>
  <section id="result" class="menu hidden"><div class="result-content"><div class="eyebrow" id="result-tag">OPERATION COMPLETE</div><h1 id="result-title">CREW<br>EXTRACTED.</h1><p id="result-detail"></p><button id="restart" class="start-button">RUN IT BACK <span>→</span></button><button id="result-menu" class="secondary-button">RETURN TO MAIN MENU</button></div></section>
  <div id="error" class="hidden" role="alert"></div>
`;

try {
  const game = new Game(document.querySelector('#world'));
  document.querySelectorAll('[data-quality]').forEach(el=>el.addEventListener('change',()=>setQuality(game,el.value)));
  document.querySelector('#coop-connect').onclick=()=>{game.activateAudio();game.net.connect(document.querySelector('#coop-url').value,document.querySelector('#coop-room').value);};
  document.querySelector('#coop-leave').onclick=()=>{game.net.disconnect();game.net.status('Disconnected. Single-player ready.');};
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
