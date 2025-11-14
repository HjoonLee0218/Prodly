const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const WebSocket = require('ws');

const WS_URL = process.env.FOCUSAGENT_WS_URL || 'ws://localhost:8000/ws';
const OFF_TASK_HIDE_DELAY_MS = 3000;

let mainWindow = null;
let ws = null;
let reconnectTimer = null;
let hideTimer = null;

function positionWindow() {
  if (!mainWindow) {
    return;
  }

  const display = screen.getPrimaryDisplay();
  const workArea = display.workArea || display.workAreaSize;
  const windowSize = mainWindow.getSize();
  const x = Math.round(workArea.x + (workArea.width - windowSize[0]) / 2);
  const y = Math.round((workArea.y || 0) + 40);
  mainWindow.setPosition(x, y);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 120,
    show: false,
    resizable: false,
    movable: true,
    frame: false,
    titleBarStyle: 'hidden',
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#001f2937',
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.setMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    positionWindow();
  });
}

function hideBanner() {
  if (!mainWindow) {
    return;
  }
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  }
}

function showBanner() {
  if (!mainWindow) {
    return;
  }

  positionWindow();

  if (!mainWindow.isVisible()) {
    mainWindow.showInactive();
  }

  if (hideTimer) {
    clearTimeout(hideTimer);
  }

  hideTimer = setTimeout(() => {
    hideBanner();
  }, OFF_TASK_HIDE_DELAY_MS);
}

function handleFocusState(state) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('focus-state', state);

  if (state === 'off_task') {
    showBanner();
  } else {
    hideBanner();
  }
}

function cleanupWebSocket() {
  if (ws) {
    ws.removeAllListeners();
    try {
      ws.terminate();
    } catch (error) {
      console.error('Failed to terminate WebSocket', error);
    }
    ws = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connectWebSocket();
  }, 3000);
}

function connectWebSocket() {
  cleanupWebSocket();

  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    console.log(`Connected to ${WS_URL}`);
  });

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data.toString());
      if (parsed.state === 'on_task' || parsed.state === 'off_task') {
        handleFocusState(parsed.state);
      }
    } catch (error) {
      console.error('Failed to parse message from backend', error);
    }
  });

  ws.on('close', () => {
    scheduleReconnect();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error', error);
    scheduleReconnect();
  });
}

app.whenReady().then(() => {
  createWindow();
  connectWebSocket();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      connectWebSocket();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  hideBanner();
  cleanupWebSocket();
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
});
