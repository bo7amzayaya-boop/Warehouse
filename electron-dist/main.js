var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);
var mainWindow = null;
var gotTheLock = import_electron.app.requestSingleInstanceLock();
if (!gotTheLock) {
  import_electron.app.quit();
} else {
  import_electron.app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  import_electron.app.whenReady().then(() => {
    createWindow();
    import_electron.app.on("activate", () => {
      if (import_electron.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}
function createWindow() {
  const iconPath = path.join(__dirname, "../assets/icon.png");
  const icoPath = path.join(__dirname, "../assets/icon.ico");
  const selectedIcon = fs.existsSync(icoPath) ? icoPath : fs.existsSync(iconPath) ? iconPath : void 0;
  mainWindow = new import_electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: "KHAYAL Warehouse Management System",
    icon: selectedIcon,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    }
  });
  const menuTemplate = [
    {
      label: "\u0645\u0644\u0641 (File)",
      submenu: [
        {
          label: "\u0637\u0628\u0627\u0639\u0629 (Print)",
          accelerator: "CmdOrCtrl+P",
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.print();
            }
          }
        },
        { type: "separator" },
        {
          label: "\u0625\u063A\u0644\u0627\u0642 (Exit)",
          accelerator: "Alt+F4",
          click: () => {
            import_electron.app.quit();
          }
        }
      ]
    },
    {
      label: "\u062A\u0639\u062F\u064A\u0644 (Edit)",
      submenu: [
        { label: "\u062A\u0631\u0627\u062C\u0639 (Undo)", role: "undo" },
        { label: "\u0625\u0639\u0627\u062F\u0629 (Redo)", role: "redo" },
        { type: "separator" },
        { label: "\u0642\u0635 (Cut)", role: "cut" },
        { label: "\u0646\u0633\u062E (Copy)", role: "copy" },
        { label: "\u0644\u0635\u0642 (Paste)", role: "paste" },
        { label: "\u062A\u062D\u062F\u064A\u062F \u0627\u0644\u0643\u0644 (Select All)", role: "selectAll" }
      ]
    },
    {
      label: "\u0639\u0631\u0636 (View)",
      submenu: [
        { label: "\u062A\u062D\u062F\u064A\u062B \u0627\u0644\u0635\u0641\u062D\u0629 (Reload)", role: "reload" },
        { label: "\u0625\u0639\u0627\u062F\u0629 \u062A\u062D\u0645\u064A\u0644 \u0642\u0633\u0631\u064A\u0629 (Force Reload)", role: "forceReload" },
        { type: "separator" },
        { label: "\u062A\u0643\u0628\u064A\u0631 \u0627\u0644\u0634\u0627\u0634\u0629 (Toggle Full Screen)", role: "togglefullscreen" },
        { label: "\u062A\u063A\u064A\u064A\u0631 \u0627\u0644\u062D\u062C\u0645 (Zoom In)", role: "zoomIn" },
        { label: "\u062A\u0635\u063A\u064A\u0631 \u0627\u0644\u062D\u062C\u0645 (Zoom Out)", role: "zoomOut" },
        { label: "\u0625\u0639\u0627\u062F\u0629 \u062A\u0639\u064A\u064A\u0646 \u0627\u0644\u062D\u062C\u0645 (Reset Zoom)", role: "resetZoom" }
      ]
    }
  ];
  const menu = import_electron.Menu.buildFromTemplate(menuTemplate);
  import_electron.Menu.setApplicationMenu(menu);
  mainWindow.setTitle("KHAYAL Warehouse Management System");
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      import_electron.shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
      if (!url.startsWith(devUrl)) {
        event.preventDefault();
        import_electron.shell.openExternal(url);
      }
    }
  });
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.ipcMain.handle("print-page", async () => {
  if (mainWindow) {
    mainWindow.webContents.print();
    return true;
  }
  return false;
});
import_electron.ipcMain.handle("save-file-dialog", async (_event, args) => {
  if (!mainWindow) return { success: false, canceled: true };
  const { defaultName, extension, buffer } = args;
  const result = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: "\u062D\u0641\u0638 \u0627\u0644\u0645\u0644\u0641 (Save File)",
    defaultPath: defaultName,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }]
  });
  if (!result.canceled && result.filePath) {
    try {
      const dataBuffer = typeof buffer === "string" ? Buffer.from(buffer, "utf-8") : Buffer.from(buffer);
      await fs.promises.writeFile(result.filePath, dataBuffer);
      return { success: true, filePath: result.filePath };
    } catch (err) {
      console.error("Error saving file:", err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, canceled: true };
});
import_electron.ipcMain.handle("get-app-version", () => {
  return import_electron.app.getVersion();
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
