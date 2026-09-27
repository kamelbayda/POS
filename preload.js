import { contextBridge } from 'electron';

// Expose secure API endpoints to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
});
