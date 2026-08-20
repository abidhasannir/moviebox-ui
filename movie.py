#!/usr/bin/env python3
import subprocess
import time
import sys
import os
import webbrowser

def setup_venv_and_install(api_dir):
    venv_dir = os.path.join(api_dir, "venv")
    
    if os.name == 'nt': # Windows
        python_exe = os.path.join(venv_dir, "Scripts", "python.exe")
        pip_exe = os.path.join(venv_dir, "Scripts", "pip.exe")
    else: # macOS / Linux
        python_exe = os.path.join(venv_dir, "bin", "python3")
        pip_exe = os.path.join(venv_dir, "bin", "pip3")

    if not os.path.exists(venv_dir):
        print("📦 Setting up virtual environment for the first time...")
        subprocess.check_call([sys.executable, "-m", "venv", "venv"], cwd=api_dir)
        print("📦 Installing dependencies...")
        subprocess.check_call([pip_exe, "install", "-r", "requirements.txt"], cwd=api_dir)
        print("✅ Environment setup complete!")

    return python_exe

def register_global_command(base_dir):
    """Registers the 'movie' command globally on macOS, Linux, and Windows."""
    movie_py_path = os.path.abspath(os.path.join(base_dir, "movie.py"))
    
    if os.name == 'nt': # Windows
        win_appdata = os.environ.get("LOCALAPPDATA", "")
        if win_appdata:
            windows_apps = os.path.join(win_appdata, "Microsoft", "WindowsApps")
            if os.path.exists(windows_apps):
                cmd_file = os.path.join(windows_apps, "movie.cmd")
                bat_content = f'@echo off\npython "{movie_py_path}" %*\n'
                try:
                    with open(cmd_file, "w") as f:
                        f.write(bat_content)
                except Exception:
                    pass
    else: # macOS / Linux
        user_bin_dirs = [
            os.path.expanduser("~/.local/bin"),
            os.path.expanduser("~/bin"),
            "/usr/local/bin"
        ]
        
        wrapper_content = f'#!/bin/sh\nexec python3 "{movie_py_path}" "$@"\n'
        for bin_dir in user_bin_dirs:
            if not os.path.exists(bin_dir):
                try:
                    os.makedirs(bin_dir, exist_ok=True)
                except Exception:
                    continue
            if os.access(bin_dir, os.W_OK):
                target_path = os.path.join(bin_dir, "movie")
                try:
                    with open(target_path, "w") as f:
                        f.write(wrapper_content)
                    os.chmod(target_path, 0o755)
                    break
                except Exception:
                    continue
        
        rc_files = [os.path.expanduser("~/.zshrc"), os.path.expanduser("~/.bashrc")]
        alias_line = f'alias movie="python3 \'{movie_py_path}\'"\n'
        for rc in rc_files:
            if os.path.exists(rc):
                try:
                    with open(rc, "r") as f:
                        content = f.read()
                    if "alias movie=" not in content:
                        with open(rc, "a") as f:
                            f.write(f"\n# MovieBox CLI Command\n{alias_line}")
                except Exception:
                    pass

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Auto-register 'movie' terminal command
    register_global_command(base_dir)

    print("🎬 Starting MovieBox Web UI...")
    
    api_dir = os.path.join(base_dir, "Moviebox-API-main")
    if not os.path.exists(api_dir):
        print("❌ Error: Moviebox-API-main directory not found!")
        sys.exit(1)
        
    try:
        venv_python = setup_venv_and_install(api_dir)
    except Exception as e:
        print(f"❌ Failed to setup environment or install dependencies: {e}")
        sys.exit(1)

    try:
        api_process = subprocess.Popen(
            [venv_python, "api.py"],
            cwd=api_dir,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
    except Exception as e:
        print(f"❌ Failed to start the API server: {e}")
        sys.exit(1)
        
    print("✅ API Server started successfully on port 8000!")
    print("💡 Terminal Command Active: You can now type 'movie' in terminal anytime to launch!")
    
    time.sleep(2.0)
    
    url = "http://localhost:8000/"
    print(f"🌐 Opening web browser at {url}")
    webbrowser.open(url)
    
    print("\n🟩 -------------------------------------------")
    print("🟩 Server is running. The Web UI is ready.")
    print("🟩 Type 'exit', 'close', or 'quit' to stop.")
    print("🟩 -------------------------------------------\n")
    
    try:
        for line in sys.stdin:
            cmd = line.strip().lower()
            if cmd in ["exit", "close", "quit"]:
                print("🛑 Shutting down MovieBox Web...")
                api_process.terminate()
                api_process.wait()
                break
            else:
                print(f"⚠️ Unknown command '{cmd}'. Type 'exit' to close.")
    except KeyboardInterrupt:
        print("\n🛑 Shutting down MovieBox Web...")
        api_process.terminate()
        api_process.wait()

if __name__ == "__main__":
    main()
