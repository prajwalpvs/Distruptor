const TOAST_DURATION_MS  = 2500;
const ANALYSER_FFT_SIZE  = 512;
const MAX_DELAY_SECONDS  = 5.5;
const WAVEFORM_MID_POINT = 128.0;

const startBtn    = document.getElementById('startBtn');
const stopBtn     = document.getElementById('stopBtn');
const statusBadge = document.getElementById('statusBadge');
const statusText  = document.getElementById('statusText');
const pulseRing   = document.getElementById('pulseRing');
const delaySlider = document.getElementById('delaySlider');
const volSlider   = document.getElementById('volSlider');
const delayVal    = document.getElementById('delayVal');
const volVal      = document.getElementById('volVal');
const vizWrap     = document.getElementById('vizWrap');
const canvas      = document.getElementById('waveform');
const ctx         = canvas.getContext('2d');
const toast       = document.getElementById('toast');

// Safari fallback
const AudioCtx = window.AudioContext || window.webkitAudioContext;

let audioContext = null;
let mediaStream  = null;
let source       = null;
let delayNode    = null;
let gainNode     = null;
let analyser     = null;
let animFrame    = null;
let toastTimer   = null;
let isActive     = false;
let waveformData = null;
let waveGrad     = null;

// Must run after vizWrap is visible (display:none → getBoundingClientRect returns 0)
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr  = window.devicePixelRatio || 1;
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.scale(dpr, dpr);
    buildGradient(rect.width);
}

function buildGradient(W) {
    waveGrad = ctx.createLinearGradient(0, 0, W, 0);
    waveGrad.addColorStop(0,   '#818cf8');
    waveGrad.addColorStop(0.5, '#a855f7');
    waveGrad.addColorStop(1,   '#ec4899');
}

delaySlider.addEventListener('input', () => {
    const v = parseFloat(delaySlider.value).toFixed(1);
    delayVal.textContent = v + 's';
    delaySlider.setAttribute('aria-valuetext', v + ' seconds');
    if (delayNode) delayNode.delayTime.value = parseFloat(v);
});

volSlider.addEventListener('input', () => {
    volVal.textContent = volSlider.value + '%';
    volSlider.setAttribute('aria-valuetext', volSlider.value + ' percent');
    if (gainNode) gainNode.gain.value = volSlider.value / 100;
});

async function start() {
    if (isActive) return;
    startBtn.disabled = true;
    setStatus('requesting mic...', '');
    try {
        audioContext = new AudioCtx();
        await audioContext.resume();
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        source      = audioContext.createMediaStreamSource(mediaStream);
        delayNode   = audioContext.createDelay(MAX_DELAY_SECONDS);
        gainNode    = audioContext.createGain();
        analyser    = audioContext.createAnalyser();
        analyser.fftSize = ANALYSER_FFT_SIZE;

        delayNode.delayTime.value = parseFloat(delaySlider.value);
        gainNode.gain.value       = volSlider.value / 100;

        source.connect(analyser);
        source.connect(delayNode);
        delayNode.connect(gainNode);
        gainNode.connect(audioContext.destination);

        waveformData = new Uint8Array(analyser.frequencyBinCount);

        // setActive first — makes vizWrap visible so resizeCanvas gets correct dimensions
        setActive(true);
        resizeCanvas();
        drawWaveform();
        showToast('activated — space to toggle');
    } catch (e) {
        if (audioContext) { audioContext.close(); audioContext = null; }
        startBtn.disabled = false;
        setStatus('mic denied', 'error');
        showToast('microphone access denied');
    }
}

function stop() {
    if (!isActive) return;
    cancelAnimationFrame(animFrame);
    animFrame = null;
    if (mediaStream) { mediaStream.getTracks().forEach(t => t.stop()); mediaStream = null; }
    if (audioContext) { audioContext.close(); audioContext = null; }
    source       = null;
    delayNode    = null;
    gainNode     = null;
    analyser     = null;
    waveformData = null;
    waveGrad     = null;
    clearCanvas();
    setActive(false);
    showToast('stopped');
}

startBtn.addEventListener('click', start);
stopBtn.addEventListener('click', stop);

document.addEventListener('keydown', e => {
    if (e.code === 'Space' && !['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
        e.preventDefault();
        isActive ? stop() : start();
    }
});

function drawWaveform() {
    // Guard: stop() nulls analyser; this prevents crash if frame fires after cancel
    if (!analyser) return;

    animFrame = requestAnimationFrame(drawWaveform);

    const dpr = window.devicePixelRatio || 1;
    const W   = canvas.width  / dpr;
    const H   = canvas.height / dpr;
    analyser.getByteTimeDomainData(waveformData);

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();

    ctx.strokeStyle = waveGrad;
    ctx.lineWidth   = 2;
    ctx.shadowColor = 'rgba(168,85,247,0.5)';
    ctx.shadowBlur  = 8;
    ctx.beginPath();

    const sliceW = W / waveformData.length;
    for (let i = 0; i < waveformData.length; i++) {
        const v = waveformData[i] / WAVEFORM_MID_POINT;
        const y = (v * H) / 2;
        if (i === 0) ctx.moveTo(0, y);
        else ctx.lineTo(i * sliceW, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
}

function clearCanvas() {
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
}

function setStatus(text, modifier) {
    statusText.textContent = text;
    statusBadge.className  = 'status-badge' + (modifier ? ' ' + modifier : '');
}

function setActive(on) {
    isActive = on;
    if (on) {
        setStatus('active', 'active');
        pulseRing.classList.add('active');
        vizWrap.classList.add('active');
        startBtn.disabled = true;
        startBtn.setAttribute('aria-pressed', 'true');
        stopBtn.classList.add('visible');
    } else {
        setStatus('idle', '');
        pulseRing.classList.remove('active');
        vizWrap.classList.remove('active');
        startBtn.disabled = false;
        startBtn.setAttribute('aria-pressed', 'false');
        stopBtn.classList.remove('visible');
    }
}

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), TOAST_DURATION_MS);
}

window.addEventListener('resize', () => {
    if (isActive) resizeCanvas();
});
