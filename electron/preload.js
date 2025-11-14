const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('focusAgent', {
  onStateChange(callback) {
    if (typeof callback !== 'function') {
      return () => undefined;
    }

    const listener = (_event, state) => {
      callback(state);
    };

    ipcRenderer.on('focus-state', listener);

    return () => {
      ipcRenderer.removeListener('focus-state', listener);
    };
  },
});
