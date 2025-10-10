# AI Lighting System

The AI Lighting System is an intelligent lighting control feature for IonXe that integrates with Mistral AI, music analysis, and Augment 3D services to automatically generate sophisticated lighting designs.

## Features

### 🤖 AI-Powered Lighting Generation
- **Mistral AI Integration**: Uses Mistral's large language model to understand concepts and generate lighting designs
- **Intelligent Cue Generation**: Creates complex lighting cues with proper timing, effects, and color palettes
- **Artistic Interpretation**: Analyzes concepts and provides artistic direction for lighting design

### 🎵 Music Analysis
- **Audio Processing**: Analyzes WAV, MP3, and MIDI files for musical characteristics
- **Tempo Detection**: Automatically detects BPM and rhythm patterns
- **Mood Analysis**: Determines musical mood and dynamics for lighting synchronization
- **Harmonic Analysis**: Analyzes chord progressions and key signatures

### 🎨 Concept Processing
- **Natural Language Understanding**: Interprets lighting concepts from text descriptions
- **Color Theory Integration**: Suggests appropriate color palettes based on concepts
- **Artistic Analysis**: Provides detailed artistic interpretation and suggestions
- **Lighting Script Generation**: Creates complete lighting scripts with timing and cues

### 🌐 Augment 3D Integration
- **3D Venue Modeling**: Integrates with 3D venue models for spatial lighting control
- **Fixture Positioning**: Automatically positions and orients fixtures in 3D space
- **Spatial Effects**: Generates 3D-aware lighting effects and movements
- **Coverage Analysis**: Analyzes lighting coverage and suggests optimizations

### 🎭 Professional Lighting Effects
- **Strobe Effects**: Synchronized strobe lighting with customizable speed and intensity
- **Chase Effects**: Moving light patterns across fixture arrays
- **Rainbow Effects**: Smooth color transitions across the spectrum
- **Pulse Effects**: Breathing light patterns with customizable timing
- **Wave Effects**: Undulating light patterns with amplitude and frequency control
- **Custom Effects**: Extensible system for custom lighting effects

## Architecture

### Services
- **AI Engine**: Core Mistral AI integration for intelligent lighting generation
- **Music Analyzer**: Audio processing and musical analysis
- **Concept Processor**: Natural language processing for lighting concepts
- **Augment 3D Service**: 3D venue integration and spatial effects
- **Lighting Generator**: DMX control and effect execution

### API Endpoints
- `GET /api/v1/ai-lighting/scenes` - List all AI-generated scenes
- `POST /api/v1/ai-lighting/scenes` - Create new scene
- `GET /api/v1/ai-lighting/scenes/:id` - Get specific scene
- `PUT /api/v1/ai-lighting/scenes/:id` - Update scene
- `DELETE /api/v1/ai-lighting/scenes/:id` - Delete scene
- `POST /api/v1/ai-lighting/scenes/:id/generate` - Generate AI lighting for scene
- `POST /api/v1/ai-lighting/music/analyze` - Analyze music file
- `POST /api/v1/ai-lighting/concept/process` - Process lighting concept
- `POST /api/v1/ai-lighting/augment3d/sync` - Sync 3D venue model
- `POST /api/v1/ai-lighting/execute/:id` - Execute lighting scene

## Setup

### Prerequisites
- Rust 1.75+
- Mistral API key
- Docker (optional)

### Environment Variables
```bash
MISTRAL_API_KEY=your-mistral-api-key
AUGMENT3D_ENDPOINT=http://localhost:8083
BACKEND_URL=http://localhost:8082
```

### Running with Docker
```bash
# Set your Mistral API key
export MISTRAL_API_KEY=your-mistral-api-key

# Start all services including AI Lighting
docker-compose up --build
```

### Running Locally
```bash
cd services/ai-lighting
cargo run
```

## Usage

### 1. Concept Input
Enter a lighting concept in natural language:
```
"Mysterious forest with moonlight filtering through trees"
"Energetic dance party with pulsing rainbow lights"
"Romantic sunset with warm golden tones"
```

### 2. Music Analysis
Upload a music file (WAV, MP3, MIDI) for analysis:
- The system will analyze tempo, mood, dynamics, and rhythm
- Results are used to inform lighting timing and intensity

### 3. 3D Venue Integration
Upload a 3D venue model (OBJ, FBX, GLTF):
- Fixtures are automatically positioned in 3D space
- Spatial effects are generated based on venue layout
- Coverage analysis ensures optimal lighting distribution

### 4. AI Scene Generation
Click "Generate Scene" to create an AI-powered lighting design:
- Mistral AI processes the concept, music, and 3D context
- Generates multiple lighting cues with proper timing
- Creates color palettes and effects that match the artistic intent

### 5. Scene Execution
Execute the generated scene:
- DMX commands are sent to the lighting backend
- Effects are applied with proper timing and transitions
- Real-time control and monitoring

## Example Workflows

### Concert Lighting
1. Upload concert music file
2. Enter concept: "High-energy rock concert with dynamic lighting"
3. Sync 3D venue model of the concert hall
4. Generate AI scene with strobe effects, color chases, and audience lighting
5. Execute synchronized lighting show

### Theater Production
1. Enter concept: "Shakespeare's Macbeth - dark and foreboding"
2. Upload orchestral score for mood analysis
3. Sync theater venue model
4. Generate atmospheric lighting with deep blues, purples, and dramatic shadows
5. Create lighting script for the entire production

### Corporate Event
1. Enter concept: "Modern corporate presentation with clean, professional lighting"
2. Upload background music
3. Sync conference room 3D model
4. Generate subtle, professional lighting with smooth transitions
5. Execute presentation lighting

## Technical Details

### AI Integration
- Uses Mistral's `mistral-large-latest` model for intelligent lighting generation
- Processes complex prompts with context from music and 3D data
- Generates structured JSON responses for lighting cues and effects

### Music Analysis
- Supports WAV, MP3, and MIDI file formats
- Uses FFT analysis for spectral mood detection
- Implements onset detection for tempo analysis
- Analyzes harmonic content for key and chord progression detection

### 3D Integration
- Supports OBJ, FBX, and GLTF 3D model formats
- Automatic fixture positioning and orientation
- Spatial effect generation based on venue geometry
- Coverage analysis and optimization suggestions

### DMX Control
- Full 512-channel DMX support
- Real-time effect execution
- Smooth fade transitions
- Grand master control integration

## Contributing

The AI Lighting system is designed to be extensible:

1. **Custom Effects**: Add new lighting effects in `lighting_generator.rs`
2. **Music Analysis**: Extend music analysis in `music_analysis.rs`
3. **AI Prompts**: Customize AI prompts in `ai_engine.rs`
4. **3D Integration**: Add new 3D features in `augment3d.rs`

## License

Part of the IonXe project. See main project license for details.
