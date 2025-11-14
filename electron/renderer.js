'use strict';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing root element for FocusAgent Electron renderer');
}
const banner = document.createElement('div');
banner.className = 'container';
banner.innerHTML = `
  <div class="icon" role="presentation">⚠️</div>
  <div class="content">
    <h1>You seem off-task</h1>
    <p>Refocus on your current task to maintain productivity.</p>
  </div>
`;

function showBanner() {
  if (!root.contains(banner)) {
    root.appendChild(banner);
  }
  document.body.classList.add('visible');
}

function hideBanner() {
  if (root.contains(banner)) {
    root.removeChild(banner);
  }
  document.body.classList.remove('visible');
}

window.focusAgent?.onStateChange?.((state) => {
  if (state === 'off_task') {
    showBanner();
  } else {
    hideBanner();
  }
});
