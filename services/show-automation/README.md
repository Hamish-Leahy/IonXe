# IonXe Show Automation Service

A comprehensive show automation and scheduling system for the IonXe lighting control platform. This service provides professional-grade show control with time-based scheduling, external triggers, and complex show sequences.

## Features

### 🎭 Show Management
- **Show Creation**: Create, edit, and manage lighting shows
- **Show Playback**: Play, pause, stop, and record shows
- **Show Library**: Save and organize show collections
- **Show Templates**: Pre-built show templates for common scenarios

### ⏰ Show Scheduling
- **Time-based Scheduling**: Schedule shows to run at specific times
- **Recurring Shows**: Set up daily, weekly, or custom recurring schedules
- **Show Calendars**: Visual calendar view of scheduled shows
- **Automatic Execution**: Unattended show execution

### 🎬 Show Sequencer
- **Visual Timeline**: Drag-and-drop show sequence editor
- **Sequence Items**: Cues, delays, triggers, effects, and macros
- **Timing Control**: Precise timing for each sequence item
- **Real-time Preview**: Live preview of show sequences

### 🎛️ External Triggers
- **MIDI Triggers**: MIDI note and control change triggers
- **OSC Triggers**: Open Sound Control message triggers
- **Time Triggers**: Time-based show triggers
- **Manual Triggers**: Manual show control triggers
- **Cue Triggers**: Trigger shows from lighting cues

### 📊 Show Monitoring
- **Real-time Status**: Live show execution monitoring
- **Progress Tracking**: Show progress and timing information
- **Error Handling**: Comprehensive error reporting and recovery
- **Performance Metrics**: Show execution performance data

## API Endpoints

### Show Management
- `GET /api/v1/shows` - List all shows
- `POST /api/v1/shows` - Create a new show
- `GET /api/v1/shows/:id` - Get specific show
- `PUT /api/v1/shows/:id` - Update show
- `DELETE /api/v1/shows/:id` - Delete show

### Show Playback
- `POST /api/v1/shows/:id/play` - Start playing show
- `POST /api/v1/shows/:id/pause` - Pause show
- `POST /api/v1/shows/:id/stop` - Stop show

### Sequence Management
- `GET /api/v1/shows/:id/sequences` - Get show sequences
- `POST /api/v1/shows/:id/sequences` - Add sequence item
- `PUT /api/v1/shows/:id/sequences/:item_id` - Update sequence item
- `DELETE /api/v1/shows/:id/sequences/:item_id` - Delete sequence item

### Scheduled Shows
- `GET /api/v1/scheduled-shows` - List scheduled shows
- `POST /api/v1/scheduled-shows` - Create scheduled show
- `PUT /api/v1/scheduled-shows/:id` - Update scheduled show
- `DELETE /api/v1/scheduled-shows/:id` - Delete scheduled show

### Triggers
- `GET /api/v1/triggers` - List triggers
- `POST /api/v1/triggers` - Create trigger
- `PUT /api/v1/triggers/:id` - Update trigger
- `DELETE /api/v1/triggers/:id` - Delete trigger

### Executions
- `GET /api/v1/executions` - List active executions
- `GET /api/v1/executions/:id` - Get specific execution

## Data Structures

### Show
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "duration": 0,
  "status": "Stopped|Playing|Paused|Scheduled|Error",
  "sequences": [],
  "triggers": [],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

### SequenceItem
```json
{
  "id": "uuid",
  "item_type": "Cue|Delay|Trigger|Effect|Macro",
  "time": 0,
  "duration": 0,
  "action": "string",
  "parameters": {}
}
```

### ScheduledShow
```json
{
  "id": "uuid",
  "show_id": "uuid",
  "name": "string",
  "start_time": "datetime",
  "end_time": "datetime",
  "days_of_week": [1, 2, 3, 4, 5],
  "enabled": true,
  "created_at": "datetime"
}
```

### Trigger
```json
{
  "id": "uuid",
  "trigger_type": "Time|Midi|Osc|Manual|Cue",
  "name": "string",
  "parameters": {},
  "enabled": true
}
```

## Usage

### Starting the Service
```bash
# Development
cargo run

# Production
docker build -t ionxe-show-automation .
docker run -p 8086:8086 ionxe-show-automation
```

### Frontend Integration
The service integrates with the IonXe frontend through the Show Automation module, providing:
- Visual show sequencer
- Show scheduling interface
- External trigger configuration
- Real-time show monitoring

## Configuration

### Environment Variables
- `RUST_LOG`: Logging level (default: "show_automation=debug")
- `PORT`: Service port (default: 8086)

### Dependencies
- Rust 1.70+
- Tokio async runtime
- Chrono for date/time handling
- UUID for unique identifiers
- MIDI support for external triggers

## Examples

### Create a Show
```bash
curl -X POST http://localhost:8086/api/v1/shows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Concert Opening",
    "description": "Dynamic opening sequence for concert",
    "duration": 300000,
    "sequences": [],
    "triggers": []
  }'
```

### Schedule a Show
```bash
curl -X POST http://localhost:8086/api/v1/scheduled-shows \
  -H "Content-Type: application/json" \
  -d '{
    "show_id": "show-uuid",
    "name": "Daily Opening",
    "start_time": "2024-01-01T18:00:00Z",
    "days_of_week": [1, 2, 3, 4, 5],
    "enabled": true
  }'
```

### Add Sequence Item
```bash
curl -X POST http://localhost:8086/api/v1/shows/show-uuid/sequences \
  -H "Content-Type: application/json" \
  -d '{
    "item_type": "Cue",
    "time": 0,
    "duration": 5000,
    "action": "go_to_cue",
    "parameters": {
      "cue_id": "cue-uuid",
      "fade_time": 2000
    }
  }'
```

## Architecture

The Show Automation service is built with:
- **Rust**: High-performance backend with memory safety
- **Axum**: Modern web framework for HTTP APIs
- **Tokio**: Async runtime for concurrent operations
- **Chrono**: Date and time handling
- **UUID**: Unique identifier generation
- **MIDI**: External trigger support

## Integration

The service integrates with:
- **IonXe Core**: Main lighting control system
- **Q List System**: Cue management and execution
- **DMX Output**: Lighting control output
- **Live Audio**: Audio-reactive show triggers
- **AI Lighting**: AI-generated show content
