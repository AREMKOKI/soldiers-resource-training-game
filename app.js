let resources = [];
let issues = [];
let currentIndex = 0;
let selectedAcronyms = new Set();

// High contrast color scheme with distinct backgrounds
const resourceColors = {
  "BOSS": { bg: "#FEF3C7", text: "#92400E", border: "#FCD34D" },
  "MFLC": { bg: "#D1FAE5", text: "#065F46", border: "#6EE7B7" },
  "UMT": { bg: "#EDE9FE", text: "#5B21B6", border: "#C4B5FD" },
  "AER": { bg: "#DBEAFE", text: "#1E40AF", border: "#93C5FD" },
  "RED CROSS": { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" },
  "ACS": { bg: "#DCFCE7", text: "#166534", border: "#86EFAC" },
  "MFR": { bg: "#F5D0FE", text: "#86198F", border: "#F0ABFC" },
  "BHR": { bg: "#CFFAFE", text: "#155E75", border: "#67E8F9" },
  "LEGAL": { bg: "#FEF3C7", text: "#78350F", border: "#FDE68A" },
  "AEC": { bg: "#F3E8FF", text: "#6B21A8", border: "#D8B4FE" },
  "SHARP": { bg: "#FFE4E6", text: "#9F1239", border: "#FDA4AF" },
  "EO": { bg: "#E2E8F0", text: "#1E293B", border: "#94A3B8" }
};

// DOM Elements
const appLayoutWrapper = document.querySelector('.app-layout-wrapper');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const btnSubmit = document.getElementById('btn-submit');
const btnRestart = document.getElementById('btn-restart');
const btnNext = document.getElementById('btn-next');

const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');
const issueTitle = document.getElementById('issue-title');
const resourceGrid = document.getElementById('resource-grid');

// Modal / Feedback Panel Elements
const sidePanel = document.getElementById('side-panel');
const sideIcon = document.getElementById('side-icon');
const sideTitle = document.getElementById('side-title');
const sideUserAns = document.getElementById('side-user-ans');
const sideCorrectAns = document.getElementById('side-correct-ans');

// Sound Effects via Web Audio API
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'correct') {
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    console.warn('Web Audio API not supported or blocked', e);
  }
}

// Load JSON data on startup
async function loadData() {
  try {
    const [resResp, issResp] = await Promise.all([
      fetch('soldier_resources.json'),
      fetch('soldier_issues.json')
    ]);
    const resData = await resResp.json();
    const issData = await issResp.json();

    resources = resData.soldier_resources.resources;
    issues = issData.soldier_issues.issues;

    startGame();
  } catch (err) {
    console.error('Error loading JSON data:', err);
    alert('Failed to load JSON files. Make sure server is running on localhost:3000!');
  }
}

// Start Game directly
function startGame() {
  issues = issues.sort(() => Math.random() - 0.5);
  currentIndex = 0;
  if (sidePanel) sidePanel.classList.remove('active');

  resultsScreen.classList.remove('active');
  gameScreen.classList.add('active');

  renderQuestion();
}

// Render Current Question
function renderQuestion() {
  selectedAcronyms.clear();
  btnSubmit.disabled = true;
  if (sidePanel) sidePanel.classList.remove('active');

  const currentIssue = issues[currentIndex];

  // Update HUD
  progressText.innerText = `${currentIndex + 1}/${issues.length}`;
  progressBar.style.width = `${((currentIndex) / issues.length) * 100}%`;

  // Update Descriptive Scenario Title
  issueTitle.innerText = currentIssue.title;

  // Render Grid Cards with accessible buttons
  resourceGrid.innerHTML = '';
  resources.forEach(res => {
    const styling = resourceColors[res.acronym] || { bg: "#FFFFFF", text: "#0F172A", border: "#CBD5E1" };

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'resource-btn';
    btn.dataset.acronym = res.acronym;
    btn.style.backgroundColor = styling.bg;
    btn.style.borderColor = styling.border;
    btn.style.color = styling.text;
    btn.setAttribute('aria-pressed', 'false');

    btn.innerHTML = `
      <div>
        <span class="resource-acronym">${res.acronym}</span>
        <span class="resource-name">${res.name}</span>
      </div>
      <span class="resource-desc">${res.description}</span>
    `;

    btn.addEventListener('click', () => toggleResourceSelect(btn, res.acronym));
    resourceGrid.appendChild(btn);
  });
}

// Handle Resource Tile Click
function toggleResourceSelect(element, acronym) {
  if (selectedAcronyms.has(acronym)) {
    selectedAcronyms.delete(acronym);
    element.classList.remove('selected');
    element.setAttribute('aria-pressed', 'false');
  } else {
    selectedAcronyms.add(acronym);
    element.classList.add('selected');
    element.setAttribute('aria-pressed', 'true');
  }

  btnSubmit.disabled = selectedAcronyms.size === 0;
}

// Submit Answer and Open Top-Right Modal Overlay
function handleSubmit() {
  const currentIssue = issues[currentIndex];
  const correctSet = new Set(currentIssue.recommended_resources);

  const isCorrect = 
    selectedAcronyms.size === correctSet.size && 
    Array.from(selectedAcronyms).every(acronym => correctSet.has(acronym));

  if (isCorrect) {
    playSound('correct');
    sideIcon.innerText = '✅';
    sideTitle.innerText = 'Correct Match!';
    sideTitle.style.color = '#10B981';
  } else {
    playSound('incorrect');
    sideIcon.innerText = '❌';
    sideTitle.innerText = 'Incorrect Match';
    sideTitle.style.color = '#EF4444';
  }

  const selectedArr = Array.from(selectedAcronyms).sort();
  const correctArr = Array.from(correctSet).sort();

  sideUserAns.innerText = selectedArr.length ? selectedArr.join(', ') : 'None';
  sideCorrectAns.innerText = correctArr.join(', ');

  // Activate modal in top-right corner unblurred
  if (sidePanel) sidePanel.classList.add('active');
}

// Advance to next question or results from modal
function handleNext() {
  if (sidePanel) sidePanel.classList.remove('active');
  currentIndex++;

  if (currentIndex < issues.length) {
    renderQuestion();
  } else {
    gameScreen.classList.remove('active');
    resultsScreen.classList.add('active');
  }
}

// Event Listeners
btnSubmit.addEventListener('click', handleSubmit);
btnNext.addEventListener('click', handleNext);
btnRestart.addEventListener('click', startGame);

// Initialize
loadData();