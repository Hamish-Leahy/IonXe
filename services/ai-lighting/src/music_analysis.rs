use crate::MusicContext;
use anyhow::Result;
use hound::{WavReader, WavSpec};
use midly::{Smf, TrackEventKind};
use rubato::{Resampler, SincFixedIn, InterpolationType, InterpolationParameters};
use rustfft::{FftPlanner, num_complex::Complex};
use std::fs::File;
use std::io::BufReader;
use std::path::Path;

pub struct MusicAnalyzer {
    fft_planner: FftPlanner<f32>,
}

impl MusicAnalyzer {
    pub fn new() -> Self {
        Self {
            fft_planner: FftPlanner::new(),
        }
    }

    pub async fn analyze_music_file(&self, file_path: &str) -> Result<MusicContext> {
        let path = Path::new(file_path);
        let extension = path.extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();

        match extension.as_str() {
            "wav" => self.analyze_wav_file(file_path).await,
            "mp3" => self.analyze_mp3_file(file_path).await,
            "mid" | "midi" => self.analyze_midi_file(file_path).await,
            _ => Err(anyhow::anyhow!("Unsupported file format: {}", extension)),
        }
    }

    async fn analyze_wav_file(&self, file_path: &str) -> Result<MusicContext> {
        let mut reader = WavReader::open(file_path)?;
        let spec = reader.spec();
        
        // Read audio data
        let samples: Vec<f32> = reader
            .samples::<i16>()
            .map(|s| s.unwrap() as f32 / 32768.0)
            .collect();

        self.analyze_audio_data(&samples, spec.sample_rate as f32).await
    }

    async fn analyze_mp3_file(&self, file_path: &str) -> Result<MusicContext> {
        // For MP3, we'd need to use a library like minimp3 or ffmpeg
        // This is a simplified implementation
        Err(anyhow::anyhow!("MP3 analysis not yet implemented"))
    }

