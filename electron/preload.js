// electron/preload.js
// Exposes a tiny safe API from main process to the renderer.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  getVersion:  () => ipcRenderer.invoke("app:version"),
  getDataPath: () => ipcRenderer.invoke("app:data-path"),
});
