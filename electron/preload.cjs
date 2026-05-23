const { contextBridge } = require('electron');

// Expose a safe API to the renderer process if needed in the future
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});
