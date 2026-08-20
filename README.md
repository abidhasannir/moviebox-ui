# 🎬 MovieBox Web

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-00ff66?style=for-the-badge&logo=apple&logoColor=white" alt="Cross Platform" />
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/UI-Liquid%20Glassmorphism-purple?style=for-the-badge" alt="UI" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License" />
</p>

> **The Ultimate Open-Source Web Media Player & Streaming Client for Movies & TV Series.**  
> Features an ultra-premium liquid glassmorphism interface, automatic HLS/MP4 stream routing, YouTube/Netflix style keyboard shortcuts, multi-language subtitles, and a 1-word global CLI command (`movie`).

---

## ⚡ 1-Line Instant Setup

Clone and run MovieBox Web with a single command for your operating system:

### 🍎 macOS & 🐧 Linux (Terminal / Zsh / Bash)
```bash
git clone https://github.com/abidhasannir/moviebox-ui.git && cd moviebox-ui && python3 movie.py
```

### 🪟 Windows (Double-Click Launcher - Silent & No Script Blocks)
Double-click **`run_windows.vbs`** directly in the project folder to launch MovieBox Web silently without PowerShell execution policy blocks or black command prompt windows!

### 🪟 Windows (PowerShell / CMD)
```powershell
git clone https://github.com/abidhasannir/moviebox-ui.git; cd moviebox-ui; python movie.py
```

### 📦 Standalone Desktop Application (`MovieBox.exe`)
To build a standalone `.exe` desktop application for Windows:
```cmd
python build_exe.py
```
This packages the entire application into `dist/MovieBox/MovieBox.exe` which can be distributed and run on any Windows PC without Python installed!

> 💡 **Zero Configuration Required!**  
> `movie.py` automatically sets up an isolated Python virtual environment (`venv`), installs all dependencies, registers the global **`movie`** CLI command, starts the server on `http://localhost:8000/`, and opens your browser.

---

## 🔥 Global Terminal Command (`movie`)

Once installed, **`movie`** is automatically registered on your system PATH. 

You can open **any terminal from anywhere** on Windows, macOS, or Linux and simply type:

```bash
movie
```

The application will immediately launch and open in your default web browser!

To stop the server anytime, type `exit` in the terminal or press `Ctrl+C`.

---

## ✨ Features Breakdown

- 🍿 **Unlimited Movies & TV Series**: Stream thousands of titles with automatic dual-pipeline resolution fallback.
- 💎 **Liquid Glassmorphism Interface**: Modern Apple TV & Netflix-inspired design with glowing emerald accents and glass popovers.
- ⌨️ **YouTube / Netflix Style Keyboard Controls**:
  - **`Space`** / **`K`**: Play / Pause
  - **`F`**: Toggle Fullscreen
  - **`M`**: Mute / Unmute
  - **`C`**: Toggle Captions / Subtitles
  - **`←`** / **`→`**: Rewind / Fast-forward 5s
  - **`J`** / **`L`**: Rewind / Fast-forward 10s
  - **`↑`** / **`↓`**: Volume ±10%
  - **`0` – `9`**: Jump to 0% – 90% duration
  - **`⌨️ Shortcuts` Popup**: Built-in modal listing all shortcuts.
- 📱 **100% Mobile Responsive System**:
  - Native compact top header.
  - Expandable search bar toggle (`🔍`).
  - Slide-out liquid glass drawer menu (`🍔`).
  - Dynamic multi-column poster grid scaling.
- 🎯 **Direct Quality Switcher**: Change stream quality (**1080p**, **720p**, **480p**, **360p**) directly from the player control bar.
- 💬 **Multi-Language Subtitles**: WebVTT subtitles with CORS proxying, UTF-8 BOM stripping, and timestamp auto-conversion.

---

## 🎹 Keyboard Shortcuts Reference

| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause Video |
| `F` | Toggle Fullscreen Mode |
| `M` | Mute / Unmute Audio |
| `C` | Toggle Captions / Subtitles |
| `←` / `→` | Seek ±5 Seconds |
| `J` / `L` | Seek ±10 Seconds |
| `↑` / `↓` | Volume Up / Down 10% |
| `0` – `9` | Seek to 0% – 90% Duration |
| `Esc` | Close Shortcuts Modal or Mobile Drawer |

---

## 🛠️ Tech Stack & Architecture

- **Backend**: Python 3.10+, FastAPI, Uvicorn, Async HTTPX (Proxies for HLS/MP4 streams and WebVTT captions).
- **Frontend**: HTML5, Vanilla CSS3 (Glassmorphism), ES6+ JavaScript, Plyr.js, HLS.js.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more details.
