use crate::error::AppError;
use crate::llm::types::RefactorResult;
use llama_cpp_2::context::params::LlamaContextParams;
use llama_cpp_2::llama_backend::LlamaBackend;
use llama_cpp_2::llama_batch::LlamaBatch;
use llama_cpp_2::model::params::LlamaModelParams;
use llama_cpp_2::model::{AddBos, LlamaChatMessage, LlamaModel};
use llama_cpp_2::sampling::LlamaSampler;
use std::num::NonZeroU32;
use std::path::Path;
use std::sync::OnceLock;
use std::time::Instant;

static BACKEND: OnceLock<LlamaBackend> = OnceLock::new();

fn get_backend() -> &'static LlamaBackend {
    BACKEND.get_or_init(|| LlamaBackend::init().expect("failed to initialize llama backend"))
}

pub struct LlmEngine {
    model: LlamaModel,
}

impl LlmEngine {
    pub fn load(path: &Path) -> Result<Self, AppError> {
        let backend = get_backend();
        let model_params =
            std::pin::pin!(LlamaModelParams::default().with_n_gpu_layers(999));
        let model = LlamaModel::load_from_file(backend, path, &model_params)
            .map_err(|e| AppError::Llm(format!("failed to load model: {e}")))?;
        Ok(Self { model })
    }

    pub fn count_tokens(&self, text: &str) -> Result<usize, AppError> {
        let tokens = self
            .model
            .str_to_token(text, AddBos::Never)
            .map_err(|e| AppError::Llm(format!("tokenization failed: {e}")))?;
        Ok(tokens.len())
    }

    #[allow(clippy::cast_possible_truncation, clippy::cast_possible_wrap)]
    pub fn generate(
        &self,
        system_prompt: &str,
        text: &str,
        ctx_size: u32,
    ) -> Result<RefactorResult, AppError> {
        let start = Instant::now();
        let backend = get_backend();

        // Build chat messages
        let messages = vec![
            LlamaChatMessage::new("system".to_string(), system_prompt.to_string())
                .map_err(|e| AppError::Llm(format!("invalid chat message: {e}")))?,
            LlamaChatMessage::new("user".to_string(), text.to_string())
                .map_err(|e| AppError::Llm(format!("invalid chat message: {e}")))?,
        ];

        // Apply the model's embedded chat template
        let tmpl = self
            .model
            .chat_template(None)
            .map_err(|e| AppError::Llm(format!("no chat template: {e}")))?;
        let prompt = self
            .model
            .apply_chat_template(&tmpl, &messages, true)
            .map_err(|e| AppError::Llm(format!("template error: {e}")))?;

        // Tokenize
        let input_token_count = self.count_tokens(&prompt).unwrap_or(0) as u64;
        let tokens = self
            .model
            .str_to_token(&prompt, AddBos::Always)
            .map_err(|e| AppError::Llm(format!("tokenization failed: {e}")))?;

        // Create context
        let n_ctx =
            NonZeroU32::new(ctx_size).unwrap_or(NonZeroU32::new(4096).expect("non-zero"));
        let ctx_params = LlamaContextParams::default()
            .with_n_ctx(Some(n_ctx))
            .with_n_threads(4)
            .with_n_threads_batch(4);
        let mut ctx = self
            .model
            .new_context(backend, ctx_params)
            .map_err(|e| AppError::Llm(format!("context creation failed: {e}")))?;

        // Feed prompt tokens
        let mut batch = LlamaBatch::new(512, 1);
        let last_idx = (tokens.len() - 1) as i32;
        for (i, &token) in tokens.iter().enumerate() {
            batch
                .add(token, i as i32, &[0], i as i32 == last_idx)
                .map_err(|e| AppError::Llm(format!("batch add failed: {e}")))?;
        }

        ctx.decode(&mut batch)
            .map_err(|e| AppError::Llm(format!("prompt decode failed: {e}")))?;

        // Greedy sampling loop
        let mut sampler =
            LlamaSampler::chain_simple([LlamaSampler::greedy()]);

        let max_new_tokens = ctx_size as i32 / 2;
        let mut output = String::new();
        let mut n_cur = batch.n_tokens();
        let mut decoder = encoding_rs::UTF_8.new_decoder();

        while n_cur < tokens.len() as i32 + max_new_tokens {
            let token = sampler.sample(&ctx, batch.n_tokens() - 1);
            sampler.accept(token);

            if self.model.is_eog_token(token) {
                break;
            }

            let piece = self
                .model
                .token_to_piece(token, &mut decoder, true, None)
                .map_err(|e| AppError::Llm(format!("token decode failed: {e}")))?;
            output.push_str(&piece);

            batch.clear();
            batch
                .add(token, n_cur, &[0], true)
                .map_err(|e| AppError::Llm(format!("batch add failed: {e}")))?;
            ctx.decode(&mut batch)
                .map_err(|e| AppError::Llm(format!("decode failed: {e}")))?;
            n_cur += 1;
        }

        let duration_ms = start.elapsed().as_millis() as u64;
        let output_token_count = self.count_tokens(output.trim()).unwrap_or(0) as u64;

        Ok(RefactorResult {
            text: output.trim().to_string(),
            model_used: String::new(),
            duration_ms,
            input_tokens: input_token_count,
            output_tokens: output_token_count,
        })
    }
}
