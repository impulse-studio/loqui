/// Convert multi-channel interleaved samples to mono by averaging frames.
pub fn to_mono(samples: &[f32], channels: u16) -> Vec<f32> {
    let ch = channels as usize;
    samples
        .chunks(ch)
        .map(|frame| {
            #[allow(clippy::cast_precision_loss)]
            let avg = frame.iter().sum::<f32>() / frame.len() as f32;
            avg
        })
        .collect()
}

/// Linear-interpolation resampler from `from_rate` to `to_rate`.
pub fn resample(samples: &[f32], from_rate: u32, to_rate: u32) -> Vec<f32> {
    if from_rate == to_rate || samples.is_empty() {
        return samples.to_vec();
    }

    let ratio = f64::from(to_rate) / f64::from(from_rate);
    #[allow(
        clippy::cast_precision_loss,
        clippy::cast_possible_truncation,
        clippy::cast_sign_loss
    )]
    let output_len = (samples.len() as f64 * ratio) as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        #[allow(clippy::cast_precision_loss)]
        let src_idx = i as f64 / ratio;
        #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
        let idx = src_idx as usize;
        #[allow(clippy::cast_possible_truncation, clippy::cast_precision_loss)]
        let frac = (src_idx - idx as f64) as f32;

        let sample = if idx + 1 < samples.len() {
            samples[idx] * (1.0 - frac) + samples[idx + 1] * frac
        } else {
            samples[samples.len() - 1]
        };
        output.push(sample);
    }

    output
}
