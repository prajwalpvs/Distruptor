# STFU — Delayed Audio Playback

A minimal browser tool that plays your mic audio back through your speakers with a configurable delay, making it nearly impossible for someone near the speakers to keep talking.

## How It Works

1. Your mic captures ambient audio in real time
2. Audio is delayed by the amount you configure (0.5–5 seconds)
3. The delayed playback disrupts the speaker's concentration — hearing yourself slightly after speaking breaks your train of thought

## Features

- Adjustable delay (0.5s–5s)
- Adjustable playback volume (0–100%)
- Live waveform visualizer
- Space bar toggle
- Status indicator

## Usage

Open `index.html` in any modern browser, click **Activate** (or press Space), and grant microphone access.

> **Use headphones** — playing mic audio through open speakers causes feedback.

## Browser Requirements

Requires microphone access via the [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and [MediaDevices API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia). Works in Chrome, Firefox, Edge, and Safari 11+. Mobile requires HTTPS.

## Files

- `index.html` — Full UI with controls and waveform
- `1.html` — Minimal tap-to-activate version

## License

MIT
