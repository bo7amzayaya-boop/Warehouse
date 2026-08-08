import { app, BrowserWindow, shell, ipcMain, dialog, Menu, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

function createWindow() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  const icoPath = path.join(__dirname, '../assets/icon.ico');
  const selectedIcon = fs.existsSync(icoPath) ? icoPath : (fs.existsSync(iconPath) ? iconPath : undefined);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'KHAYAL Warehouse Management System',
    icon: selectedIcon,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Build standard menu for shortcuts (Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+P, Reload)
  const menuTemplate: MenuItemConstructorOptions[] = [
    {
      label: 'ملف (File)',
      submenu: [
        {
          label: 'طباعة (Print)',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.print();
            }
          },
        },
        { type: 'separator' },
        {
          label: 'إغلاق (Exit)',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'تعديل (Edit)',
      submenu: [
        { label: 'تراجع (Undo)', role: 'undo' },
        { label: 'إعادة (Redo)', role: 'redo' },
        { type: 'separator' },
        { label: 'قص (Cut)', role: 'cut' },
        { label: 'نسخ (Copy)', role: 'copy' },
        { label: 'لصق (Paste)', role: 'paste' },
        { label: 'تحديد الكل (Select All)', role: 'selectAll' },
      ],
    },
    {
      label: 'عرض (View)',
      submenu: [
        { label: 'تحديث الصفحة (Reload)', role: 'reload' },
        { label: 'إعادة تحميل قسرية (Force Reload)', role: 'forceReload' },
        { type: 'separator' },
        { label: 'تكبير الشاشة (Toggle Full Screen)', role: 'togglefullscreen' },
        { label: 'تغيير الحجم (Zoom In)', role: 'zoomIn' },
        { label: 'تصغير الحجم (Zoom Out)', role: 'zoomOut' },
        { label: 'إعادة تعيين الحجم (Reset Zoom)', role: 'resetZoom' },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Set window title explicitly
  mainWindow.setTitle('KHAYAL Warehouse Management System');

  // Open external HTTP/HTTPS links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
      if (!url.startsWith(devUrl)) {
        event.preventDefault();
        shell.openExternal(url);
      }
    }
  });

  // Load app: dev server or production index.html
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('print-page', async () => {
  if (mainWindow) {
    mainWindow.webContents.print();
    return true;
  }
  return false;
});

ipcMain.handle('save-file-dialog', async (_event, args: { defaultName: string; extension: string; buffer: ArrayBuffer | string }) => {
  if (!mainWindow) return { success: false, canceled: true };

  const { defaultName, extension, buffer } = args;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'حفظ الملف (Save File)',
    defaultPath: defaultName,
    filters: [{ name: extension.toUpperCase(), extensions: [extension] }],
  });

  if (!result.canceled && result.filePath) {
    try {
      const dataBuffer = typeof buffer === 'string' ? Buffer.from(buffer, 'utf-8') : Buffer.from(buffer);
      await fs.promises.writeFile(result.filePath, dataBuffer);
      return { success: true, filePath: result.filePath };
    } catch (err: any) {
      console.error('Error saving file:', err);
      return { success: false, error: err.message };
    }
  }

  return { success: false, canceled: true };
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
