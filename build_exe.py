#!/usr/bin/env python3
"""
Automated PyInstaller Builder for MovieBox Desktop Application (.exe / .app)
"""
import os
import sys
import subprocess

def build():
    print("📦 Preparing PyInstaller...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    web_ui_dir = os.path.join(base_dir, "web-ui")
    
    separator = ";" if os.name == "nt" else ":"
    add_data_flag = f"{web_ui_dir}{separator}web-ui"
    
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onedir",
        "--name=MovieBox",
        f"--add-data={add_data_flag}",
        os.path.join(base_dir, "movie.py")
    ]
    
    print("🔨 Building MovieBox Desktop Application...")
    subprocess.check_call(cmd, cwd=base_dir)
    print("\n✅ Build Successful!")
    print("📍 Executable location: dist/MovieBox/MovieBox.exe (Windows) or dist/MovieBox/MovieBox (macOS/Linux)")

if __name__ == "__main__":
    build()
