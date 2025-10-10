use crate::ConceptContext;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub struct ConceptProcessor {
    mistral_client: reqwest::Client,
    mistral_api_key: String,
}

impl ConceptProcessor {
    pub async fn new(api_key: String) -> Result<Self> {
        let client = reqwest::Client::new();
        Ok(Self {
            mistral_client: client,
            mistral_api_key: api_key,
        })
    }

    pub async fn process_concept(&self, concept: &str, additional_context: &Option<String>) -> Result<ConceptContext> {
        let prompt = self.build_concept_prompt(concept, additional_context);
        let response = self.call_mistral_api(&prompt).await?;
        self.parse_concept_response(&response)
    }

    fn build_concept_prompt(&self, concept: &str, additional_context: &Option<String>) -> String {
        let mut prompt = format!(
            "You are an expert lighting designer and artistic director. Analyze this lighting concept and provide detailed artistic interpretation:

            CONCEPT: {}

            ", concept
        );

        if let Some(context) = additional_context {
            prompt.push_str(&format!("ADDITIONAL CONTEXT: {}\n\n", context));
        }

        prompt.push_str(
            "Please analyze this concept and provide a JSON response with the following structure:
            {
                \"concept\": \"refined_concept_description\",
                \"mood\": \"primary_mood_descriptor\",
                \"color_scheme\": \"color_palette_description\",
                \"intensity_level\": 0.8,
                \"movement_style\": \"movement_characteristics\",
                \"artistic_notes\": \"detailed_artistic_interpretation\"
            }

            Consider:
            1. Emotional and psychological impact
            2. Color theory and visual aesthetics
            3. Lighting intensity and dynamics
            4. Movement and flow characteristics
            5. Technical lighting requirements
            6. Artistic vision and storytelling
            7. Audience experience and engagement

            Provide specific, actionable artistic direction for lighting design."
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
            "temperature": 0.8,
            "max_tokens": 2000,
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

    fn parse_concept_response(&self, response: &str) -> Result<ConceptContext> {
        // Extract JSON from Mistral response
        let json_start = response.find('{').unwrap_or(0);
        let json_end = response.rfind('}').unwrap_or(response.len());
        let json_str = &response[json_start..=json_end];

        let parsed: MistralConceptResponse = serde_json::from_str(json_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse concept response: {}", e))?;

        Ok(ConceptContext {
            concept: parsed.concept,
            mood: parsed.mood,
            color_scheme: parsed.color_scheme,
            intensity_level: parsed.intensity_level,
            movement_style: parsed.movement_style,
            artistic_notes: parsed.artistic_notes,
        })
    }

    pub async fn suggest_color_palette(&self, concept: &str) -> Result<Vec<ColorSuggestion>> {
        let prompt = format!(
            "As a lighting designer, suggest 3-5 color palettes for this concept:

            CONCEPT: {}

            Provide JSON response with color palettes:
            {{
                \"palettes\": [
                    {{
                        \"name\": \"palette_name\",
                        \"primary\": {{\"r\": 255, \"g\": 100, \"b\": 50}},
                        \"secondary\": {{\"r\": 100, \"g\": 200, \"b\": 255}},
                        \"accent\": {{\"r\": 255, \"g\": 255, \"b\": 100}},
                        \"background\": {{\"r\": 20, \"g\": 20, \"b\": 40}},
                        \"description\": \"artistic_description\"
                    }}
                ]
            }}

            Consider color theory, mood, and artistic intent.",
            concept
        );

        let response = self.call_mistral_api(&prompt).await?;
        self.parse_color_suggestions(&response)
    }

    fn parse_color_suggestions(&self, response: &str) -> Result<Vec<ColorSuggestion>> {
        let json_start = response.find('{').unwrap_or(0);
        let json_end = response.rfind('}').unwrap_or(response.len());
        let json_str = &response[json_start..=json_end];

        let parsed: MistralColorResponse = serde_json::from_str(json_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse color suggestions: {}", e))?;

        Ok(parsed.palettes)
    }

    pub async fn analyze_artistic_intent(&self, concept: &str) -> Result<ArtisticAnalysis> {
        let prompt = format!(
            "As an expert in theatrical and concert lighting, analyze the artistic intent of this concept:

            CONCEPT: {}

            Provide detailed analysis in JSON format:
            {{
                \"themes\": [\"theme1\", \"theme2\", \"theme3\"],
                \"emotions\": [\"emotion1\", \"emotion2\", \"emotion3\"],
                \"visual_style\": \"style_description\",
                \"technical_requirements\": [\"req1\", \"req2\", \"req3\"],
                \"audience_impact\": \"impact_description\",
                \"storytelling_elements\": [\"element1\", \"element2\"],
                \"recommended_effects\": [\"effect1\", \"effect2\", \"effect3\"]
            }}

            Focus on:
            1. Core themes and messages
            2. Emotional journey and impact
            3. Visual storytelling elements
            4. Technical lighting needs
            5. Audience experience
            6. Recommended lighting effects",
            concept
        );

        let response = self.call_mistral_api(&prompt).await?;
        self.parse_artistic_analysis(&response)
    }

    fn parse_artistic_analysis(&self, response: &str) -> Result<ArtisticAnalysis> {
        let json_start = response.find('{').unwrap_or(0);
        let json_end = response.rfind('}').unwrap_or(response.len());
        let json_str = &response[json_start..=json_end];

        let parsed: MistralArtisticResponse = serde_json::from_str(json_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse artistic analysis: {}", e))?;

        Ok(ArtisticAnalysis {
            themes: parsed.themes,
            emotions: parsed.emotions,
            visual_style: parsed.visual_style,
            technical_requirements: parsed.technical_requirements,
            audience_impact: parsed.audience_impact,
            storytelling_elements: parsed.storytelling_elements,
            recommended_effects: parsed.recommended_effects,
        })
    }

    pub async fn generate_lighting_script(&self, concept: &str, duration_minutes: u32) -> Result<LightingScript> {
        let prompt = format!(
            "Create a detailed lighting script for this concept with a {} minute duration:

            CONCEPT: {}

            Provide JSON response with timing and cues:
            {{
                \"title\": \"script_title\",
                \"duration_minutes\": {},
                \"cues\": [
                    {{
                        \"cue_number\": 1,
                        \"time_minutes\": 0.0,
                        \"description\": \"cue_description\",
                        \"mood\": \"mood_descriptor\",
                        \"color_direction\": \"color_notes\",
                        \"intensity\": 0.8,
                        \"movement\": \"movement_notes\",
                        \"effects\": [\"effect1\", \"effect2\"],
                        \"notes\": \"additional_notes\"
                    }}
                ]
            }}

            Create 8-15 cues that tell a complete lighting story.",
            duration_minutes, concept, duration_minutes
        );

        let response = self.call_mistral_api(&prompt).await?;
        self.parse_lighting_script(&response)
    }

    fn parse_lighting_script(&self, response: &str) -> Result<LightingScript> {
        let json_start = response.find('{').unwrap_or(0);
        let json_end = response.rfind('}').unwrap_or(response.len());
        let json_str = &response[json_start..=json_end];

        let parsed: MistralScriptResponse = serde_json::from_str(json_str)
            .map_err(|e| anyhow::anyhow!("Failed to parse lighting script: {}", e))?;

        Ok(LightingScript {
            title: parsed.title,
            duration_minutes: parsed.duration_minutes,
            cues: parsed.cues,
        })
    }
}

#[derive(Debug, Deserialize)]
struct MistralConceptResponse {
    concept: String,
    mood: String,
    color_scheme: String,
    intensity_level: f32,
    movement_style: String,
    artistic_notes: String,
}

#[derive(Debug, Deserialize)]
struct MistralColorResponse {
    palettes: Vec<ColorSuggestion>,
}

#[derive(Debug, Deserialize)]
struct MistralArtisticResponse {
    themes: Vec<String>,
    emotions: Vec<String>,
    visual_style: String,
    technical_requirements: Vec<String>,
    audience_impact: String,
    storytelling_elements: Vec<String>,
    recommended_effects: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct MistralScriptResponse {
    title: String,
    duration_minutes: u32,
    cues: Vec<ScriptCue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColorSuggestion {
    pub name: String,
    pub primary: RgbColor,
    pub secondary: RgbColor,
    pub accent: RgbColor,
    pub background: RgbColor,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RgbColor {
    pub r: u8,
    pub g: u8,
    pub b: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtisticAnalysis {
    pub themes: Vec<String>,
    pub emotions: Vec<String>,
    pub visual_style: String,
    pub technical_requirements: Vec<String>,
    pub audience_impact: String,
    pub storytelling_elements: Vec<String>,
    pub recommended_effects: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LightingScript {
    pub title: String,
    pub duration_minutes: u32,
    pub cues: Vec<ScriptCue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptCue {
    pub cue_number: u32,
    pub time_minutes: f32,
    pub description: String,
    pub mood: String,
    pub color_direction: String,
    pub intensity: f32,
    pub movement: String,
    pub effects: Vec<String>,
    pub notes: String,
}
