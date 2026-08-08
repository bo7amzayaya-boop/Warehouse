// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  print: () => import_electron.ipcRenderer.invoke("print-page"),
  saveFile: (data, defaultName, extension) => import_electron.ipcRenderer.invoke("save-file-dialog", { buffer: data, defaultName, extension }),
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version")
});
