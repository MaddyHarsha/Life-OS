// ─────────────────────────────────────────────────────────────
//  electron/main.js  —  LifeOS Desktop Entry Point
//  Starts the Express backend as a child process, then opens
//  a BrowserWindow that loads the Vite/React frontend.
// ─────────────────────────────────────────────────────────────

const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain } = require("electron");
const path   = require("path");
const { fork } = require("child_process");
const http   = require("http");
const fs     = require("fs");

const isDev  = process.env.NODE_ENV === "development" || !app.isPackaged;
const PORT   = 3001;
let mainWindow, tray, serverProcess;

// ── Path helpers ────────────────────────────────────────────
// In production (packaged), resources live in process.resourcesPath
function resourcePath(...parts) {
  return isDev
    ? path.join(__dirname, "..", ...parts)
    : path.join(process.resourcesPath, ...parts);
}

// ── Start Express backend ────────────────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const serverScript = resourcePath("server", "server.js");

    // Pass the DB path so it's always stored in userData (not temp dir)
    const dbPath = path.join(app.getPath("userData"), "lifeos.db");

    serverProcess = fork(serverScript, [], {
      env: {
        ...process.env,
        PORT: String(PORT),
        DB_PATH: dbPath,
        NODE_ENV: "production",
        JWT_SECRET: "lifeos_nfs_" + app.getPath("userData").replace(/[^a-z0-9]/gi, ""),
      },
      stdio: isDev ? "inherit" : "pipe",
    });

    serverProcess.on("error", reject);

    // Poll until server is ready
    let attempts = 0;
    const poll = setInterval(() => {
      attempts++;
      if (attempts > 40) { clearInterval(poll); reject(new Error("Server failed to start")); return; }
      http.get(`http://localhost:${PORT}/api/auth/status`, (res) => {
        clearInterval(poll);
        resolve();
      }).on("error", () => {}); // still starting, ignore
    }, 250);
  });
}

// ── Create main window ───────────────────────────────────────
function createWindow() {
  const iconPath = resourcePath("assets", "icon.png");
  const icon     = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : undefined;

  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  960,
    minHeight: 600,
    title: "LifeOS — Personal System",
    icon,
    backgroundColor: "#060608",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration:  false,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false, // show after ready-to-show
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(resourcePath("dist", "index.html"));
  }

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Minimise to tray instead of closing
  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

// ── System tray ──────────────────────────────────────────────
function createTray() {
  const iconPath = resourcePath("assets", "icon.png");
  const img = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(img);
  tray.setToolTip("LifeOS");

  const menu = Menu.buildFromTemplate([
    { label: "Open LifeOS",  click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: "separator" },
    { label: "Open Data Folder", click: () => shell.openPath(app.getPath("userData")) },
    { type: "separator" },
    { label: "Quit",         click: () => { app.isQuitting = true; app.quit(); } },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => { mainWindow.show(); mainWindow.focus(); });
}

// ── App lifecycle ────────────────────────────────────────────
app.whenReady().then(async () => {
  try {
    console.log("[LifeOS] Starting backend server...");
    await startServer();
    console.log("[LifeOS] Backend ready. Opening window...");
    createWindow();
    createTray();
  } catch (err) {
    console.error("[LifeOS] Startup failed:", err);
    const { dialog } = require("electron");
    dialog.showErrorBox(
      "LifeOS — Startup Error",
      `Backend failed to start:\n\n${err.message}\n\nMake sure port ${PORT} is free.`
    );
    app.quit();
  }
});

app.on("activate", () => { // macOS dock click
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow.show();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }
});

// IPC: renderer can ask for app version / data path
ipcMain.handle("app:version",   () => app.getVersion());
ipcMain.handle("app:data-path", () => app.getPath("userData"));
