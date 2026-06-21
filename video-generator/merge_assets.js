const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

async function merge() {
    console.log('[Merger] Starting audio and video compilation...');
    
    const audioDir = path.join(__dirname, 'audio');
    const latestRecPath = path.join(__dirname, 'latest_recording.json');
    const outputVideo = path.join(PROJECT_ROOT = path.resolve(__dirname, '..'), 'pitch_vision_demo.mp4');
    
    // 1. Check if audio files exist
    const acts = ['act1', 'act2', 'act3', 'act4', 'act5', 'act6', 'act7', 'act8'];
    for (const act of acts) {
        const file = path.join(audioDir, `${act}.mp3`);
        if (!fs.existsSync(file)) {
            throw new Error(`Missing audio file: ${file}`);
        }
    }
    
    // 2. Create input file list for ffmpeg concat
    const concatListPath = path.join(__dirname, 'audio_inputs.txt');
    const fileContent = acts.map(act => `file '${path.join(audioDir, `${act}.mp3`).replace(/\\/g, '/')}'`).join('\n');
    fs.writeFileSync(concatListPath, fileContent, 'utf8');
    console.log('[Merger] Created audio concat list file.');
    
    // 3. Concatenate audio files
    const concatenatedAudio = path.join(__dirname, 'voiceover.mp3');
    if (fs.existsSync(concatenatedAudio)) {
        fs.unlinkSync(concatenatedAudio);
    }
    
    console.log('[Merger] Concatenating audio clips into voiceover.mp3...');
    execFileSync(ffmpegPath, [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        concatenatedAudio
    ], { stdio: 'inherit' });
    
    // 4. Retrieve latest recorded video path
    if (!fs.existsSync(latestRecPath)) {
        throw new Error('No latest recording found in latest_recording.json');
    }
    const { path: webmVideoPath } = JSON.parse(fs.readFileSync(latestRecPath, 'utf8'));
    if (!fs.existsSync(webmVideoPath)) {
        throw new Error(`WebM recording file not found at: ${webmVideoPath}`);
    }
    console.log(`[Merger] Found raw video recording: ${webmVideoPath}`);
    
    // 5. Merge video and audio, transcode to high-quality MP4
    console.log('[Merger] Merging audio and video into final MP4 (this may take a minute)...');
    execFileSync(ffmpegPath, [
        '-y',
        '-i', webmVideoPath,         // Input video (WebM)
        '-i', concatenatedAudio,      // Input audio (MP3)
        '-vf', 'fps=60,unsharp=3:3:0.5:3:3:0.5', // Output constant 60 fps + subtle sharpening filter
        '-c:v', 'libx264',            // H.264 video codec
        '-preset', 'slow',            // Slow preset for high quality compression
        '-crf', '17',                 // Constant Rate Factor 17 for visually lossless output
        '-pix_fmt', 'yuv420p',        // standard color space compatibility
        '-c:a', 'aac',                // AAC audio codec
        '-b:a', '320k',               // High audio bitrate
        '-shortest',                  // End video when shortest stream ends
        outputVideo
    ], { stdio: 'inherit' });
    
    console.log(`[Merger] SUCCESS! Final pitch video compiled at: ${outputVideo}`);
    
    // 6. Cleanup temporary files
    try {
        fs.unlinkSync(concatListPath);
        fs.unlinkSync(concatenatedAudio);
        console.log('[Merger] Cleaned up temporary audio files.');
    } catch (e) {
        console.warn('[Merger] Failed to cleanup temp files:', e.message);
    }
}

merge().catch(e => {
    console.error('[Merger] Merging failed:', e);
    process.exit(1);
});
