# IonXe Live Audio Service

Real-time audio analysis and lighting synchronization service for the IonXe lighting control system.

## Features

### 🎵 Real-time Audio Analysis
- **Live Audio Capture**: Microphone and line input support
- **Beat Detection**: Real-time BPM tracking and beat detection
- **Spectral Analysis**: Frequency band analysis (bass, mid, treble)
- **Energy Analysis**: Audio energy and intensity measurement
- **Spectral Centroid**: Timbre analysis for musical characteristics

### 🎛️ Lighting Synchronization
- **Beat Sync**: Flash effects synchronized to beats
- **Frequency Sync**: Channel levels based on frequency bands
- **Energy Sync**: Wave effects based on audio energy
- **Strobe Sync**: Strobe effects triggered by audio peaks

### 📍 Sync Point Management
- **Manual Sync Points**: Add sync points during live performance
- **Cue Integration**: Link sync points to lighting cues
- **Transition Types**: Different transition effects for sync points
- **Real-time Management**: Add/remove sync points during performance

## API Endpoints

### Audio Control
- `POST /api/v1/audio/start` - Start audio analysis
- `POST /api/v1/audio/stop` - Stop audio analysis
- `POST /api/v1/audio/analysis` - Process audio analysis data
- `GET /api/v1/audio/status` - Get current audio status

### Sync Management
- `GET /api/v1/sync/points` - Get all sync points
- `POST /api/v1/sync/points` - Add new sync point
- `DELETE /api/v1/sync/points/:id` - Remove sync point
- `GET /api/v1/sync/config` - Get sync configuration
- `POST /api/v1/sync/config` - Update sync configuration

### Lighting Commands
- `POST /api/v1/lighting/command` - Send lighting command

## Usage

### Starting the Service
```bash
# Development
cargo run

# Production
docker build -t ionxe-live-audio .
docker run -p 8085:8085 ionxe-live-audio
```

### Frontend Integration
The service integrates with the IonXe frontend through the Live Audio module, providing:
- Real-time audio visualization
- Beat detection display
- Frequency band monitoring
- Sync point management
- Lighting effect controls

## Configuration

### Frequency Bands
- **Bass**: 20-250Hz (Red)
- **Mid**: 250-4000Hz (Green)  
- **Treble**: 4000-20000Hz (Blue)

### Sync Effects
- **Beat Sync**: Flash effects on beat detection
- **Frequency Sync**: Channel levels based on frequency bands
- **Energy Sync**: Wave effects based on audio energy
- **Strobe Sync**: Strobe effects on audio peaks

## Technical Details

### Audio Processing
- Uses Web Audio API for real-time analysis
- FFT size: 2048 samples
- Smoothing time constant: 0.8
- Beat detection threshold: 0.3

### Performance
- Real-time processing with <10ms latency
- Supports up to 24 channels of lighting control
- Memory efficient with circular buffers
- Thread-safe state management

## Integration

The Live Audio service integrates with:
- **IonXe Core**: Main lighting control system
- **DMX Output**: Real-time DMX transmission
- **Q List**: Cue management and playback
- **AI Lighting**: Intelligent scene generation

## Development

### Building
```bash
cargo build --release
```

### Testing
```bash
cargo test
```

### Running
```bash
cargo run
```

The service will be available at `http://localhost:8085`.
