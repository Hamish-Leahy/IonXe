# IonXe AI Lighting System

A sophisticated AI-powered lighting control system that integrates with Mistral AI, music analysis, and 3D venue modeling to generate intelligent lighting scenes.

## Features

### 🎨 AI Scene Generation
- **Mistral AI Integration**: Uses Mistral's large language model to generate professional lighting scenes
- **Concept Processing**: Analyzes natural language descriptions to understand lighting requirements
- **Contextual Generation**: Incorporates music analysis and 3D venue data for enhanced scene creation

### 🎵 Music Analysis
- **Multi-format Support**: Analyzes WAV, MP3, MID, and MIDI files
- **Tempo Detection**: Automatic BPM detection using onset detection algorithms
- **Mood Analysis**: Spectral analysis to determine musical mood and energy
- **Harmonic Analysis**: Chord progression and key detection
- **Rhythm Pattern Recognition**: Identifies musical rhythm complexity

### 🏗️ 3D Venue Integration
- **Augment 3D Support**: Integrates with 3D venue models for spatial lighting design
- **Fixture Positioning**: Analyzes fixture placement and coverage
- **Spatial Effects**: Generates lighting effects based on venue geometry
- **Camera Angle Optimization**: Considers multiple viewing angles for lighting design

### 🎛️ Professional Lighting Control
- **DMX Integration**: Full 512-channel DMX control
- **Cue Management**: Complex lighting cues with timing and effects
- **Color Palettes**: Intelligent color scheme generation
- **Effect Engine**: Built-in lighting effects (strobe, chase, rainbow, pulse, wave)

## Architecture

### Backend Services
- **Rust-based API**: High-performance backend using Axum web framework
- **Modular Design**: Separate modules for AI engine, music analysis, and 3D integration
- **Async Processing**: Non-blocking I/O for optimal performance
- **Error Handling**: Comprehensive error handling and logging

### Frontend Interface
- **Modular JavaScript**: Clean, maintainable frontend architecture
- **Real-time Updates**: Live status updates and progress indicators
- **Responsive Design**: Works on desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status and timestamp.

### Concept Processing
```
POST /api/v1/ai-lighting/concept/process
Content-Type: application/json

{
  "concept": "Mysterious forest with moonlight filtering through trees"
}
```

### Music Analysis
```
POST /api/v1/ai-lighting/music/analyze
Content-Type: multipart/form-data

file: [audio file]
```

### 3D Venue Sync
```
POST /api/v1/ai-lighting/augment3d/sync
Content-Type: multipart/form-data

file: [3D model file]
```

### Scene Generation
```
POST /api/v1/ai-lighting/scenes/generate
Content-Type: application/json

{
  "concept": "Dynamic concert lighting",
  "music_context": { ... },
  "augment3d_context": { ... }
}
```

### Scene Management
```
GET /api/v1/ai-lighting/scenes          # List all scenes
GET /api/v1/ai-lighting/scenes/:id      # Get specific scene
PUT /api/v1/ai-lighting/scenes/:id      # Update scene
DELETE /api/v1/ai-lighting/scenes/:id   # Delete scene
POST /api/v1/ai-lighting/execute/:id    # Execute scene
```

## Installation

### Prerequisites
- Rust 1.70+ with Cargo
- Node.js 16+ (for frontend development)
- FFmpeg (for audio processing)
- Mistral API key

### Backend Setup
```bash
cd services/ai-lighting
cargo build --release
```

### Environment Variables
```bash
export MISTRAL_API_KEY="your-mistral-api-key"
export AUGMENT3D_ENDPOINT="http://localhost:8083"
```

### Running the Service
```bash
cargo run --release
```

The service will start on port 8084.

## Usage

### 1. Start the Backend
```bash
cd services/ai-lighting
cargo run --release
```

### 2. Open the Frontend
Navigate to `http://localhost:3000` and click on the "AI Lighting" tab.

