# IonXE - Open Source Lighting Control System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org)
[![C](https://img.shields.io/badge/c-%2300599C.svg?style=flat&logo=c&logoColor=white)](https://www.cprogramming.com)
[![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

An open-source, from-scratch lighting control system inspired by the Eos IonXE console, designed for modern hardware with an easier learning curve and extensible architecture. Built with Rust, C, and modern web technologies.

## 🆕 **Latest Features**

### **🎭 Show Automation & Scheduling System**
Complete professional show control with visual sequencer, time-based scheduling, external triggers (MIDI/OSC), and automated show execution.

### **🤖 AI-Powered Lighting**
Advanced AI scene generation using Mistral LLM, music analysis, 3D venue integration, and intelligent lighting recommendations.

### **🎵 Live Audio Analysis & DJ Mode**
Real-time audio capture, beat detection, spectral analysis, DJ performance interface, and music-reactive lighting effects.

### **📱 Mobile Companion App (PWA)**
Progressive Web App with touch-optimized controls, offline support, real-time sync, and mobile-specific features.

### **🌐 Enhanced Network & Protocol Support**
Comprehensive DMX output, Art-Net/sACN support, multi-universe control, and advanced networking capabilities.

## ✨ Features

### 🎛️ **Advanced Fader Control**
- **512 DMX Channels** - Full professional lighting control
- **Bank Management** - 4 banks of 6 faders each with easy navigation
- **Page System** - 24 faders per page with smooth scrolling
- **Real-time Updates** - Live fader position synchronization
- **Grand Master** - Global intensity control with blackout functionality

### 🎮 **Virtual Desk Interface**
- **Number Keypad** - Channel selection and navigation
- **Intensity Controls** - Full, Out, and @ (prompt) buttons
- **Softkeys** - Macro, Record, Update, Clear, Blind, Live modes
- **Channel Selection** - Click-to-select with multi-select support
- **Visual Feedback** - Real-time button states and channel highlighting

### 🎬 **Scene Management**
- **Save/Recall Scenes** - Store and recall complete lighting states
- **Fade Control** - Smooth transitions with customizable timing
- **Import/Export** - JSON-based scene sharing and backup
- **Live Preview** - Real-time scene editing and testing

### 🤖 **Macro System**
- **Recording** - Capture complex lighting sequences
- **Playback** - Execute recorded macros with timing control
- **Management** - Save, load, and organize macro libraries
- **Step-by-step** - Visual macro editor with parameter display
- **Integration** - Seamless integration with all control features

### 🎨 **Advanced Color & Effects System**
- **RGB/HSL Color Picker** - Professional color selection with multiple color spaces
- **Color Palettes** - Save, load, and manage color collections
- **Channel Ranges** - Control multiple channels simultaneously
- **Intensity Scaling** - Precise level control (0-255)
- **Real-time Updates** - Instant visual feedback
- **Color Integration** - Seamless integration with faders, scenes, and Q lists

### 🎭 **Q List & Cue Management**
- **Professional Q Lists** - Complete cue management system
- **Cue Labels & Descriptions** - Rich metadata for each cue
- **Advanced Timing** - Fade in/out, delay, and follow times
- **State Management** - Real-time cue state tracking and progress
- **Drag & Drop** - Intuitive cue reordering
- **Keyboard Shortcuts** - Professional workflow shortcuts
- **Import/Export** - Q list sharing and backup

### 🎪 **Fixture Management**
- **Fixture Library** - Comprehensive fixture database
- **DMX Patching** - Professional patch management
- **Fixture Groups** - Organize fixtures for easy control
- **Profile Management** - Custom fixture profiles and capabilities
- **DMX Mapping** - Flexible channel mapping and control
- **Fixture Integration** - Seamless integration with all control systems

### 🎵 **Live Audio Analysis & Music Sync**
- **Real-time Audio Capture** - Microphone and line input support
- **Beat Detection** - Automatic BPM tracking and beat detection
- **Spectral Analysis** - Frequency band analysis (bass, mid, treble)
- **Energy Analysis** - Audio energy and intensity measurement
- **Spectral Centroid** - Timbre analysis for musical characteristics
- **DJ Mode** - Professional DJ interface with live performance controls
- **Audio Visualization** - Multiple visualization modes (waveform, spectrum, circular)
- **Sync Effects** - Beat sync, frequency sync, energy sync, and strobe sync
- **Sync Point Management** - Manual sync points during live performance
- **Audio Calibration** - Automatic sensitivity adjustment

### 🎭 **Show Automation & Scheduling**
- **Show Management** - Create, edit, and manage lighting shows
- **Show Sequencer** - Visual timeline-based sequence editor
- **Show Scheduler** - Time-based show scheduling and automation
- **External Triggers** - MIDI, OSC, time, and manual trigger support
- **Show Playback** - Play, pause, stop, and record shows
- **Sequence Items** - Cues, delays, triggers, effects, and macros
- **Show Monitoring** - Real-time show status and progress tracking
- **Scheduled Shows** - Recurring and one-time show scheduling
- **Trigger Configuration** - Configure external triggers for show control
- **Show Library** - Save, load, and organize show collections

### 🤖 **AI-Powered Lighting System**
- **Mistral AI Integration** - Advanced AI scene generation using Mistral LLM
- **Concept Processing** - Natural language lighting descriptions
- **Music Analysis** - Multi-format audio analysis (WAV, MP3, MID, MIDI)
- **3D Venue Integration** - Spatial lighting design with 3D venue models
- **Smart Suggestions** - AI-powered lighting recommendations
- **Contextual Generation** - Music and venue-aware scene creation
- **Mood Analysis** - Spectral analysis for musical mood detection
- **Harmonic Analysis** - Chord progression and key detection
- **Rhythm Pattern Recognition** - Musical rhythm complexity analysis
- **Spatial Effects** - 3D geometry-based lighting effects

### 📱 **Mobile Companion App (PWA)**
- **Progressive Web App** - Native app experience on mobile devices
- **Touch-Optimized Controls** - Large, touch-friendly fader controls
- **Real-time Sync** - Live synchronization with main console
- **Offline Support** - Continue working without internet connection
- **Scene Management** - Mobile scene save/recall functionality
- **AI Integration** - Mobile access to AI lighting features
- **System Monitoring** - Mobile system health and performance monitoring
- **Push Notifications** - System alerts and status updates
- **Background Sync** - Queue changes when offline, sync when connected
- **Haptic Feedback** - Tactile response for better control

### 🌐 **Network & Protocol Support**
- **Art-Net** - Industry-standard lighting protocol
- **sACN (E1.31)** - Streaming ACN for professional networks
- **Multi-Universe** - Support for multiple DMX universes
- **Network Discovery** - Automatic device discovery
- **RESTful API** - Complete HTTP API for integration
- **WebSocket Support** - Real-time bidirectional communication
- **DMX Output** - Real-time DMX packet generation and transmission
- **Protocol Translation** - Seamless protocol conversion

### 📁 **Show Management**
- **Show File System** - Complete show file management with templates
- **Auto-Save** - Automatic show saving every 30 seconds
- **Version Control** - Automatic versioning with checksum validation
- **Backup & Restore** - Create and restore show backups
- **Import/Export** - Standard .ionxe show file format
- **Show History** - Track recently opened shows with metadata
- **Template System** - Pre-configured show templates for quick setup

### 🔐 **User Management & Security**
- **Role-Based Access Control** - 4 user roles (Admin, Programmer, Operator, Guest)
- **Granular Permissions** - 30+ specific permissions for system features
- **Session Management** - Secure session handling with expiration
- **User Preferences** - Per-user settings and customization
- **Password Security** - Secure password hashing and management
- **JWT Authentication** - Secure token-based authentication

### 📊 **Performance Monitoring**
- **Real-time Metrics** - CPU, memory, FPS, latency, error rate tracking
- **Threshold Monitoring** - Configurable alerts for performance issues
- **System Diagnostics** - Comprehensive system health analysis
- **Error Tracking** - JavaScript error capture and logging
- **Performance Optimization** - Automated recommendations for improvement
- **Alert System** - Real-time alerts with acknowledgment

### 🔧 **Developer Features**
- **Modular Architecture** - Clean, maintainable codebase with 20+ specialized modules
- **RESTful API** - Complete backend API for all features across multiple services
- **File Management** - Built-in file system operations with version control
- **Command Center** - Shell access for advanced users
- **Health Monitoring** - System status and diagnostics
- **Service Architecture** - Microservices with Rust, C, and JavaScript
- **Real-time Communication** - WebSocket and HTTP streaming support
- **Error Handling** - Comprehensive error tracking and recovery
- **Performance Monitoring** - Real-time metrics and optimization
- **Docker Support** - Containerized deployment for all services


## 🏗️ **Architecture**

### **Backend Services**
- **Rust Backend** - High-performance API server with state management (Port 8080)
- **C Backend** - Low-level hardware control and DMX processing (Port 8081)
- **Middleware** - Request routing, rate limiting, and protocol translation (Port 8082)
- **AI Lighting Service** - Mistral AI integration and scene generation (Port 8084)
- **Live Audio Service** - Real-time audio analysis and music sync (Port 8085)
- **Show Automation Service** - Show scheduling and automation (Port 8086)
- **Mobile App Service** - PWA backend and mobile API (Port 8087)

### **Frontend**
- **Modular JavaScript** - Clean, maintainable frontend architecture with 20+ specialized modules
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Real-time Updates** - Live synchronization across all controls
- **Professional UI** - Industry-standard lighting console interface
- **Keyboard Shortcuts** - Professional workflow shortcuts and hotkeys
- **Progressive Web App** - Mobile companion app with offline support
- **AI Integration** - Seamless AI-powered lighting features
- **Live Audio Interface** - Real-time audio analysis and DJ mode
- **Show Automation** - Visual show sequencer and scheduler
- **Advanced Timing** - Professional timing controls and easing functions

### **Hardware Support**
- **x86-64** - Primary target architecture
- **ARM64** - Secondary target for embedded systems
- **DMX512** - Professional lighting protocol support
- **Network I/O** - Ethernet-based control and monitoring

## 🚀 **Quick Start**

### Prerequisites
- Rust 1.70+ (for backend services)
- C compiler (GCC/Clang)
- Node.js 18+ (for development tools)
- Docker (optional, for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/ionxe.git
   cd ionxe
   ```

2. **Build the backend services**
   ```bash
   # Build all Rust services
   cargo build --release --workspace
   
   # Build C backend
   cd services/backend-c
   make
   cd ../..
   
   # Build individual services (optional)
   cargo build --release --manifest-path services/backend/Cargo.toml
   cargo build --release --manifest-path services/middleware/Cargo.toml
   cargo build --release --manifest-path services/ai-lighting/Cargo.toml
   cargo build --release --manifest-path services/live-audio/Cargo.toml
   cargo build --release --manifest-path services/show-automation/Cargo.toml
   ```

3. **Start the services**
   ```bash
   # Start all services
   ./scripts/dev_start.sh
   
   # Or start individually
   ./target/release/ionxe-backend &           # Port 8080
   ./services/backend-c/ionxe-backend-c &     # Port 8081
   ./target/release/ionxe-middleware &        # Port 8082
   ./target/release/ai-lighting &             # Port 8084
   ./target/release/live-audio &              # Port 8085
   ./target/release/show-automation &         # Port 8086
   ```

4. **Access the interfaces**
   - **Main Console**: `http://localhost:8082`
   - **Mobile App**: `http://localhost:8087`
   - **API Health**: `http://localhost:8080/health`

## 📁 **Project Structure**

```
ionxe/
├── bootloader/          # UEFI bootloader and early initialization
├── os/                  # Operating system kernel and drivers
│   ├── kernel/         # Core kernel functionality
│   ├── drivers/        # Hardware drivers
│   ├── hal/            # Hardware abstraction layer
│   ├── fs/             # File system
│   ├── net/            # Network stack
│   ├── audio/          # Audio subsystem
│   ├── graphics/       # Graphics and display
│   └── userland/       # User space applications
├── services/           # Backend services
│   ├── backend/        # Rust API server (Port 8080)
│   ├── backend-c/      # C hardware control (Port 8081)
│   ├── middleware/     # Request routing and protocol translation (Port 8082)
│   ├── ai-lighting/    # AI scene generation service (Port 8084)
│   ├── live-audio/     # Live audio analysis service (Port 8085)
│   ├── show-automation/# Show automation service (Port 8086)
│   ├── mobile-app/     # Mobile PWA service (Port 8087)
│   └── frontend/       # Web interface
├── hardware/           # Hardware specifications and research
├── docs/               # Documentation and guides
├── scripts/            # Build and development scripts
├── tools/              # Developer utilities
└── examples/           # Example configurations and demos
```

## 🎯 **Use Cases**

### **Professional Lighting**
- Theater and concert lighting control
- Architectural lighting systems
- Event and venue management
- Studio and broadcast lighting
- Live event production
- Corporate events and conferences
- DJ and nightclub lighting
- Automated show control
- AI-powered lighting design
- Mobile lighting control

### **Education & Training**
- Lighting design education
- Technical training programs
- Prototype development
- Research and experimentation

### **Integration & Automation**
- Home automation systems
- IoT lighting control
- Custom control solutions
- API-driven lighting applications
- Multi-user environments
- Enterprise lighting management
- Show automation and scheduling
- Music-reactive lighting
- AI-assisted lighting design
- Mobile and remote control

## 🤝 **Contributing**

We welcome contributions from the community! Here's how you can help:

### **Ways to Contribute**
- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Requests** - Suggest new functionality
- 📝 **Documentation** - Improve guides and API docs
- 🔧 **Code Contributions** - Submit pull requests
- 🧪 **Testing** - Help test new features and fixes

### **Getting Started**
1. Read our [Contributing Guide](CONTRIBUTING.md)
2. Check our [Code of Conduct](CODE_OF_CONDUCT.md)
3. Review the [Development Setup](docs/development/README.md)
4. Look at open issues or start a discussion

### **Development Workflow**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests if applicable
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📚 **Documentation**

- **[Architecture Overview](docs/architecture/README.md)** - System design and components
- **[API Reference](docs/api/README.md)** - Complete API documentation
- **[User Guide](docs/user/README.md)** - End-user documentation
- **[Developer Guide](docs/development/README.md)** - Development setup and guidelines
- **[Hardware Guide](docs/hardware/README.md)** - Hardware requirements and setup

## 🛡️ **Security**

We take security seriously. Please review our [Security Policy](SECURITY.md) and report any vulnerabilities to security@ionxe.dev.

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **ETC** - Inspiration from the Eos family of lighting consoles
- **Rust Community** - Excellent language and ecosystem
- **Open Source Community** - Countless libraries and tools
- **Contributors** - Everyone who helps make this project better

## 📞 **Support & Community**

- **GitHub Issues** - Bug reports and feature requests
- **Discussions** - Community discussions and Q&A
- **Discord** - Real-time chat and support
- **Email** - support@ionxe.dev

## 🗺️ **Roadmap**

See [ROADMAP.md](ROADMAP.md) for our development roadmap and upcoming features.

---

**Built with ❤️ by the IonXE community**

*This project is not affiliated with ETC or any commercial lighting console manufacturer. It is a community-driven, open-source alternative inspired by professional lighting control systems.*