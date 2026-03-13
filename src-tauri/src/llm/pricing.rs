/// Estimate cost in USD for a given model's token usage.
/// Pricing is per 1M tokens (input/output).
pub fn estimate_cost(provider: &str, model: &str, input_tokens: u64, output_tokens: u64) -> f64 {
    let (input_per_m, output_per_m) = match provider {
        "local" => return 0.0,
        "openai" => match model {
            "gpt-4o" => (2.50, 10.00),
            "gpt-4o-mini" => (0.15, 0.60),
            _ => (0.0, 0.0),
        },
        "anthropic" => match model {
            "claude-sonnet-4-20250514" => (3.00, 15.00),
            "claude-haiku-4-5-20251001" => (0.80, 4.00),
            _ => (0.0, 0.0),
        },
        "google" => match model {
            "gemini-2.0-flash" => (0.10, 0.40),
            "gemini-2.5-pro-preview-06-05" => (1.25, 10.00),
            _ => (0.0, 0.0),
        },
        _ => (0.0, 0.0),
    };

    let input_cost = (input_tokens as f64 / 1_000_000.0) * input_per_m;
    let output_cost = (output_tokens as f64 / 1_000_000.0) * output_per_m;
    input_cost + output_cost
}
