/// Raw audio buffer captured from the microphone.
/// Stored as 16kHz mono f32 PCM samples.
pub struct AudioBuffer {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
}

impl AudioBuffer {
    pub fn new() -> Self {
        Self {
            samples: Vec::new(),
            sample_rate: 16000,
            channels: 1,
        }
    }

    pub fn duration_secs(&self) -> f64 {
        if self.sample_rate == 0 {
            return 0.0;
        }
        #[allow(clippy::cast_precision_loss)]
        let len = self.samples.len() as f64;
        len / f64::from(self.sample_rate)
    }
}

impl Default for AudioBuffer {
    fn default() -> Self {
        Self::new()
    }
}