    async fn analyze_midi_file(&self, file_path: &str) -> Result<MusicContext> {
        let data = std::fs::read(file_path)?;
        let smf = Smf::parse(&data)?;

        let mut tempo = 120.0; // Default tempo
        let mut key = "C major".to_string();
        let mut notes = Vec::new();
        let mut velocities = Vec::new();

        for track in &smf.tracks {
            for event in track {
                match &event.kind {
                    TrackEventKind::Midi { channel: _, message } => {
                        match message {
                            midly::MidiMessage::NoteOn { key: note, vel } => {
                                if *vel > 0 {
                                    notes.push(*note as u8);
                                    velocities.push(*vel as u8);
                                }
                            }
                            midly::MidiMessage::NoteOff { key: note, vel: _ } => {
                                // Handle note off
                            }
                            _ => {}
                        }
                    }
                    TrackEventKind::Meta { kind } => {
                        match kind {
                            midly::MetaMessage::Tempo(tempo_microseconds) => {
                                tempo = 60_000_000.0 / *tempo_microseconds as f32;
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
        }

        // Analyze MIDI data
        let mood = self.analyze_midi_mood(&notes, &velocities);
        let dynamics = self.calculate_dynamics(&velocities);
        let rhythm_pattern = self.analyze_rhythm_pattern(&notes);
        let harmonic_progression = self.analyze_harmonic_progression(&notes);

        Ok(MusicContext {
            tempo,
            key,
            mood,
            dynamics,
            rhythm_pattern,
            harmonic_progression,
        })
    }

    async fn analyze_audio_data(&self, samples: &[f32], sample_rate: f32) -> Result<MusicContext> {
        // Resample to 44.1kHz if needed
        let target_sample_rate = 44100.0;
        let resampled = if (sample_rate - target_sample_rate).abs() > 1.0 {
            self.resample_audio(samples, sample_rate, target_sample_rate)?
        } else {
            samples.to_vec()
        };

        // Calculate tempo using onset detection
        let tempo = self.detect_tempo(&resampled, target_sample_rate).await?;
        
        // Analyze spectral content for mood
        let mood = self.analyze_spectral_mood(&resampled, target_sample_rate).await?;
        
        // Calculate dynamics (RMS energy)
        let dynamics = self.calculate_rms_dynamics(&resampled);
        
        // Analyze rhythm pattern
        let rhythm_pattern = self.analyze_rhythm_from_audio(&resampled, target_sample_rate).await?;
        
        // Analyze harmonic content
        let harmonic_progression = self.analyze_harmonic_content(&resampled, target_sample_rate).await?;
        
        // Detect key (simplified)
        let key = self.detect_key(&resampled, target_sample_rate).await?;

        Ok(MusicContext {
            tempo,
            key,
            mood,
            dynamics,
            rhythm_pattern,
            harmonic_progression,
        })
    }

    fn resample_audio(&self, samples: &[f32], from_rate: f32, to_rate: f32) -> Result<Vec<f32>> {
        let ratio = to_rate / from_rate;
        let params = InterpolationParameters {
            sinc_len: 256,
            f_cutoff: 0.95,
            interpolation: InterpolationType::Linear,
            oversampling_factor: 256,
            window: rubato::WindowFunction::BlackmanHarris2,
        };

        let mut resampler = SincFixedIn::<f32>::new(
            ratio,
            2.0,
            params,
            1024,
            1,
        )?;

        let input = vec![samples.to_vec()];
        let output = resampler.process(&input, None)?;
        
        Ok(output[0].clone())
    }

    async fn detect_tempo(&self, samples: &[f32], sample_rate: f32) -> Result<f32> {
        // Simple tempo detection using onset detection and autocorrelation
        let onsets = self.detect_onsets(samples, sample_rate).await?;
        
        if onsets.len() < 2 {
            return Ok(120.0); // Default tempo
        }

        // Calculate intervals between onsets
        let mut intervals = Vec::new();
        for i in 1..onsets.len() {
            intervals.push(onsets[i] - onsets[i - 1]);
        }

        // Find most common interval (simplified)
        let avg_interval = intervals.iter().sum::<f32>() / intervals.len() as f32;
        let tempo = 60.0 / (avg_interval / sample_rate);

        Ok(tempo.max(60.0).min(200.0)) // Clamp to reasonable range
    }

    async fn detect_onsets(&self, samples: &[f32], sample_rate: f32) -> Result<Vec<f32>> {
        let window_size = (sample_rate * 0.1) as usize; // 100ms windows
        let hop_size = window_size / 4;
        let mut onsets = Vec::new();

        for i in (0..samples.len() - window_size).step_by(hop_size) {
            let window = &samples[i..i + window_size];
            let energy = window.iter().map(|x| x * x).sum::<f32>();
            
            // Simple energy-based onset detection
            if i > 0 {
                let prev_window = &samples[i - hop_size..i - hop_size + window_size];
                let prev_energy = prev_window.iter().map(|x| x * x).sum::<f32>();
                
                if energy > prev_energy * 1.5 {
                    onsets.push(i as f32 / sample_rate);
                }
            }
        }

        Ok(onsets)
    }

    async fn analyze_spectral_mood(&self, samples: &[f32], sample_rate: f32) -> Result<String> {
        // Analyze frequency spectrum to determine mood
        let window_size = 4096;
        let mut spectral_centroid = 0.0;
        let mut spectral_rolloff = 0.0;
        let mut zero_crossing_rate = 0.0;

        for chunk in samples.chunks(window_size) {
            if chunk.len() == window_size {
                let mut fft_input: Vec<Complex<f32>> = chunk.iter().map(|&x| Complex::new(x, 0.0)).collect();
                let fft = self.fft_planner.plan_fft_forward(window_size);
                fft.process(&mut fft_input);

                // Calculate spectral features
                let magnitude: Vec<f32> = fft_input.iter().map(|c| c.norm()).collect();
                
                // Spectral centroid
                let mut weighted_sum = 0.0;
                let mut magnitude_sum = 0.0;
                for (i, &mag) in magnitude.iter().enumerate() {
                    let freq = (i as f32 * sample_rate) / (window_size as f32);
                    weighted_sum += freq * mag;
                    magnitude_sum += mag;
                }
                spectral_centroid += if magnitude_sum > 0.0 { weighted_sum / magnitude_sum } else { 0.0 };

                // Zero crossing rate
                let crossings = chunk.windows(2).filter(|w| (w[0] >= 0.0) != (w[1] >= 0.0)).count();
                zero_crossing_rate += crossings as f32 / chunk.len() as f32;
            }
        }

        let num_windows = samples.len() / window_size;
        spectral_centroid /= num_windows as f32;
        zero_crossing_rate /= num_windows as f32;

        // Determine mood based on spectral features
        let mood = if spectral_centroid > 2000.0 && zero_crossing_rate > 0.1 {
            "energetic"
        } else if spectral_centroid < 1000.0 && zero_crossing_rate < 0.05 {
            "calm"
        } else if spectral_centroid > 1500.0 {
            "bright"
        } else {
            "mellow"
        };

        Ok(mood.to_string())
    }

    fn calculate_rms_dynamics(&self, samples: &[f32]) -> f32 {
        let rms: f32 = samples.iter().map(|x| x * x).sum::<f32>() / samples.len() as f32;
        rms.sqrt()
    }

    async fn analyze_rhythm_from_audio(&self, samples: &[f32], sample_rate: f32) -> Result<String> {
        // Analyze rhythm pattern from audio
        let onsets = self.detect_onsets(samples, sample_rate).await?;
        
        if onsets.len() < 4 {
            return Ok("simple".to_string());
        }

        // Calculate intervals between onsets
        let mut intervals = Vec::new();
        for i in 1..onsets.len() {
            intervals.push(onsets[i] - onsets[i - 1]);
        }

        // Analyze rhythm complexity
        let avg_interval = intervals.iter().sum::<f32>() / intervals.len() as f32;
        let variance = intervals.iter()
            .map(|&x| (x - avg_interval).powi(2))
            .sum::<f32>() / intervals.len() as f32;

        let rhythm_pattern = if variance < 0.1 {
            "regular"
        } else if variance < 0.5 {
            "syncopated"
        } else {
            "complex"
        };

        Ok(rhythm_pattern.to_string())
    }

    async fn analyze_harmonic_content(&self, samples: &[f32], sample_rate: f32) -> Result<Vec<String>> {
        // Simplified harmonic analysis
        let mut harmonic_progression = Vec::new();
        
        // Analyze in chunks
        let chunk_size = 8192;
        for chunk in samples.chunks(chunk_size) {
            if chunk.len() == chunk_size {
                let mut fft_input: Vec<Complex<f32>> = chunk.iter().map(|&x| Complex::new(x, 0.0)).collect();
                let fft = self.fft_planner.plan_fft_forward(chunk_size);
                fft.process(&mut fft_input);

                // Find peak frequencies
                let magnitude: Vec<f32> = fft_input.iter().map(|c| c.norm()).collect();
                let mut peaks = Vec::new();
                
                for (i, &mag) in magnitude.iter().enumerate() {
                    if i > 0 && i < magnitude.len() - 1 {
                        if mag > magnitude[i - 1] && mag > magnitude[i + 1] && mag > 0.1 {
                            let freq = (i as f32 * sample_rate) / (chunk_size as f32);
                            peaks.push(freq);
                        }
                    }
                }

                // Determine chord based on peaks (simplified)
                if !peaks.is_empty() {
                    let fundamental = peaks[0];
                    if fundamental > 80.0 && fundamental < 200.0 {
                        harmonic_progression.push("C".to_string());
                    } else if fundamental > 200.0 && fundamental < 300.0 {
                        harmonic_progression.push("G".to_string());
                    } else {
                        harmonic_progression.push("Am".to_string());
                    }
                }
            }
        }

        Ok(harmonic_progression)
    }

    async fn detect_key(&self, samples: &[f32], sample_rate: f32) -> Result<String> {
        // Simplified key detection
        let harmonic_content = self.analyze_harmonic_content(samples, sample_rate).await?;
        
        if harmonic_content.is_empty() {
            return Ok("C major".to_string());
        }

        // Count most common chord
        let mut chord_counts = std::collections::HashMap::new();
        for chord in &harmonic_content {
            *chord_counts.entry(chord.clone()).or_insert(0) += 1;
        }

        let most_common = chord_counts
            .iter()
            .max_by_key(|(_, count)| *count)
            .map(|(chord, _)| chord.clone())
            .unwrap_or_else(|| "C".to_string());

        Ok(format!("{} major", most_common))
    }

    fn analyze_midi_mood(&self, notes: &[u8], velocities: &[u8]) -> String {
        if notes.is_empty() {
            return "neutral".to_string();
        }

        let avg_velocity = velocities.iter().sum::<u8>() as f32 / velocities.len() as f32;
        let note_range = notes.iter().max().unwrap() - notes.iter().min().unwrap();

        if avg_velocity > 100.0 && note_range > 24 {
            "energetic"
        } else if avg_velocity < 60.0 && note_range < 12 {
            "calm"
        } else if avg_velocity > 80.0 {
            "bright"
        } else {
            "mellow"
        }.to_string()
    }

    fn calculate_dynamics(&self, velocities: &[u8]) -> f32 {
        if velocities.is_empty() {
            return 0.5;
        }
        
        let avg_velocity = velocities.iter().sum::<u8>() as f32 / velocities.len() as f32;
        avg_velocity / 127.0
    }

    fn analyze_rhythm_pattern(&self, notes: &[u8]) -> String {
        if notes.len() < 4 {
            return "simple".to_string();
        }

        // Analyze note density and timing patterns
        let density = notes.len() as f32 / 100.0; // Notes per 100 time units
        
        if density > 2.0 {
            "complex"
        } else if density > 1.0 {
            "syncopated"
        } else {
            "simple"
        }.to_string()
    }

    fn analyze_harmonic_progression(&self, notes: &[u8]) -> Vec<String> {
        if notes.is_empty() {
            return vec!["C".to_string()];
        }

        // Simplified chord analysis based on note frequencies
        let mut chord_counts = std::collections::HashMap::new();
        
        // Group notes into chords (simplified)
        for chunk in notes.chunks(3) {
            if chunk.len() >= 2 {
                let root = chunk[0] % 12;
                let chord_name = match root {
                    0 => "C", 2 => "D", 4 => "E", 5 => "F", 7 => "G", 9 => "A", 11 => "B",
                    _ => "C",
                };
                chord_counts.entry(chord_name.to_string()).or_insert(0) += 1;
            }
        }

        chord_counts
            .into_iter()
            .map(|(chord, _)| chord)
            .collect()
    }
}
