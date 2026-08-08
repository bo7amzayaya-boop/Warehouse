import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  print: () => ipcRenderer.invoke('print-page'),
  saveFile: (data: ArrayBuffer | string, defaultName: string, extension: string) =>
    ipcRenderer.invoke('save-file-dialog', { buffer: data, defaultName, extension }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
});
