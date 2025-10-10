use crate::{
    AILightingScene, LightingCue, CueTiming, LightingEffect, EffectType, 
    ColorPalette, RgbColor, MusicContext, Augment3DContext, ConceptContext
};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

pub struct AILightingEngine {
    mistral_client: reqwest::Client,
    mistral_api_key: String,
}

impl AILightingEngine {
    pub async fn new(api_key: String) -> Result<Self> {
        let client = reqwest::Client::new();
        Ok(Self {
            mistral_client: client,
            mistral_api_key: api_key,
        })
    }

    pub async fn generate_lighting_scene(
        &self,
        concept: &str,
        music_context: &Option<MusicContext>,
        augment3d_context: &Option<Augment3DContext>,
    ) -> Result<AILightingScene> {
        // Create a comprehensive prompt for Mistral
        let prompt = self.build_lighting_prompt(concept, music_context, augment3d_context);
        
        // Call Mistral API
        let mistral_response = self.call_mistral_api(&prompt).await?;
        
        // Parse Mistral response into lighting scene
        let scene = self.parse_mistral_response(&mistral_response, concept)?;
        
        Ok(scene)
    }

    fn build_lighting_prompt(
        &self,
        concept: &str,
        music_context: &Option<MusicContext>,
        augment3d_context: &Option<Augment3DContext>,
    ) -> String {
        let mut prompt = format!(
            "You are an expert lighting designer creating a professional lighting scene. 
            Generate a detailed lighting design based on the following inputs:

            CONCEPT: {}
            
            ", concept
        );

        if let Some(music) = music_context {
            prompt.push_str(&format!(
                "MUSIC CONTEXT:
                - Tempo: {} BPM
                - Key: {}
                - Mood: {}
                - Dynamics: {:.2}
                - Rhythm Pattern: {}
                - Harmonic Progression: {:?}
                
                ", music.tempo, music.key, music.mood, music.dynamics, music.rhythm_pattern, music.harmonic_progression
            ));
        }

        if let Some(augment3d) = augment3d_context {
            prompt.push_str(&format!(
                "3D VENUE CONTEXT:
                - Venue Model: {}
                - Number of Fixtures: {}
                - Spatial Effects: {:?}
                
                ", augment3d.venue_model, augment3d.fixture_positions.len(), augment3d.spatial_effects
            ));
        }

        prompt.push_str(
            "Please generate a JSON response with the following structure:
            {
                \"lighting_cues\": [
                    {
                        \"name\": \"cue_name\",
                        \"dmx_levels\": [array of 512 DMX values 0-255],
                        \"timing\": {
                            \"fade_in_ms\": 1000,
                            \"fade_out_ms\": 500,
                            \"hold_ms\": 2000,
                            \"delay_ms\": 0
                        },
                        \"effects\": [
                            {
                                \"effect_type\": \"strobe|chase|rainbow|pulse|wave|custom\",
                                \"parameters\": {\"speed\": 1.0, \"intensity\": 0.8},
                                \"intensity\": 0.8
                            }
                        ],
                        \"color_palette\": {
                            \"primary\": {\"r\": 255, \"g\": 100, \"b\": 50},
                            \"secondary\": {\"r\": 100, \"g\": 200, \"b\": 255},
                            \"accent\": {\"r\": 255, \"g\": 255, \"b\": 100},
                            \"background\": {\"r\": 20, \"g\": 20, \"b\": 40}
                        }
                    }
                ],
                \"concept_tags\": [\"moody\", \"dynamic\", \"warm\", \"energetic\"]
            }

            Consider:
            1. Musical timing and rhythm for cue timing
            2. Color theory and mood matching
            3. Spatial distribution of fixtures
            4. Dynamic range and contrast
            5. Smooth transitions between cues
            6. Professional lighting design principles

            Generate 3-8 lighting cues that create a cohesive, artistic lighting design."
        );

        prompt
    }

    async fn call_mistral_api(&self, prompt: &str) -> Result<String> {
        let request_body = serde_json::json!({
            "model": "mistral-large-latest",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.7,
            "max_tokens": 4000,
            "top_p": 0.9
        });

        let response = self.mistral_client
            .post("https://api.mistral.ai/v1/chat/completions")
            .header("Authorization", format!("Bearer {}", self.mistral_api_key))
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            return Err(anyhow::anyhow!("Mistral API error: {}", response.status()));
        }

        let response_json: serde_json::Value = response.json().await?;
        let content = response_json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("No content in Mistral response"))?;

        Ok(content.to_string())
    }

    fn parse_mistral_response(&self, response: &str, concept: &str) -> Result<AILightingScene> {
        // Extract JSON from Mistral response (it might have markdown formatting)
        let json_start = response.find('{').unwrap_or(0);
        let json_end = response.rfind('}').unwrap_or(response.len());
        let json_str = &response[json_start..=json_end];

        let parsed: MistralResponse = serde_json::from_str(json_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse Mistral response: {}", e))?;

        let mut lighting_cues = Vec::new();
        
        for (index, cue_data) in parsed.lighting_cues.iter().enumerate() {
            let cue = LightingCue {
                id: Uuid::new_v4(),
                name: cue_data.name.clone(),
                dmx_levels: cue_data.dmx_levels.clone(),
                timing: CueTiming {
                    fade_in_ms: cue_data.timing.fade_in_ms,
                    fade_out_ms: cue_data.timing.fade_out_ms,
                    hold_ms: cue_data.timing.hold_ms,
                    delay_ms: cue_data.timing.delay_ms,
                },
                effects: cue_data.effects.iter().map(|e| LightingEffect {
                    effect_type: match e.effect_type.as_str() {
                        "strobe" => EffectType::Strobe,
                        "chase" => EffectType::Chase,
                        "rainbow" => EffectType::Rainbow,
                        "pulse" => EffectType::Pulse,
                        "wave" => EffectType::Wave,
                        other => EffectType::Custom(other.to_string()),
                    },
                    parameters: e.parameters.clone(),
                    intensity: e.intensity,
                }).collect(),
                color_palette: cue_data.color_palette.as_ref().map(|cp| ColorPalette {
                    primary: RgbColor {
                        r: cp.primary.r,
                        g: cp.primary.g,
                        b: cp.primary.b,
                    },
                    secondary: RgbColor {
                        r: cp.secondary.r,
                        g: cp.secondary.g,
                        b: cp.secondary.b,
                    },
                    accent: RgbColor {
                        r: cp.accent.r,
                        g: cp.accent.g,
                        b: cp.accent.b,
                    },
                    background: RgbColor {
                        r: cp.background.r,
                        g: cp.background.g,
                        b: cp.background.b,
                    },
                }),
            };
            lighting_cues.push(cue);
        }

        Ok(AILightingScene {
            id: Uuid::new_v4(),
            name: format!("AI Generated: {}", concept),
            description: format!("AI-generated lighting scene based on concept: {}", concept),
            lighting_cues,
            music_sync: None,
            concept_tags: parsed.concept_tags.clone(),
            created_at: chrono::Utc::now(),
            updated_at: chrono::Utc::now(),
        })
    }

    pub async fn analyze_lighting_mood(&self, scene: &AILightingScene) -> Result<String> {
        let prompt = format!(
            "Analyze this lighting scene and describe its mood and artistic intent:

            Scene: {}
            Description: {}
            Number of cues: {}
            Concept tags: {:?}

            Provide a brief artistic analysis of the lighting design's mood, color palette, and overall aesthetic.",
            scene.name, scene.description, scene.lighting_cues.len(), scene.concept_tags
        );

        let response = self.call_mistral_api(&prompt).await?;
        Ok(response)
    }

    pub async fn suggest_improvements(&self, scene: &AILightingScene) -> Result<Vec<String>> {
        let prompt = format!(
            "As a professional lighting designer, suggest 3-5 specific improvements for this lighting scene:

            Scene: {}
            Description: {}
            Cues: {}

            Focus on:
            1. Technical improvements (timing, transitions, DMX programming)
            2. Artistic enhancements (color, mood, dynamics)
            3. Musical synchronization opportunities
            4. Spatial distribution improvements

            Provide specific, actionable suggestions.",
            scene.name, 
            scene.description,
            scene.lighting_cues.len()
        );

        let response = self.call_mistral_api(&prompt).await?;
        
        // Parse response into individual suggestions
        let suggestions: Vec<String> = response
            .lines()
            .filter(|line| line.trim().starts_with(|c: char| c.is_numeric() && c.is_ascii_digit()))
            .map(|line| line.trim().to_string())
            .collect();

        Ok(suggestions)
    }
}

#[derive(Debug, Deserialize)]
struct MistralResponse {
    lighting_cues: Vec<MistralCue>,
    concept_tags: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct MistralCue {
    name: String,
    dmx_levels: Vec<u8>,
    timing: MistralTiming,
    effects: Vec<MistralEffect>,
    color_palette: Option<MistralColorPalette>,
}

#[derive(Debug, Deserialize)]
struct MistralTiming {
    fade_in_ms: u32,
    fade_out_ms: u32,
    hold_ms: u32,
    delay_ms: u32,
}

#[derive(Debug, Deserialize)]
struct MistralEffect {
    effect_type: String,
    parameters: HashMap<String, f32>,
    intensity: f32,
}

#[derive(Debug, Deserialize)]
struct MistralColorPalette {
    primary: MistralColor,
    secondary: MistralColor,
    accent: MistralColor,
    background: MistralColor,
}

#[derive(Debug, Deserialize)]
struct MistralColor {
    r: u8,
    g: u8,
    b: u8,
}
