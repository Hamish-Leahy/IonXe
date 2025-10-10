use crate::{AILightingScene, LightingCue, LightingEffect, EffectType, RgbColor};
use anyhow::Result;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

pub struct LightingGenerator {
    client: Client,
    backend_url: String,
}

impl LightingGenerator {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            backend_url: "http://127.0.0.1:8082".to_string(), // Middleware URL
        }
    }

    pub async fn execute_scene(&self, scene: &AILightingScene) -> Result<ExecutionResult> {
        let mut results = Vec::new();
        let mut total_duration = 0u32;

        for (index, cue) in scene.lighting_cues.iter().enumerate() {
            let cue_result = self.execute_cue(cue, index).await?;
            results.push(cue_result.clone());
            total_duration += cue.timing.fade_in_ms + cue.timing.hold_ms + cue.timing.fade_out_ms;
        }

        Ok(ExecutionResult {
            scene_id: scene.id,
            scene_name: scene.name.clone(),
            cues_executed: results.len(),
            total_duration_ms: total_duration,
            cue_results: results,
            success: true,
        })
    }

    async fn execute_cue(&self, cue: &LightingCue, index: usize) -> Result<CueExecutionResult> {
        let start_time = std::time::Instant::now();

        // Apply fade in delay
        if cue.timing.delay_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(cue.timing.delay_ms as u64)).await;
        }

        // Send DMX levels to backend
        self.send_dmx_levels(&cue.dmx_levels).await?;

        // Apply fade in
        if cue.timing.fade_in_ms > 0 {
            self.apply_fade_in(cue, cue.timing.fade_in_ms).await?;
        }

        // Apply effects
        for effect in &cue.effects {
            self.apply_effect(effect, &cue.dmx_levels).await?;
        }

        // Hold the cue
        if cue.timing.hold_ms > 0 {
            tokio::time::sleep(tokio::time::Duration::from_millis(cue.timing.hold_ms as u64)).await;
        }

        // Apply fade out
        if cue.timing.fade_out_ms > 0 {
            self.apply_fade_out(cue, cue.timing.fade_out_ms).await?;
        }

        let execution_time = start_time.elapsed();

        Ok(CueExecutionResult {
            cue_id: cue.id,
            cue_name: cue.name.clone(),
            cue_index: index,
            execution_time_ms: execution_time.as_millis() as u32,
            success: true,
            dmx_levels_sent: cue.dmx_levels.len(),
            effects_applied: cue.effects.len(),
        })
    }

    async fn send_dmx_levels(&self, levels: &[u8]) -> Result<()> {
        let response = self.client
            .put(&format!("{}/api/v1/dimmers/levels", self.backend_url))
            .body(levels.to_vec())
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Failed to send DMX levels: {}", response.status()));
        }

        Ok(())
    }

    async fn apply_fade_in(&self, cue: &LightingCue, fade_time_ms: u32) -> Result<()> {
        let steps = 20; // Number of fade steps
        let step_duration = fade_time_ms / steps;
        let step_size = 255.0 / steps as f32;

        for step in 1..=steps {
            let intensity = (step as f32 * step_size) as u8;
            let faded_levels: Vec<u8> = cue.dmx_levels
                .iter()
                .map(|&level| ((level as f32 * intensity as f32) / 255.0) as u8)
                .collect();

            self.send_dmx_levels(&faded_levels).await?;
            tokio::time::sleep(tokio::time::Duration::from_millis(step_duration as u64)).await;
        }

        Ok(())
    }

    async fn apply_fade_out(&self, cue: &LightingCue, fade_time_ms: u32) -> Result<()> {
        let steps = 20; // Number of fade steps
        let step_duration = fade_time_ms / steps;
        let step_size = 255.0 / steps as f32;

        for step in (0..steps).rev() {
            let intensity = (step as f32 * step_size) as u8;
            let faded_levels: Vec<u8> = cue.dmx_levels
                .iter()
                .map(|&level| ((level as f32 * intensity as f32) / 255.0) as u8)
                .collect();

            self.send_dmx_levels(&faded_levels).await?;
            tokio::time::sleep(tokio::time::Duration::from_millis(step_duration as u64)).await;
        }

        Ok(())
    }

    async fn apply_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        match &effect.effect_type {
            EffectType::Strobe => self.apply_strobe_effect(effect, base_levels).await,
            EffectType::Chase => self.apply_chase_effect(effect, base_levels).await,
            EffectType::Rainbow => self.apply_rainbow_effect(effect, base_levels).await,
            EffectType::Pulse => self.apply_pulse_effect(effect, base_levels).await,
            EffectType::Wave => self.apply_wave_effect(effect, base_levels).await,
            EffectType::Custom(name) => self.apply_custom_effect(name, effect, base_levels).await,
        }
    }

    async fn apply_strobe_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let speed = effect.parameters.get("speed").unwrap_or(&1.0);
        let strobe_duration = (1000.0 / speed) as u64; // Convert to milliseconds
        let cycles = 10; // Number of strobe cycles

        for _ in 0..cycles {
            // Strobe on
            let strobe_levels: Vec<u8> = base_levels
                .iter()
                .map(|&level| (level as f32 * effect.intensity) as u8)
                .collect();
            self.send_dmx_levels(&strobe_levels).await?;

            tokio::time::sleep(tokio::time::Duration::from_millis(strobe_duration / 2)).await;

            // Strobe off
            let off_levels = vec![0u8; base_levels.len()];
            self.send_dmx_levels(&off_levels).await?;

            tokio::time::sleep(tokio::time::Duration::from_millis(strobe_duration / 2)).await;
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    async fn apply_chase_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let speed = effect.parameters.get("speed").unwrap_or(&1.0);
        let direction = effect.parameters.get("direction").unwrap_or(&1.0);
        let chase_duration = (1000.0 / speed) as u64;
        let group_size = 6; // Number of channels per chase group

        for group in 0..(base_levels.len() / group_size) {
            let mut chase_levels = vec![0u8; base_levels.len()];
            
            // Set the current group to full intensity
            let start_idx = group * group_size;
            let end_idx = (start_idx + group_size).min(base_levels.len());
            
            for i in start_idx..end_idx {
                chase_levels[i] = (base_levels[i] as f32 * effect.intensity) as u8;
            }

            self.send_dmx_levels(&chase_levels).await?;
            tokio::time::sleep(tokio::time::Duration::from_millis(chase_duration)).await;
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    async fn apply_rainbow_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let speed = effect.parameters.get("speed").unwrap_or(&1.0);
        let duration = (2000.0 / speed) as u64; // 2 seconds per cycle
        let steps = 20;
        let step_duration = duration / steps;

        for step in 0..steps {
            let hue = (step as f32 / steps as f32) * 360.0;
            let rgb = self.hsv_to_rgb(hue, 1.0, effect.intensity);
            
            let rainbow_levels: Vec<u8> = base_levels
                .chunks(3) // Assume RGB fixtures
                .flat_map(|chunk| {
                    if chunk.len() >= 3 {
                        vec![
                            (chunk[0] as f32 * rgb.0) as u8,
                            (chunk[1] as f32 * rgb.1) as u8,
                            (chunk[2] as f32 * rgb.2) as u8,
                        ]
                    } else {
                        chunk.to_vec()
                    }
                })
                .collect();

            self.send_dmx_levels(&rainbow_levels).await?;
            tokio::time::sleep(tokio::time::Duration::from_millis(step_duration)).await;
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    async fn apply_pulse_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let speed = effect.parameters.get("speed").unwrap_or(&1.0);
        let cycles = 5;
        let cycle_duration = (2000.0 / speed) as u64;
        let steps = 20;
        let step_duration = cycle_duration / steps;

        for _ in 0..cycles {
            // Pulse up
            for step in 0..steps {
                let intensity = (step as f32 / steps as f32) * effect.intensity;
                let pulse_levels: Vec<u8> = base_levels
                    .iter()
                    .map(|&level| (level as f32 * intensity) as u8)
                    .collect();

                self.send_dmx_levels(&pulse_levels).await?;
                tokio::time::sleep(tokio::time::Duration::from_millis(step_duration)).await;
            }

            // Pulse down
            for step in (0..steps).rev() {
                let intensity = (step as f32 / steps as f32) * effect.intensity;
                let pulse_levels: Vec<u8> = base_levels
                    .iter()
                    .map(|&level| (level as f32 * intensity) as u8)
                    .collect();

                self.send_dmx_levels(&pulse_levels).await?;
                tokio::time::sleep(tokio::time::Duration::from_millis(step_duration)).await;
            }
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    async fn apply_wave_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let speed = effect.parameters.get("speed").unwrap_or(&1.0);
        let amplitude = effect.parameters.get("amplitude").unwrap_or(&0.5);
        let frequency = effect.parameters.get("frequency").unwrap_or(&2.0);
        let duration = (3000.0 / speed) as u64;
        let steps = 30;
        let step_duration = duration / steps;

        for step in 0..steps {
            let time = step as f32 / steps as f32 * 2.0 * std::f32::consts::PI * frequency;
            let wave_intensity = (time.sin() * amplitude + 1.0) / 2.0 * effect.intensity;
            
            let wave_levels: Vec<u8> = base_levels
                .iter()
                .map(|&level| (level as f32 * wave_intensity) as u8)
                .collect();

            self.send_dmx_levels(&wave_levels).await?;
            tokio::time::sleep(tokio::time::Duration::from_millis(step_duration)).await;
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    async fn apply_custom_effect(&self, name: &str, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        // For custom effects, we'll implement a basic pattern
        // In a real system, this would be more sophisticated
        match name {
            "sparkle" => self.apply_sparkle_effect(effect, base_levels).await,
            "breath" => self.apply_breath_effect(effect, base_levels).await,
            _ => {
                // Default to a simple intensity modulation
                let intensity = effect.parameters.get("intensity").unwrap_or(&effect.intensity);
                let modulated_levels: Vec<u8> = base_levels
                    .iter()
                    .map(|&level| (level as f32 * intensity) as u8)
                    .collect();
                self.send_dmx_levels(&modulated_levels).await?;
                Ok(())
            }
        }
    }

    async fn apply_sparkle_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let sparkle_count = effect.parameters.get("count").unwrap_or(&10.0) as usize;
        let sparkle_duration = 100; // milliseconds

        for _ in 0..sparkle_count {
            let mut sparkle_levels = vec![0u8; base_levels.len()];
            
            // Randomly select channels to sparkle
            for _ in 0..(base_levels.len() / 10) {
                let channel = fastrand::usize(..base_levels.len());
                sparkle_levels[channel] = (base_levels[channel] as f32 * effect.intensity) as u8;
            }

            self.send_dmx_levels(&sparkle_levels).await?;
            tokio::time::sleep(tokio::time::Duration::from_millis(sparkle_duration)).await;
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    async fn apply_breath_effect(&self, effect: &LightingEffect, base_levels: &[u8]) -> Result<()> {
        let cycles = 3;
        let cycle_duration = 2000; // milliseconds
        let steps = 40;
        let step_duration = cycle_duration / steps;

        for _ in 0..cycles {
            // Breathe in
            for step in 0..steps {
                let intensity = (step as f32 / steps as f32) * effect.intensity;
                let breath_levels: Vec<u8> = base_levels
                    .iter()
                    .map(|&level| (level as f32 * intensity) as u8)
                    .collect();

                self.send_dmx_levels(&breath_levels).await?;
                tokio::time::sleep(tokio::time::Duration::from_millis(step_duration as u64)).await;
            }

            // Breathe out
            for step in (0..steps).rev() {
                let intensity = (step as f32 / steps as f32) * effect.intensity;
                let breath_levels: Vec<u8> = base_levels
                    .iter()
                    .map(|&level| (level as f32 * intensity) as u8)
                    .collect();

                self.send_dmx_levels(&breath_levels).await?;
                tokio::time::sleep(tokio::time::Duration::from_millis(step_duration as u64)).await;
            }
        }

        // Return to base levels
        self.send_dmx_levels(base_levels).await?;
        Ok(())
    }

    fn hsv_to_rgb(&self, h: f32, s: f32, v: f32) -> (f32, f32, f32) {
        let c = v * s;
        let x = c * (1.0 - ((h / 60.0) % 2.0 - 1.0).abs());
        let m = v - c;

        let (r, g, b) = if h < 60.0 {
            (c, x, 0.0)
        } else if h < 120.0 {
            (x, c, 0.0)
        } else if h < 180.0 {
            (0.0, c, x)
        } else if h < 240.0 {
            (0.0, x, c)
        } else if h < 300.0 {
            (x, 0.0, c)
        } else {
            (c, 0.0, x)
        };

        (r + m, g + m, b + m)
    }

    pub async fn create_scene_from_cues(&self, cues: &[LightingCue]) -> Result<AILightingScene> {
        Ok(AILightingScene {
            id: Uuid::new_v4(),
            name: "Generated Scene".to_string(),
            description: "Scene generated from individual cues".to_string(),
            lighting_cues: cues.to_vec(),
            music_sync: None,
            concept_tags: vec!["generated".to_string()],
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }

    pub async fn validate_scene(&self, scene: &AILightingScene) -> Result<ValidationResult> {
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        // Check for empty cues
        if scene.lighting_cues.is_empty() {
            errors.push("Scene has no lighting cues".to_string());
        }

        // Check DMX levels
        for (cue_index, cue) in scene.lighting_cues.iter().enumerate() {
            if cue.dmx_levels.len() != 512 {
                errors.push(format!("Cue {} has {} DMX levels, expected 512", cue_index, cue.dmx_levels.len()));
            }

            // Check for invalid DMX values
            for (channel, &level) in cue.dmx_levels.iter().enumerate() {
                if level > 255 {
                    errors.push(format!("Cue {} channel {} has invalid DMX value: {}", cue_index, channel, level));
                }
            }

            // Check timing
            if cue.timing.fade_in_ms > 30000 {
                warnings.push(format!("Cue {} has very long fade in: {}ms", cue_index, cue.timing.fade_in_ms));
            }

            if cue.timing.fade_out_ms > 30000 {
                warnings.push(format!("Cue {} has very long fade out: {}ms", cue_index, cue.timing.fade_out_ms));
            }
        }

        Ok(ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub scene_id: Uuid,
    pub scene_name: String,
    pub cues_executed: usize,
    pub total_duration_ms: u32,
    pub cue_results: Vec<CueExecutionResult>,
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CueExecutionResult {
    pub cue_id: Uuid,
    pub cue_name: String,
    pub cue_index: usize,
    pub execution_time_ms: u32,
    pub success: bool,
    pub dmx_levels_sent: usize,
    pub effects_applied: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}
