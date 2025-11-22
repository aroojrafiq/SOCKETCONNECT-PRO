

# 🚀 SocketConnect Pro

> **A Full-Stack Real-Time Communication Suite using Python Sockets & React.**

[](https://reactjs.org/) [](https://flask.palletsprojects.com/) [](https://socket.io/) [](https://www.google.com/search?q=)

**SocketConnect Pro** is a modern, modular chat application designed to demonstrate advanced **Socket Programming** concepts. Unlike standard apps that rely on WebRTC for media, this project implements a **custom binary streaming protocol** over TCP sockets to simulate real-time Voice and Video calling within a Local Area Network (LAN).

It features a sleek **Glassmorphism UI**, robust room management, and low-latency binary data transfer for file and media sharing.

-----

## ✨ Key Features

### 📡 Real-Time Communication

  * **Instant Messaging:** Low-latency global and private chat using WebSockets.
  * **Live Active Users:** Real-time sidebar updates showing online clients.
  * **Typing & System Status:** Live synchronization of connection states.

### 📹 Custom Media Streaming (The "Secret Sauce")

  * **Binary Video Calling:** Implements **MJPEG streaming** over Python Sockets (frames captured via Canvas API, compressed, and relayed as binary blobs).
  * **PCM Voice Calling:** Captures raw **PCM Audio** (Int16) via the Web Audio API `ScriptProcessor`, bypassing standard browser codecs for maximum compatibility and raw socket demonstration.
  * **Zero WebRTC:** Pure socket-based implementation to satisfy strict Computer Networks constraints.

### 📂 Multimedia & Files

  * **File Sharing:** Send Images, PDFs, and Docs (up to 10MB) via binary stream.
  * **Image Previews:** Automatic rendering of shared images in the chat window.

### 🛡️ Room Management & Security

  * **Dynamic Rooms:** Users can create custom chat rooms (e.g., "Gaming", "Study").
  * **Admin Privileges:** Secure room deletion protected by an Admin Password.
  * **One-Way Video Safety:** Smart fallback logic handles "Device in Use" errors, allowing audio-only fallback if the camera is busy.

-----

## 🛠️ Tech Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React.js | Component-based UI with Hooks & Custom Context |
| **Styling** | CSS3 | Glassmorphism design, Gradients, Animations |
| **Backend** | Python (Flask) | Lightweight server handling concurrency |
| **Protocol** | Flask-SocketIO | WebSocket wrapper for event-based communication |
| **Concurrency** | Python Threading | Background monitor threads for server health |
| **Streaming** | Binary Blobs | Custom handling of ArrayBuffers for Audio/Video |

-----

## ⚙️ Installation & Setup

### 1\. Clone the Repository

```bash
git clone https://github.com/yourusername/SocketConnect-Pro.git
cd SocketConnect-Pro
```

### 2\. Backend Setup (Python)

Navigate to the server folder and install dependencies.

```bash
cd server
pip install flask flask-socketio eventlet
python app.py
```

*The server will start on `http://0.0.0.0:5000`*

### 3\. Frontend Setup (React)

Open a new terminal, navigate to the client folder, and start the UI.

```bash
cd client
npm install
npm start
```

*The app will open at `http://localhost:3000`*

-----

## 📱 How to Test on LAN (Phone vs Laptop)

To test video calling between two devices:

1.  Find your Laptop's IP (e.g., `192.168.1.18`).
2.  Update `client/src/App.js`:
    ```javascript
    const socket = io.connect("http://192.168.1.18:5000", ... );
    ```
3.  Access on Phone: Open Chrome and go to `http://192.168.1.18:3000`.
4.  **Note:** You may need to enable `chrome://flags/#unsafely-treat-insecure-origin-as-secure` on Android to allow Camera access over HTTP.

-----

## 📸 Screenshots

| Landing Page | Video Call UI |
| :---: | :---: |
|  |  |

| Glassmorphism Chat | Admin Controls |
| :---: | :---: |
|  |  |

-----

## 🏆 Academic Context

This project was developed to fulfill **Computer Networks** lab requirements, specifically focusing on:

1.  **Multi-threaded Server Architecture.**
2.  **Socket Programming** (handling binary streams vs text frames).
3.  **LAN Connectivity** (binding to `0.0.0.0`).
4.  **Custom Application Layer Protocols** for media handling.

-----

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

[MIT](https://choosealicense.com/licenses/mit/)