### 3. Process a Concept
1. Enter a detailed lighting concept in the text area
2. Click "Process Concept" to analyze the concept
3. Review the generated mood, color scheme, and artistic notes

### 4. Analyze Music (Optional)
1. Upload an audio file (WAV, MP3, MID, MIDI)
2. Click "Analyze Music" to extract musical features
3. The system will analyze tempo, key, mood, and rhythm patterns

### 5. Sync 3D Venue (Optional)
1. Upload a 3D venue model (OBJ, FBX, GLTF)
2. Click "Sync 3D Venue" to analyze spatial layout
3. The system will identify fixture positions and spatial effects

### 6. Generate AI Scene
1. Click "Generate Scene" to create a lighting scene
2. The AI will generate 3-8 lighting cues based on your inputs
3. Review the generated scene in the preview panel

### 7. Execute Scene
1. Click "Execute Scene" to send DMX commands
2. The scene will be executed with proper timing and effects

## Configuration

### Mistral AI Settings
The system uses Mistral's API for AI generation. Configure the following parameters:

- **Model**: `mistral-large-latest`
- **Temperature**: 0.7 (creativity level)
- **Max Tokens**: 4000
- **Top P**: 0.9

### Music Analysis Settings
- **Sample Rate**: 44.1kHz (auto-resampled)
- **Window Size**: 4096 samples
- **Tempo Range**: 60-200 BPM
- **Max File Size**: 50MB

### 3D Venue Settings
- **Supported Formats**: OBJ, FBX, GLTF
- **Max File Size**: 100MB
- **Coordinate System**: Right-handed Y-up

## Development

### Project Structure
```
services/ai-lighting/
├── src/
│   ├── main.rs              # Main application and API routes
│   ├── ai_engine.rs         # Mistral AI integration
│   ├── music_analysis.rs    # Audio analysis algorithms
│   ├── augment3d.rs         # 3D venue integration
│   ├── concept_processor.rs # Natural language processing
│   └── lighting_generator.rs # DMX scene execution
├── Cargo.toml               # Dependencies
└── README.md               # This file
```

### Key Dependencies
- **axum**: Web framework
- **tokio**: Async runtime
- **serde**: Serialization
- **uuid**: Unique identifiers
- **hound**: WAV file processing
- **midly**: MIDI file processing
- **rustfft**: FFT for audio analysis
- **rubato**: Audio resampling
- **reqwest**: HTTP client for Mistral API

### Testing
Run the test suite:
```bash
cargo test
```

Use the test page:
```bash
open test-ai-lighting.html
```

## Performance

### Benchmarks
- **Concept Processing**: ~2-3 seconds
- **Music Analysis**: ~5-10 seconds (depending on file size)
- **3D Venue Sync**: ~3-5 seconds
- **Scene Generation**: ~10-15 seconds
- **Scene Execution**: Real-time DMX output

### Optimization
- **Caching**: Concept and music analysis results are cached
- **Async Processing**: Non-blocking I/O for all operations
- **Memory Management**: Efficient handling of large audio files
- **Error Recovery**: Graceful handling of API failures

## Troubleshooting

### Common Issues

#### Backend Won't Start
- Check if port 8084 is available
- Verify Rust and Cargo are installed
- Check environment variables

#### Music Analysis Fails
- Ensure FFmpeg is installed
- Check file format compatibility
- Verify file size limits

#### AI Generation Fails
- Verify Mistral API key is valid
- Check internet connectivity
- Review API rate limits

#### Frontend Not Loading
- Ensure backend is running on port 8084
- Check browser console for errors
- Verify CORS settings

### Debug Mode
Enable debug logging:
```bash
RUST_LOG=debug cargo run
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test cases

## Roadmap

### Upcoming Features
- [ ] Real-time music synchronization
- [ ] Advanced 3D lighting simulation
- [ ] Machine learning model training
- [ ] Cloud deployment support
- [ ] Mobile app integration
- [ ] Multi-venue support
- [ ] Collaborative editing
- [ ] Version control for scenes