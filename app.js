/* ----------------------------------------------------
   PITCH-VISION AI - ENGINE & TELEMETRY MODULES
   Orchestrates 2.5D Canvas, VAR Lab, Biometrics, and Chat
------------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. SPLASH SCREEN INITIALIZATION
    // ==========================================
    (function initSplash() {
        const splash = document.getElementById('splash-screen');
        const particlesContainer = document.getElementById('splash-particles');
        
        // Create floating particles
        if (particlesContainer) {
            for (let i = 0; i < 30; i++) {
                const p = document.createElement('div');
                p.className = 'splash-particle';
                p.style.left = Math.random() * 100 + '%';
                p.style.animationDelay = Math.random() * 4 + 's';
                p.style.animationDuration = (3 + Math.random() * 3) + 's';
                if (Math.random() > 0.5) p.style.background = '#FFFFFF';
                particlesContainer.appendChild(p);
            }
        }
        
        // Auto-dismiss after loading bar completes
        setTimeout(() => {
            if (splash) splash.classList.add('hidden');
        }, 3000);
        
        // Click to skip
        if (splash) {
            splash.addEventListener('click', () => {
                splash.classList.add('hidden');
            });
        }
    })();

    // ==========================================
    // 0.5 API CLIENT — AUTO-DETECT BACKEND
    // ==========================================
    const API_BASE = 'http://localhost:8000';
    let backendOnline = false;

    async function checkBackend() {
        try {
            const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(2000) });
            if (res.ok) {
                const data = await res.json();
                backendOnline = true;
                showToast(`IBM Granite ${data.mode.toUpperCase()} mode connected`);
                
                const modeLabel = data.mode === 'live' ? 'GRANITE LIVE' : 'GRANITE CORE';
                const modeColor = data.mode === 'live' ? 'var(--neon-green)' : 'var(--neon-cyan)';
                
                const oracleBadge = document.getElementById('oracle-mode-badge');
                if (oracleBadge) {
                    oracleBadge.innerText = modeLabel;
                    oracleBadge.style.color = modeColor;
                }
                const sketchBadge = document.getElementById('sketch-mode-badge');
                if (sketchBadge) {
                    sketchBadge.innerText = modeLabel;
                    sketchBadge.style.color = modeColor;
                }
                console.log('[API] Backend connected:', data);
            }
        } catch {
            backendOnline = false;
            console.log('[API] Backend offline — using built-in responses');
        }
    }

    async function apiChat(query, mode = 'tactical') {
        if (!backendOnline) return null;
        try {
            const res = await fetch(`${API_BASE}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, mode }),
                signal: AbortSignal.timeout(15000)
            });
            if (res.ok) {
                const data = await res.json();
                return data.response;
            }
        } catch (e) {
            console.warn('[API] Chat request failed:', e);
        }
        return null;
    }

    async function apiAnalyzePlay(vectors, camera, matchTime) {
        if (!backendOnline) return null;
        try {
            const res = await fetch(`${API_BASE}/api/analyze-play`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vectors, camera, match_time: matchTime }),
                signal: AbortSignal.timeout(15000)
            });
            if (res.ok) {
                const data = await res.json();
                return data.response;
            }
        } catch (e) {
            console.warn('[API] Analyze request failed:', e);
        }
        return null;
    }

    async function apiVARExplain(decisionType, parameters) {
        if (!backendOnline) return null;
        try {
            const res = await fetch(`${API_BASE}/api/var-explain`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision_type: decisionType, parameters }),
                signal: AbortSignal.timeout(15000)
            });
            if (res.ok) {
                const data = await res.json();
                return data.response;
            }
        } catch (e) {
            console.warn('[API] VAR request failed:', e);
        }
        return null;
    }

    function showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.innerText = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Typewriter effect for AI responses
    function typewriterEffect(element, text, speed = 8) {
        element.innerHTML = '';
        let i = 0;
        const interval = setInterval(() => {
            if (i < text.length) {
                // Handle HTML tags - add them all at once
                if (text[i] === '<') {
                    const closeIdx = text.indexOf('>', i);
                    if (closeIdx !== -1) {
                        element.innerHTML += text.substring(i, closeIdx + 1);
                        i = closeIdx + 1;
                    } else {
                        element.innerHTML += text[i];
                        i++;
                    }
                } else {
                    element.innerHTML += text[i];
                    i++;
                }
                const chatHistory = document.getElementById('oracle-chat-history');
                if (chatHistory) {
                    chatHistory.scrollTop = chatHistory.scrollHeight;
                }
            } else {
                clearInterval(interval);
            }
        }, speed);
    }

    // Check backend on load
    checkBackend();

    // KEYBOARD SHORTCUTS
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const tabMap = { '1': 'command-center', '2': 'telestrator', '3': 'var-lab', '4': 'biometrics', '5': 'agent-network' };
        if (tabMap[e.key]) {
            const tabBtn = document.querySelector(`.nav-item[data-tab="${tabMap[e.key]}"]`);
            if (tabBtn) tabBtn.click();
            e.preventDefault();
        }
        if (e.key === ' ' && state.activeTab === 'telestrator') {
            e.preventDefault();
            playPauseBtn.click();
        }
    });

    
    // ==========================================
    // 1. STATE MANAGEMENT
    // ==========================================
    const state = {
        activeTab: 'command-center',
        currentCam: 'tactical',        // 'tactical', 'broadcast', 'var'
        currentTool: 'run',            // 'run', 'pass', 'measure'
        timelineVal: 0,                // 0 to 100
        isPlaying: false,
        selectedPlayer: 'messi',       // 'messi', 'mbappe'
        varType: 'offside',            // 'offside', 'handball', 'tackle'
        
        // Telestrator drawings list
        sketches: [],                  // Array of { type, points: [{x, y}] }
        isDrawing: false,
        activeDrawPoints: [],
        
        // Calibration values
        offsideDefenderX: 340,         // pixel coords on VAR canvas
        offsideAttackerX: 325,
        handballArmAngle: 45,          // degrees
        tackleVelocity: 42,            // 10 to 80 (represents speed)
        
        // Live data trackers
        heartRateHistory: [],
        stressHistory: [],
        simTime: '79:45',
        ecgIndex: 0
    };

    // ==========================================
    // 2. TIMELINE PATH DATA (Argentina vs France 80'-82')
    // Coordinates represent X (0-100, long) and Y (0-60, wide)
    // ==========================================
    const matchSimulationTimeline = [
        // Frame 0: 79:45 - Build-up play
        {
            time: '79:45',
            ball: { x: 52, y: 30, z: 0 },
            argentina: [
                { id: 10, name: 'Messi', x: 53, y: 28 },
                { id: 24, name: 'Fernandez', x: 45, y: 35 },
                { id: 7, name: 'De Paul', x: 42, y: 20 },
                { id: 13, name: 'Romero', x: 28, y: 22 },
                { id: 19, name: 'Otamendi', x: 26, y: 38 }
            ],
            france: [
                { id: 10, name: 'Mbappe', x: 62, y: 26 },
                { id: 26, name: 'Thuram', x: 58, y: 15 },
                { id: 14, name: 'Rabiot', x: 55, y: 38 },
                { id: 8, name: 'Tchouameni', x: 48, y: 30 },
                { id: 18, name: 'Upamecano', x: 72, y: 32 }
            ],
            fieldTilt: '52% FRA',
            ppda: '12.4 passes',
            xtGap: '-0.04 xT/min'
        },
        // Frame 1: 80:05 - Messi tackled, Coman starts counter
        {
            time: '80:05',
            ball: { x: 47, y: 31, z: 0 },
            argentina: [
                { id: 10, name: 'Messi', x: 49, y: 30 },
                { id: 24, name: 'Fernandez', x: 44, y: 36 },
                { id: 7, name: 'De Paul', x: 40, y: 22 },
                { id: 13, name: 'Romero', x: 29, y: 25 },
                { id: 19, name: 'Otamendi', x: 28, y: 38 }
            ],
            france: [
                { id: 10, name: 'Mbappe', x: 63, y: 24 },
                { id: 26, name: 'Thuram', x: 59, y: 14 },
                { id: 14, name: 'Rabiot', x: 54, y: 36 },
                { id: 8, name: 'Tchouameni', x: 47, y: 31 },
                { id: 18, name: 'Upamecano', x: 70, y: 33 }
            ],
            fieldTilt: '58% FRA',
            ppda: '10.2 passes',
            xtGap: '-0.08 xT/min'
        },
        // Frame 2: 80:30 - Penalty call: Otamendi foul on Kolo Muani
        {
            time: '80:30',
            ball: { x: 16, y: 42, z: 0 },
            argentina: [
                { id: 10, name: 'Messi', x: 42, y: 32 },
                { id: 24, name: 'Fernandez', x: 32, y: 38 },
                { id: 7, name: 'De Paul', x: 30, y: 26 },
                { id: 13, name: 'Romero', x: 18, y: 28 },
                { id: 19, name: 'Otamendi', x: 15, y: 41 }
            ],
            france: [
                { id: 10, name: 'Mbappe', x: 32, y: 22 },
                { id: 26, name: 'Thuram', x: 24, y: 15 },
                { id: 14, name: 'Rabiot', x: 35, y: 40 },
                { id: 12, name: 'Kolo Muani', x: 14, y: 43 },
                { id: 18, name: 'Upamecano', x: 65, y: 35 }
            ],
            fieldTilt: '68% FRA',
            ppda: '7.4 passes',
            xtGap: '-0.14 xT/min'
        },
        // Frame 3: 81:40 - Mbappe scoring Penalty
        {
            time: '81:40',
            ball: { x: 4, y: 30, z: 2.2 },
            argentina: [
                { id: 10, name: 'Messi', x: 38, y: 30 },
                { id: 24, name: 'Fernandez', x: 24, y: 32 },
                { id: 7, name: 'De Paul', x: 26, y: 22 },
                { id: 13, name: 'Romero', x: 15, y: 25 },
                { id: 19, name: 'Otamendi', x: 14, y: 35 }
            ],
            france: [
                { id: 10, name: 'Mbappe', x: 12, y: 30 },
                { id: 26, name: 'Thuram', x: 18, y: 18 },
                { id: 14, name: 'Rabiot', x: 22, y: 38 },
                { id: 8, name: 'Tchouameni', x: 25, y: 28 },
                { id: 18, name: 'Upamecano', x: 55, y: 32 }
            ],
            fieldTilt: '71% FRA',
            ppda: '6.1 passes',
            xtGap: '-0.16 xT/min'
        },
        // Frame 4: 82:15 - Mbappe Volley Goal Equalizer
        {
            time: '82:15',
            ball: { x: 14, y: 22, z: 1.1 },
            argentina: [
                { id: 10, name: 'Messi', x: 35, y: 31 },
                { id: 24, name: 'Fernandez', x: 20, y: 28 },
                { id: 7, name: 'De Paul', x: 22, y: 20 },
                { id: 13, name: 'Romero', x: 12, y: 25 },
                { id: 19, name: 'Otamendi', x: 14, y: 33 }
            ],
            france: [
                { id: 10, name: 'Mbappe', x: 14, y: 21 },
                { id: 26, name: 'Thuram', x: 16, y: 24 },
                { id: 14, name: 'Rabiot', x: 25, y: 35 },
                { id: 8, name: 'Tchouameni', x: 28, y: 26 },
                { id: 18, name: 'Upamecano', x: 52, y: 32 }
            ],
            fieldTilt: '74% FRA',
            ppda: '5.8 passes',
            xtGap: '-0.18 xT/min'
        }
    ];

    // ==========================================
    // 3. TAB NAVIGATION
    // ==========================================
    const tabs = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.workspace-tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            const targetSec = document.getElementById(targetId);
            targetSec.classList.add('active');
            state.activeTab = targetId;

            // Trigger canvas adjustments
            if (targetId === 'telestrator') {
                resizePitchCanvas();
            } else if (targetId === 'var-lab') {
                resizeVARCanvas();
            } else if (targetId === 'biometrics') {
                initBiometricsCanvases();
            }
        });
    });

    // ==========================================
    // 4. 2.5D ISOMETRIC PITCH CANVAS RENDERER
    // ==========================================
    const pitchCanvas = document.getElementById('pitch-canvas');
    const pitchCtx = pitchCanvas.getContext('2d');
    const pitchContainer = document.getElementById('pitch-container');

    function resizePitchCanvas() {
        pitchCanvas.width = pitchContainer.clientWidth;
        pitchCanvas.height = pitchContainer.clientHeight;
        drawPitchFrame();
    }

    window.addEventListener('resize', () => {
        if (state.activeTab === 'telestrator') resizePitchCanvas();
        if (state.activeTab === 'var-lab') resizeVARCanvas();
    });

    // Perspective projection formula
    // Maps 2D field coordinates (0-100 length, 0-60 width) to screen space
    function project(x, y, z = 0) {
        const centerX = pitchCanvas.width / 2;
        const centerY = pitchCanvas.height * 0.48;

        let scaleX, scaleY, tilt;
        
        if (state.currentCam === 'tactical') {
            scaleX = (pitchCanvas.width / 100) * 0.72;
            scaleY = (pitchCanvas.height / 60) * 0.85;
            tilt = 0.58;
        } else if (state.currentCam === 'broadcast') {
            scaleX = (pitchCanvas.width / 100) * 0.82;
            scaleY = (pitchCanvas.height / 60) * 0.65;
            tilt = 0.36;
        } else { // var-horizon (15 deg)
            scaleX = (pitchCanvas.width / 100) * 0.95;
            scaleY = (pitchCanvas.height / 60) * 0.35;
            tilt = 0.12;
        }

        // Apply isometric tilt formula
        // Field coordinates (0,0) is bottom left from camera's view
        const px = centerX + (x - 50) * scaleX;
        const py = centerY + (y - 30) * scaleY * tilt - z * scaleY * 2.0;

        return { x: px, y: py };
    }

    // Unproject: Converts screen clicks back to 2D field coordinates
    function unproject(px, py) {
        const centerX = pitchCanvas.width / 2;
        const centerY = pitchCanvas.height * 0.48;

        let scaleX, scaleY, tilt;
        if (state.currentCam === 'tactical') {
            scaleX = (pitchCanvas.width / 100) * 0.72;
            scaleY = (pitchCanvas.height / 60) * 0.85;
            tilt = 0.58;
        } else if (state.currentCam === 'broadcast') {
            scaleX = (pitchCanvas.width / 100) * 0.82;
            scaleY = (pitchCanvas.height / 60) * 0.65;
            tilt = 0.36;
        } else {
            scaleX = (pitchCanvas.width / 100) * 0.95;
            scaleY = (pitchCanvas.height / 60) * 0.35;
            tilt = 0.12;
        }

        const x = (px - centerX) / scaleX + 50;
        const y = (py - centerY) / (scaleY * tilt) + 30;

        return { x, y };
    }

    function drawPitchFrame() {
        if (!pitchCanvas.width) return;
        pitchCtx.clearRect(0, 0, pitchCanvas.width, pitchCanvas.height);

        // Draw Pitch Grid Background
        pitchCtx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        pitchCtx.lineWidth = 1;
        for (let i = 0; i <= 100; i += 10) {
            pitchCtx.beginPath();
            const p1 = project(i, 0);
            const p2 = project(i, 60);
            pitchCtx.moveTo(p1.x, p1.y);
            pitchCtx.lineTo(p2.x, p2.y);
            pitchCtx.stroke();
        }

        // Draw Pitch Markings (Main boundaries)
        pitchCtx.strokeStyle = 'rgba(255, 0, 51, 0.35)'; // Neon pitch green lines
        pitchCtx.lineWidth = 2;
        pitchCtx.shadowBlur = 4;
        pitchCtx.shadowColor = '#FF0033';

        // Outer Bound Line
        pitchCtx.beginPath();
        const bl = project(0, 0);
        const br = project(100, 0);
        const tr = project(100, 60);
        const tl = project(0, 60);
        pitchCtx.moveTo(bl.x, bl.y);
        pitchCtx.lineTo(br.x, br.y);
        pitchCtx.lineTo(tr.x, tr.y);
        pitchCtx.lineTo(tl.x, tl.y);
        pitchCtx.closePath();
        pitchCtx.stroke();

        // Center line & center circle
        pitchCtx.beginPath();
        const mc1 = project(50, 0);
        const mc2 = project(50, 60);
        pitchCtx.moveTo(mc1.x, mc1.y);
        pitchCtx.lineTo(mc2.x, mc2.y);
        pitchCtx.stroke();

        // Center Circle (approximated with points in 2.5D)
        pitchCtx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.1) {
            const cx = 50 + 9.15 * Math.cos(a);
            const cy = 30 + 9.15 * Math.sin(a);
            const cp = project(cx, cy);
            if (a === 0) pitchCtx.moveTo(cp.x, cp.y);
            else pitchCtx.lineTo(cp.x, cp.y);
        }
        pitchCtx.closePath();
        pitchCtx.stroke();

        // Penalty boxes (Left)
        pitchCtx.beginPath();
        const l1 = project(0, 10);
        const l2 = project(16.5, 10);
        const l3 = project(16.5, 50);
        const l4 = project(0, 50);
        pitchCtx.moveTo(l1.x, l1.y);
        pitchCtx.lineTo(l2.x, l2.y);
        pitchCtx.lineTo(l3.x, l3.y);
        pitchCtx.lineTo(l4.x, l4.y);
        pitchCtx.stroke();

        // Penalty boxes (Right)
        pitchCtx.beginPath();
        const r1 = project(100, 10);
        const r2 = project(83.5, 10);
        const r3 = project(83.5, 50);
        const r4 = project(100, 50);
        pitchCtx.moveTo(r1.x, r1.y);
        pitchCtx.lineTo(r2.x, r2.y);
        pitchCtx.lineTo(r3.x, r3.y);
        pitchCtx.lineTo(r4.x, r4.y);
        pitchCtx.stroke();

        // Goal Nets (Isometric wireframes)
        pitchCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        pitchCtx.shadowColor = '#FFFFFF';
        pitchCtx.shadowBlur = 3;
        
        // Left Goal
        pitchCtx.beginPath();
        const gL1 = project(0, 26.3);
        const gL2 = project(0, 33.7);
        const gL1_h = project(0, 26.3, 2.44);
        const gL2_h = project(0, 33.7, 2.44);
        const gL1_back = project(-2, 26.3, 2.44);
        const gL2_back = project(-2, 33.7, 2.44);
        const gL1_back_g = project(-2, 26.3);
        const gL2_back_g = project(-2, 33.7);
        
        pitchCtx.moveTo(gL1.x, gL1.y);
        pitchCtx.lineTo(gL1_h.x, gL1_h.y);
        pitchCtx.lineTo(gL2_h.x, gL2_h.y);
        pitchCtx.lineTo(gL2.x, gL2.y);
        pitchCtx.stroke();
        
        pitchCtx.beginPath();
        pitchCtx.moveTo(gL1_h.x, gL1_h.y);
        pitchCtx.lineTo(gL1_back.x, gL1_back.y);
        pitchCtx.lineTo(gL2_back.x, gL2_back.y);
        pitchCtx.lineTo(gL2_h.x, gL2_h.y);
        pitchCtx.stroke();
        
        pitchCtx.beginPath();
        pitchCtx.moveTo(gL1_back.x, gL1_back.y);
        pitchCtx.lineTo(gL1_back_g.x, gL1_back_g.y);
        pitchCtx.lineTo(gL2_back_g.x, gL2_back_g.y);
        pitchCtx.lineTo(gL2_back.x, gL2_back.y);
        pitchCtx.stroke();

        pitchCtx.shadowBlur = 0; // Reset shadows for players

        // Fetch interpolated frame coordinates
        const frameData = getInterpolatedTimelineFrame();

        // Draw Attacking Pressure Zone (Shaded hull for France at 82')
        if (state.timelineVal > 70) {
            pitchCtx.fillStyle = 'rgba(255, 45, 85, 0.05)';
            pitchCtx.strokeStyle = 'rgba(255, 45, 85, 0.25)';
            pitchCtx.lineWidth = 1.5;
            pitchCtx.shadowColor = '#FF2D55';
            pitchCtx.shadowBlur = 5;
            
            pitchCtx.beginPath();
            const fNodes = frameData.france.map(n => project(n.x, n.y));
            pitchCtx.moveTo(fNodes[0].x, fNodes[0].y);
            for(let k = 1; k < fNodes.length; k++) {
                pitchCtx.lineTo(fNodes[k].x, fNodes[k].y);
            }
            pitchCtx.closePath();
            pitchCtx.fill();
            pitchCtx.stroke();
            pitchCtx.shadowBlur = 0;
        }

        // Draw Player Nodes
        // 1. Argentina Nodes (Blue/White)
        frameData.argentina.forEach(p => {
            const screenPos = project(p.x, p.y);
            
            // Drop shadow ellipse
            pitchCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            pitchCtx.beginPath();
            pitchCtx.ellipse(screenPos.x, screenPos.y + 4, 8, 4, 0, 0, Math.PI*2);
            pitchCtx.fill();

            // Player node circle
            pitchCtx.fillStyle = '#0A0F1D';
            pitchCtx.strokeStyle = '#FFFFFF';
            pitchCtx.lineWidth = 2.5;
            pitchCtx.beginPath();
            pitchCtx.arc(screenPos.x, screenPos.y, 11, 0, Math.PI*2);
            pitchCtx.fill();
            pitchCtx.stroke();

            // Player jersey number text
            pitchCtx.fillStyle = '#FFFFFF';
            pitchCtx.font = 'bold 10px Outfit';
            pitchCtx.textAlign = 'center';
            pitchCtx.textBaseline = 'middle';
            pitchCtx.fillText(p.id, screenPos.x, screenPos.y);

            // Small text marker above player
            pitchCtx.fillStyle = 'rgba(255,255,255,0.7)';
            pitchCtx.font = '8px Outfit';
            pitchCtx.fillText(p.name, screenPos.x, screenPos.y - 18);
        });

        // 2. France Nodes (Red)
        frameData.france.forEach(p => {
            const screenPos = project(p.x, p.y);
            
            // Drop shadow
            pitchCtx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            pitchCtx.beginPath();
            pitchCtx.ellipse(screenPos.x, screenPos.y + 4, 8, 4, 0, 0, Math.PI*2);
            pitchCtx.fill();

            // Player node circle
            pitchCtx.fillStyle = '#0A0F1D';
            pitchCtx.strokeStyle = '#FF2D55';
            pitchCtx.lineWidth = 2.5;
            pitchCtx.beginPath();
            pitchCtx.arc(screenPos.x, screenPos.y, 11, 0, Math.PI*2);
            pitchCtx.fill();
            pitchCtx.stroke();

            // Player number text
            pitchCtx.fillStyle = '#FFFFFF';
            pitchCtx.font = 'bold 10px Outfit';
            pitchCtx.textAlign = 'center';
            pitchCtx.textBaseline = 'middle';
            pitchCtx.fillText(p.id, screenPos.x, screenPos.y);

            // Text marker above player
            pitchCtx.fillStyle = 'rgba(255,255,255,0.7)';
            pitchCtx.font = '8px Outfit';
            pitchCtx.fillText(p.name, screenPos.x, screenPos.y - 18);
        });

        // Draw The Ball (Glowing Gold Node with trajectory traces)
        const ballPos = project(frameData.ball.x, frameData.ball.y, frameData.ball.z);
        const ballShadow = project(frameData.ball.x, frameData.ball.y, 0);

        // Ball Shadow
        pitchCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        pitchCtx.beginPath();
        pitchCtx.arc(ballShadow.x, ballShadow.y, 5, 0, Math.PI * 2);
        pitchCtx.fill();

        // Ball node circle
        pitchCtx.fillStyle = '#FFAE00';
        pitchCtx.strokeStyle = '#FFFFFF';
        pitchCtx.lineWidth = 1.5;
        pitchCtx.shadowColor = '#FFAE00';
        pitchCtx.shadowBlur = 8;
        pitchCtx.beginPath();
        pitchCtx.arc(ballPos.x, ballPos.y, 6, 0, Math.PI * 2);
        pitchCtx.fill();
        pitchCtx.stroke();
        pitchCtx.shadowBlur = 0; // Reset

        // Render saved telestrator drawings
        state.sketches.forEach(sketch => {
            drawSketchOnPitch(sketch);
        });

        // Render current active sketch
        if (state.isDrawing && state.activeDrawPoints.length > 1) {
            drawSketchOnPitch({
                type: state.currentTool,
                points: state.activeDrawPoints
            });
        }
    }

    // Subroutine to draw sketch vectors on Canvas
    function drawSketchOnPitch(sketch) {
        if (sketch.points.length < 2) return;

        pitchCtx.lineWidth = 3;
        pitchCtx.lineCap = 'round';
        pitchCtx.lineJoin = 'round';

        if (sketch.type === 'run') {
            pitchCtx.strokeStyle = '#FF0033';
            pitchCtx.setLineDash([6, 6]);
            pitchCtx.shadowColor = '#FF0033';
            pitchCtx.shadowBlur = 4;
            
            pitchCtx.beginPath();
            const start = project(sketch.points[0].x, sketch.points[0].y);
            pitchCtx.moveTo(start.x, start.y);
            for (let i = 1; i < sketch.points.length; i++) {
                const pt = project(sketch.points[i].x, sketch.points[i].y);
                pitchCtx.lineTo(pt.x, pt.y);
            }
            pitchCtx.stroke();
            pitchCtx.setLineDash([]); // Reset
            
            // Draw arrow head at end point
            const endIdx = sketch.points.length - 1;
            const ptEnd = project(sketch.points[endIdx].x, sketch.points[endIdx].y);
            const ptPrev = project(sketch.points[endIdx-1].x, sketch.points[endIdx-1].y);
            
            const angle = Math.atan2(ptEnd.y - ptPrev.y, ptEnd.x - ptPrev.x);
            pitchCtx.fillStyle = '#FF0033';
            pitchCtx.beginPath();
            pitchCtx.moveTo(ptEnd.x, ptEnd.y);
            pitchCtx.lineTo(ptEnd.x - 12 * Math.cos(angle - Math.PI/6), ptEnd.y - 12 * Math.sin(angle - Math.PI/6));
            pitchCtx.lineTo(ptEnd.x - 12 * Math.cos(angle + Math.PI/6), ptEnd.y - 12 * Math.sin(angle + Math.PI/6));
            pitchCtx.closePath();
            pitchCtx.fill();
            pitchCtx.shadowBlur = 0;

        } else if (sketch.type === 'pass') {
            pitchCtx.strokeStyle = '#FFFFFF';
            pitchCtx.shadowColor = '#FFFFFF';
            pitchCtx.shadowBlur = 4;

            // Draw a curved pass pathway with a parabolic height tracing
            pitchCtx.beginPath();
            const start = project(sketch.points[0].x, sketch.points[0].y);
            pitchCtx.moveTo(start.x, start.y);

            const len = sketch.points.length;
            for (let i = 1; i < len; i++) {
                // Calculate curve offset (z height factor)
                const t = i / (len - 1);
                const height = Math.sin(t * Math.PI) * 15; // Max arc height of 15m
                const pt = project(sketch.points[i].x, sketch.points[i].y, height);
                pitchCtx.lineTo(pt.x, pt.y);
            }
            pitchCtx.stroke();
            pitchCtx.shadowBlur = 0;

        } else if (sketch.type === 'measure') {
            pitchCtx.strokeStyle = '#FFAE00';
            pitchCtx.shadowColor = '#FFAE00';
            pitchCtx.shadowBlur = 4;

            const startPt = sketch.points[0];
            const endPt = sketch.points[sketch.points.length - 1];
            
            const pStart = project(startPt.x, startPt.y);
            const pEnd = project(endPt.x, endPt.y);

            // Draw caliper line
            pitchCtx.beginPath();
            pitchCtx.moveTo(pStart.x, pStart.y);
            pitchCtx.lineTo(pEnd.x, pEnd.y);
            pitchCtx.stroke();

            // Caliper ticks
            const angle = Math.atan2(pEnd.y - pStart.y, pEnd.x - pStart.x);
            const tickLen = 8;
            pitchCtx.beginPath();
            pitchCtx.moveTo(pStart.x - tickLen * Math.sin(angle), pStart.y + tickLen * Math.cos(angle));
            pitchCtx.lineTo(pStart.x + tickLen * Math.sin(angle), pStart.y - tickLen * Math.cos(angle));
            pitchCtx.moveTo(pEnd.x - tickLen * Math.sin(angle), pEnd.y + tickLen * Math.cos(angle));
            pitchCtx.lineTo(pEnd.x + tickLen * Math.sin(angle), pEnd.y - tickLen * Math.cos(angle));
            pitchCtx.stroke();

            // Calculate distance in meters (1 unit on grid is ~1.05m)
            const dx = endPt.x - startPt.x;
            const dy = endPt.y - startPt.y;
            const meters = (Math.sqrt(dx * dx + dy * dy) * 1.05).toFixed(1);

            // Print text label in center of caliper
            const midX = (pStart.x + pEnd.x) / 2;
            const midY = (pStart.y + pEnd.y) / 2;
            pitchCtx.fillStyle = '#FFAE00';
            pitchCtx.font = 'bold 10px Outfit';
            pitchCtx.textAlign = 'center';
            pitchCtx.fillText(`${meters}m`, midX, midY - 10);
            pitchCtx.shadowBlur = 0;
        }
    }

    // Coordinate interpolation logic across frame indices (0 to 4)
    function getInterpolatedTimelineFrame() {
        const totalFrames = matchSimulationTimeline.length - 1;
        const rawIndex = (state.timelineVal / 100) * totalFrames;
        const lowerIndex = Math.floor(rawIndex);
        const upperIndex = Math.min(lowerIndex + 1, totalFrames);
        const weight = rawIndex - lowerIndex;

        const f1 = matchSimulationTimeline[lowerIndex];
        const f2 = matchSimulationTimeline[upperIndex];

        // Interpolate Ball
        const ball = {
            x: f1.ball.x + (f2.ball.x - f1.ball.x) * weight,
            y: f1.ball.y + (f2.ball.y - f1.ball.y) * weight,
            z: f1.ball.z + (f2.ball.z - f1.ball.z) * weight
        };

        // Interpolate Argentina
        const argentina = f1.argentina.map((p, idx) => {
            const p2 = f2.argentina[idx];
            return {
                id: p.id,
                name: p.name,
                x: p.x + (p2.x - p.x) * weight,
                y: p.y + (p2.y - p.y) * weight
            };
        });

        // Interpolate France
        const france = f1.france.map((p, idx) => {
            const p2 = f2.france[idx];
            return {
                id: p.id,
                name: p.name,
                x: p.x + (p2.x - p.x) * weight,
                y: p.y + (p2.y - p.y) * weight
            };
        });

        return { ball, argentina, france };
    }

    // ==========================================
    // 5. MOUSE EVENT HANDLERS FOR ELEVATION DRAWING
    // ==========================================
    pitchCanvas.addEventListener('mousedown', (e) => {
        const rect = pitchCanvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        state.isDrawing = true;
        const fieldCoord = unproject(px, py);
        state.activeDrawPoints = [fieldCoord];
    });

    pitchCanvas.addEventListener('mousemove', (e) => {
        if (!state.isDrawing) return;

        const rect = pitchCanvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;

        const fieldCoord = unproject(px, py);
        
        // Push point if distance exceeds a threshold
        const lastPt = state.activeDrawPoints[state.activeDrawPoints.length - 1];
        const dx = fieldCoord.x - lastPt.x;
        const dy = fieldCoord.y - lastPt.y;
        if (Math.sqrt(dx * dx + dy * dy) > 0.5) {
            state.activeDrawPoints.push(fieldCoord);
            drawPitchFrame();
        }
    });

    window.addEventListener('mouseup', () => {
        if (!state.isDrawing) return;
        state.isDrawing = false;
        
        if (state.activeDrawPoints.length > 1) {
            state.sketches.push({
                type: state.currentTool,
                points: state.activeDrawPoints
            });
        }
        state.activeDrawPoints = [];
        drawPitchFrame();
    });

    // ==========================================
    // 6. TELESTRATOR HUD / TOOLS CONTROLLERS
    // ==========================================
    document.getElementById('cam-tactical').addEventListener('click', (e) => { setCam('tactical', e.target); });
    document.getElementById('cam-broadcast').addEventListener('click', (e) => { setCam('broadcast', e.target); });
    document.getElementById('cam-var').addEventListener('click', (e) => { setCam('var', e.target); });

    function setCam(camType, buttonEl) {
        document.querySelectorAll('.cam-btn').forEach(btn => btn.classList.remove('active'));
        buttonEl.classList.add('active');
        state.currentCam = camType;
        drawPitchFrame();
    }

    document.getElementById('tool-run').addEventListener('click', (e) => { setTool('run', e.currentTarget); });
    document.getElementById('tool-pass').addEventListener('click', (e) => { setTool('pass', e.currentTarget); });
    document.getElementById('tool-measure').addEventListener('click', (e) => { setTool('measure', e.currentTarget); });

    function setTool(toolName, buttonEl) {
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        buttonEl.classList.add('active');
        state.currentTool = toolName;
    }

    document.getElementById('clear-sketch').addEventListener('click', () => {
        state.sketches = [];
        document.getElementById('sketch-analysis-result').innerHTML = `
            Use the telestrator tools to draw passing paths, attacking runs, or gaps directly on the 2.5D pitch, then click <strong>Analyze Sketched Play</strong>.
        `;
        drawPitchFrame();
    });

    // Sketch-to-AI Parser
    document.getElementById('analyze-play-btn').addEventListener('click', async () => {
        if (state.sketches.length === 0) {
            document.getElementById('sketch-analysis-result').innerHTML = "No sketched vectors detected. Please draw on the pitch using the tools above.";
            return;
        }

        const resBox = document.getElementById('sketch-analysis-result');
        resBox.innerHTML = '<div class="ai-typing"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div> Analyzing via IBM Granite...';
        
        // Try backend API
        let explanation = await apiAnalyzePlay(state.sketches, state.currentCam, state.simTime);
        
        if (!explanation) {
            // Fallback to built-in
            await new Promise(r => setTimeout(r, 1200));
            const lastSketch = state.sketches[state.sketches.length - 1];
            if (lastSketch.type === 'run') {
                explanation = `<strong>IBM Granite (Tactical Agent):</strong> Analyzed custom run vector starting at [${lastSketch.points[0].x.toFixed(1)}, ${lastSketch.points[0].y.toFixed(1)}]. The attacking player is exploiting the horizontal space created by the overlapping run, pulling the Argentine defender away and exposing the inner channels with a 72% success probability.`;
            } else if (lastSketch.type === 'pass') {
                explanation = `<strong>IBM Granite (Tactical Agent):</strong> Evaluated parabolic pass curve. The trajectory clears Romero's defensive intercept reach, targeting the space behind the fullback. Expected reception probability: 64% based on current node velocities.`;
            } else {
                explanation = `<strong>IBM Granite (Tactical Agent):</strong> Calculated gap caliper distance. A distance of this width between central defenders exposes Argentina to direct central penetration, forcing the goalkeeper to shift their defensive orientation.`;
            }
        }
        
        explanation = formatAIResponse(explanation);
        resBox.innerHTML = explanation;
    });

    // Playback timeline controller
    const timelineRange = document.getElementById('timeline-range');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const simTimeDisplay = document.getElementById('sim-time-display');

    timelineRange.addEventListener('input', (e) => {
        state.timelineVal = parseInt(e.target.value);
        updateTimelineDetails();
    });

    playPauseBtn.addEventListener('click', () => {
        state.isPlaying = !state.isPlaying;
        if (state.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
            document.getElementById('telestrator-status').innerText = 'TELEMETRY STREAM ACTIVE';
            document.getElementById('telestrator-status').style.color = 'var(--neon-green)';
            runPlaybackLoop();
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            document.getElementById('telestrator-status').innerText = 'PLAYBACK PAUSED (DRAW ACTIVE)';
            document.getElementById('telestrator-status').style.color = 'var(--neon-cyan)';
        }
    });

    function updateTimelineDetails() {
        drawPitchFrame();
        
        // Calculate simulated time string
        const lowerIdx = Math.floor((state.timelineVal / 100) * (matchSimulationTimeline.length - 1));
        const activeFrame = matchSimulationTimeline[lowerIdx];
        state.simTime = activeFrame.time;
        
        simTimeDisplay.innerText = activeFrame.time;
        document.getElementById('hud-match-time').innerText = activeFrame.time;

        // Update command center values dynamically if active
        const xtGapEl = document.getElementById('xt-gap-val');
        const ppdaEl = document.getElementById('ppda-val');
        const tiltEl = document.getElementById('field-tilt-val');
        
        if (xtGapEl) xtGapEl.innerHTML = activeFrame.xtGap.split(' ')[0];
        if (ppdaEl) ppdaEl.innerHTML = activeFrame.ppda.split(' ')[0];
        if (tiltEl) tiltEl.innerHTML = activeFrame.fieldTilt.split(' ')[0];

        // Animate circular progress gauges
        const gaugeXt = document.getElementById('gauge-xt-circle');
        const gaugePpda = document.getElementById('gauge-ppda-circle');
        const gaugeTilt = document.getElementById('gauge-tilt-circle');

        if (gaugeXt) {
            const xtVal = Math.abs(parseFloat(activeFrame.xtGap));
            const xtPct = Math.max(10, Math.min(100, xtVal * 400));
            gaugeXt.setAttribute('stroke-dasharray', `${xtPct}, 100`);
        }
        if (gaugePpda) {
            const ppdaVal = parseFloat(activeFrame.ppda);
            const ppdaPct = Math.max(10, Math.min(100, 100 - ppdaVal * 5));
            gaugePpda.setAttribute('stroke-dasharray', `${ppdaPct}, 100`);
        }
        if (gaugeTilt) {
            const tiltVal = parseFloat(activeFrame.fieldTilt);
            gaugeTilt.setAttribute('stroke-dasharray', `${tiltVal}, 100`);
        }
        
        // Animate indicator dot on the momentum wave SVG chart
        const pctX = 50 + (state.timelineVal / 100) * 520;
        
        // Interpolated curve points for Argentina/France control
        const argY = 120 - 40 * Math.sin((state.timelineVal / 100) * Math.PI);
        const fraY = 120 + 60 * Math.pow(state.timelineVal / 100, 2);
        
        const dot = document.getElementById('momentum-indicator-dot');
        const line = document.getElementById('momentum-time-indicator');
        
        if (dot && line) {
            dot.setAttribute('cx', pctX);
            dot.setAttribute('cy', (state.timelineVal < 60) ? argY : fraY);
            line.setAttribute('x1', pctX);
            line.setAttribute('x2', pctX);
        }
        
        // Trigger live biometrics updates as the timeline moves
        if (state.activeTab === 'biometrics') {
            updatePlayerBiometrics();
        }
    }

    function runPlaybackLoop() {
        if (!state.isPlaying) return;

        state.timelineVal += 0.5;
        if (state.timelineVal > 100) {
            state.timelineVal = 0;
        }

        timelineRange.value = Math.floor(state.timelineVal);
        updateTimelineDetails();

        requestAnimationFrame(runPlaybackLoop);
    }

    // ==========================================
    // 7. VAR CALIBRATION LAB CODE
    // ==========================================
    const varCanvas = document.getElementById('var-canvas');
    const varCtx = varCanvas.getContext('2d');
    const varCanvasWrapper = document.getElementById('var-canvas-wrapper');
    const zoomCanvas = document.getElementById('zoom-canvas');
    const zoomCtx = zoomCanvas.getContext('2d');
    const zoomLoupe = document.getElementById('zoom-loupe');

    // Drag tracking for offside line check
    let activeDragLine = null; // 'defender' or 'attacker'

    function resizeVARCanvas() {
        varCanvas.width = varCanvasWrapper.clientWidth;
        varCanvas.height = varCanvasWrapper.clientHeight;
        drawVARScene();
    }

    const varButtons = document.querySelectorAll('.var-selector-btn');
    varButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            varButtons.forEach(b => b.classList.remove('active'));
            const currentBtn = e.currentTarget;
            currentBtn.classList.add('active');
            
            const varType = currentBtn.getAttribute('data-type');
            state.varType = varType;

            // Hide/show respective calibration panels
            document.getElementById('calibrator-card-offside').classList.add('hidden');
            document.getElementById('calibrator-card-handball').classList.add('hidden');
            document.getElementById('calibrator-card-tackle').classList.add('hidden');

            document.getElementById(`calibrator-card-${varType}`).classList.remove('hidden');

            // Hide/show zoom lens HUD
            if (varType === 'offside') {
                zoomLoupe.classList.remove('hidden');
            } else {
                zoomLoupe.classList.add('hidden');
            }

            drawVARScene();
        });
    });

    // Slider Listeners
    document.getElementById('slider-defender-line').addEventListener('input', (e) => {
        state.offsideDefenderX = parseInt(e.target.value);
        document.getElementById('slider-defender-val').innerText = `${state.offsideDefenderX}px`;
        calculateOffside();
        drawVARScene();
    });

    document.getElementById('slider-attacker-line').addEventListener('input', (e) => {
        state.offsideAttackerX = parseInt(e.target.value);
        document.getElementById('slider-attacker-val').innerText = `${state.offsideAttackerX}px`;
        calculateOffside();
        drawVARScene();
    });

    function calculateOffside() {
        const deltaPx = state.offsideAttackerX - state.offsideDefenderX;
        // pixel-to-centimeter coefficient
        const cmOffset = (deltaPx * 0.45).toFixed(1);
        
        document.getElementById('px-delta-val').innerText = `${deltaPx}px`;
        const offsetText = document.getElementById('var-offset-cm');

        if (deltaPx < 0) {
            offsetText.innerText = `${cmOffset} cm (OFFSIDE)`;
            offsetText.className = 'text-crimson font-bold';
            updateVARCompanion(
                'IFAB LAW 11',
                'OFFSIDE VIOLATION CALIBRATED',
                `Under IFAB Law 11, the Hawk-Eye sub-pixel coordinate resolver indicates the attacker's forward toe is ${Math.abs(cmOffset)}cm closer to the goal line than the defender's shoulder cylinder axis. Verdict: OFFSIDE. Free kick awarded.`
            );
        } else {
            offsetText.innerText = `+${cmOffset} cm (ON PLAY)`;
            offsetText.className = 'text-green font-bold';
            updateVARCompanion(
                'IFAB LAW 11',
                'ON PLAY CONFIRMED (NO OFFSIDE)',
                `Under IFAB Law 11, the attacker's toe is aligned ${cmOffset}cm behind the defensive sleeve threshold. The player is onside. Verdict: ON PLAY. Play stands.`
            );
        }
    }

    document.getElementById('slider-arm-angle').addEventListener('input', (e) => {
        state.handballArmAngle = parseInt(e.target.value);
        document.getElementById('slider-arm-val').innerText = `${state.handballArmAngle}°`;
        
        // Calculate silhouette enlargement %
        const exp = Math.max(0, (state.handballArmAngle - 25) * 0.38);
        document.getElementById('silhouette-expansion-val').innerText = `+${exp.toFixed(1)}%`;
        
        const statusVal = document.getElementById('handball-status-val');
        
        if (state.handballArmAngle > 40) {
            statusVal.innerText = 'UNNATURAL SILHOUETTE (HANDBALL)';
            statusVal.className = 'text-crimson font-bold';
            updateVARCompanion(
                'IFAB LAW 12',
                'HANDBALL INFRINGEMENT DETECTED',
                `Under IFAB Law 12, the player rotated their shoulder joint by ${state.handballArmAngle}°, causing their arm to expand past their natural body frame cylinder by ${exp.toFixed(1)}%. This position is not a natural consequence of body movement. Verdict: PENALTY.`
            );
        } else {
            statusVal.innerText = 'NATURAL STANCE (NO FOUL)';
            statusVal.className = 'text-green font-bold';
            updateVARCompanion(
                'IFAB LAW 12',
                'HANDBALL CHECK - CLEAN STANCE',
                `Under IFAB Law 12, the defender's arm remains close to the body core inside the natural silhouette cylinder limit (+${exp.toFixed(1)}% expansion). Arm is in a natural defensive position. Verdict: PLAY ON.`
            );
        }

        drawVARScene();
    });

    document.getElementById('slider-tackle-velocity').addEventListener('input', (e) => {
        state.tackleVelocity = parseInt(e.target.value);
        const ms = (state.tackleVelocity / 10).toFixed(1);
        document.getElementById('slider-velocity-val').innerText = `${ms} m/s`;
        
        // Compute force G
        const forceG = (Math.pow(state.tackleVelocity / 10, 1.8) * 0.25).toFixed(1);
        document.getElementById('force-g-val').innerText = `${forceG} G`;
        
        const verdVal = document.getElementById('tackle-verdict-val');
        
        if (state.tackleVelocity > 60) {
            verdVal.innerText = 'RED CARD (EXCESSIVE FORCE)';
            verdVal.className = 'text-crimson font-bold';
            updateVARCompanion(
                'IFAB LAW 12',
                'SERIOUS FOUL PLAY - EXCESSIVE FORCE',
                `Under IFAB Law 12, the slide challenge executed at ${ms}m/s generated a lateral impact force of ${forceG}G with exposed studs contact above the ankle line, endangering player safety. Verdict: DISMISSAL (RED CARD).`
            );
        } else if (state.tackleVelocity > 35) {
            verdVal.innerText = 'YELLOW CARD (RECKLESS TACKLE)';
            verdVal.className = 'text-yellow font-bold';
            updateVARCompanion(
                'IFAB LAW 12',
                'CAUTIONABLE OFFENSE - RECKLESS CHALLENGE',
                `Under IFAB Law 12, the challenge occurred at ${ms}m/s with an impact force of ${forceG}G. The defender made late contact without playing the ball, representing reckless disregard for safety. Verdict: CAUTION (YELLOW CARD).`
            );
        } else {
            verdVal.innerText = 'CLEAN CHALLENGE (NO CARD)';
            verdVal.className = 'text-green font-bold';
            updateVARCompanion(
                'IFAB LAW 12',
                'CLEAN BALL CHALLENGE',
                `Under IFAB Law 12, the tackle velocity of ${ms}m/s (${forceG}G force) shows controlled deceleration. The player made clean contact on the ball first. Verdict: PLAY ON.`
            );
        }

        drawVARScene();
    });

    function updateVARCompanion(law, title, text) {
        document.querySelector('.rule-law-badge').innerText = law;
        document.getElementById('var-rule-law-name').innerText = title;
        document.getElementById('var-explainer-text').innerText = text;
    }

    function drawVARScene() {
        if (!varCanvas.width) return;
        varCtx.clearRect(0, 0, varCanvas.width, varCanvas.height);

        if (state.varType === 'offside') {
            // Draw 3D-like VAR offside viewport scene
            varCtx.fillStyle = '#060B12';
            varCtx.fillRect(0, 0, varCanvas.width, varCanvas.height);

            // Draw field perspective gridlines
            varCtx.strokeStyle = 'rgba(255, 0, 51, 0.08)';
            varCtx.lineWidth = 1.5;
            for (let j = 0; j < varCanvas.width; j += 40) {
                varCtx.beginPath();
                varCtx.moveTo(j, varCanvas.height);
                varCtx.lineTo(varCanvas.width / 2 + (j - varCanvas.width / 2) * 0.1, 0);
                varCtx.stroke();
            }

            // Draw defender (Slightly stylized node)
            varCtx.fillStyle = '#0E1726';
            varCtx.strokeStyle = '#FFFFFF';
            varCtx.lineWidth = 3;
            varCtx.beginPath();
            varCtx.arc(330, 210, 28, 0, Math.PI*2);
            varCtx.fill();
            varCtx.stroke();
            varCtx.fillStyle = '#FFFFFF';
            varCtx.font = 'bold 12px Outfit';
            varCtx.fillText('ROMERO', 330, 214);

            // Draw attacker (Mbappe)
            varCtx.fillStyle = '#0E1726';
            varCtx.strokeStyle = '#FF2D55';
            varCtx.lineWidth = 3;
            varCtx.beginPath();
            varCtx.arc(315, 160, 25, 0, Math.PI*2);
            varCtx.fill();
            varCtx.stroke();
            varCtx.fillStyle = '#FFFFFF';
            varCtx.font = 'bold 12px Outfit';
            varCtx.fillText('MBAPPE', 315, 164);

            // Draw calibration lines
            // Defender guideline (Blue)
            varCtx.strokeStyle = '#FFFFFF';
            varCtx.lineWidth = 2.5;
            varCtx.shadowColor = '#FFFFFF';
            varCtx.shadowBlur = 6;
            varCtx.beginPath();
            varCtx.moveTo(state.offsideDefenderX, 0);
            varCtx.lineTo(state.offsideDefenderX, varCanvas.height);
            varCtx.stroke();

            // Attacker guideline (Red)
            varCtx.strokeStyle = '#FF2D55';
            varCtx.shadowColor = '#FF2D55';
            varCtx.beginPath();
            varCtx.moveTo(state.offsideAttackerX, 0);
            varCtx.lineTo(state.offsideAttackerX, varCanvas.height);
            varCtx.stroke();
            varCtx.shadowBlur = 0; // Reset

            // Update Zoom Loupe
            updateZoomLoupe();

        } else if (state.varType === 'handball') {
            // Draw skeletal wireframe stance simulator
            varCtx.fillStyle = '#060B12';
            varCtx.fillRect(0, 0, varCanvas.width, varCanvas.height);

            const cx = varCanvas.width / 2;
            const cy = varCanvas.height * 0.45;

            // Draw natural cylinder boundary
            varCtx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            varCtx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            varCtx.lineWidth = 2.5;
            varCtx.setLineDash([4, 4]);
            varCtx.beginPath();
            varCtx.rect(cx - 50, cy - 80, 100, 190);
            varCtx.fill();
            varCtx.stroke();
            varCtx.setLineDash([]);

            // Draw player skeletal torso
            varCtx.strokeStyle = '#FFFFFF';
            varCtx.lineWidth = 4;
            varCtx.lineCap = 'round';
            
            // Spine
            varCtx.beginPath();
            varCtx.moveTo(cx, cy - 50);
            varCtx.lineTo(cx, cy + 50);
            varCtx.stroke();

            // Shoulders
            varCtx.beginPath();
            varCtx.moveTo(cx - 40, cy - 40);
            varCtx.lineTo(cx + 40, cy - 40);
            varCtx.stroke();

            // Head
            varCtx.fillStyle = '#FFFFFF';
            varCtx.beginPath();
            varCtx.arc(cx, cy - 65, 12, 0, Math.PI*2);
            varCtx.fill();

            // Left Arm (Draggable joint)
            // Calculate joint angles relative to shoulder (cx - 40, cy - 40)
            const radAngle = (state.handballArmAngle * Math.PI) / 180;
            const elbowX = (cx - 40) - 35 * Math.sin(radAngle);
            const elbowY = (cy - 40) + 35 * Math.cos(radAngle);
            const handX = elbowX - 30 * Math.sin(radAngle);
            const handY = elbowY + 30 * Math.cos(radAngle);

            // Check collision with cylinder (cylinder edge is cx - 50)
            const collision = (handX < cx - 50 || elbowX < cx - 50);

            varCtx.strokeStyle = collision ? '#FF2D55' : '#FF0033';
            varCtx.shadowColor = collision ? '#FF2D55' : '#FF0033';
            varCtx.shadowBlur = 6;
            varCtx.lineWidth = 5;
            
            varCtx.beginPath();
            varCtx.moveTo(cx - 40, cy - 40);
            varCtx.lineTo(elbowX, elbowY);
            varCtx.lineTo(handX, handY);
            varCtx.stroke();
            varCtx.shadowBlur = 0;

            // Draw Joint Dots
            varCtx.fillStyle = '#FFFFFF';
            varCtx.beginPath();
            varCtx.arc(cx - 40, cy - 40, 4, 0, Math.PI*2);
            varCtx.arc(elbowX, elbowY, 4, 0, Math.PI*2);
            varCtx.arc(handX, handY, 4, 0, Math.PI*2);
            varCtx.fill();

            // Draw natural right arm (Clean stance)
            varCtx.strokeStyle = '#FFFFFF';
            varCtx.lineWidth = 4;
            varCtx.beginPath();
            varCtx.moveTo(cx + 40, cy - 40);
            varCtx.lineTo(cx + 48, cy + 5);
            varCtx.lineTo(cx + 45, cy + 40);
            varCtx.stroke();

        } else if (state.varType === 'tackle') {
            // Draw slide tackle kinetics
            varCtx.fillStyle = '#060B12';
            varCtx.fillRect(0, 0, varCanvas.width, varCanvas.height);

            const cx = varCanvas.width / 2;
            const cy = varCanvas.height * 0.5;

            // Attacker foot (Target)
            varCtx.strokeStyle = '#FFFFFF';
            varCtx.lineWidth = 5;
            varCtx.beginPath();
            varCtx.moveTo(cx, cy - 60);
            varCtx.lineTo(cx, cy + 40);
            varCtx.stroke();
            varCtx.fillStyle = '#FFFFFF';
            varCtx.beginPath();
            varCtx.arc(cx, cy - 60, 10, 0, Math.PI*2);
            varCtx.fill();

            // Slide tackler leg vector
            // The velocity slider pushes the slide leg closer
            const slideOffset = (state.tackleVelocity - 10) * 1.2;
            const tacklerX = cx - 110 + slideOffset;
            const tacklerY = cy + 25 - slideOffset * 0.15;

            varCtx.strokeStyle = (state.tackleVelocity > 60) ? '#FF2D55' : '#FFAE00';
            varCtx.lineWidth = 7;
            varCtx.shadowColor = varCtx.strokeStyle;
            varCtx.shadowBlur = 6;
            
            varCtx.beginPath();
            varCtx.moveTo(tacklerX - 80, cy + 40); // Hip
            varCtx.lineTo(tacklerX, tacklerY);     // Boot contact
            varCtx.stroke();
            varCtx.shadowBlur = 0;

            // Draw impact force vector arrow
            if (tacklerX > cx - 20) {
                varCtx.strokeStyle = '#FF2D55';
                varCtx.fillStyle = '#FF2D55';
                varCtx.lineWidth = 3;
                varCtx.beginPath();
                varCtx.moveTo(cx, cy + 20);
                varCtx.lineTo(cx + 50, cy + 10);
                varCtx.stroke();
                
                // Arrow head
                varCtx.beginPath();
                varCtx.moveTo(cx + 50, cy + 10);
                varCtx.lineTo(cx + 40, cy);
                varCtx.lineTo(cx + 42, cy + 20);
                varCtx.closePath();
                varCtx.fill();

                varCtx.fillStyle = '#FFFFFF';
                varCtx.font = 'bold 10px Outfit';
                varCtx.fillText('IMPACT VECTOR', cx + 25, cy - 10);
            }
        }
    }

    // Handles the VAR sub-pixel zoom loupe canvas updates
    function updateZoomLoupe() {
        if (!zoomCanvas) return;
        
        // Clear lens
        zoomCtx.fillStyle = '#000';
        zoomCtx.fillRect(0, 0, zoomCanvas.width, zoomCanvas.height);

        // Determine coordinates to magnify (focus on the active guideline)
        const activeX = (activeDragLine === 'attacker') ? state.offsideAttackerX : state.offsideDefenderX;
        const activeY = 180; // approximate center y height of player nodes

        // Copy a 25x25 rect from main canvas and blow it up to 100x100 (4x magnification)
        zoomCtx.drawImage(
            varCanvas,
            activeX - 12.5,
            activeY - 12.5,
            25,
            25,
            0,
            0,
            100,
            100
        );

        // Update coordinate meta string
        document.getElementById('zoom-pixel-coord').innerText = `X: ${activeX.toFixed(1)}, Y: ${activeY.toFixed(1)}`;
    }

    // Draggable lines handler on VAR canvas
    varCanvas.addEventListener('mousedown', (e) => {
        if (state.varType !== 'offside') return;

        const rect = varCanvas.getBoundingClientRect();
        const px = e.clientX - rect.left;

        // Check proximity to defender or attacker lines
        const dDefender = Math.abs(px - state.offsideDefenderX);
        const dAttacker = Math.abs(px - state.offsideAttackerX);

        if (dDefender < 20 && dDefender < dAttacker) {
            activeDragLine = 'defender';
        } else if (dAttacker < 20) {
            activeDragLine = 'attacker';
        }
    });

    varCanvas.addEventListener('mousemove', (e) => {
        if (!activeDragLine) return;

        const rect = varCanvas.getBoundingClientRect();
        const px = Math.max(50, Math.min(varCanvas.width - 50, e.clientX - rect.left));

        if (activeDragLine === 'defender') {
            state.offsideDefenderX = px;
            document.getElementById('slider-defender-line').value = px;
            document.getElementById('slider-defender-val').innerText = `${px.toFixed(0)}px`;
        } else {
            state.offsideAttackerX = px;
            document.getElementById('slider-attacker-line').value = px;
            document.getElementById('slider-attacker-val').innerText = `${px.toFixed(0)}px`;
        }

        calculateOffside();
        drawVARScene();
    });

    window.addEventListener('mouseup', () => {
        activeDragLine = null;
    });


    // ==========================================
    // 8. PLAYER BIOMETRICS HUD MODULES
    // ==========================================
    const ecgCanvas = document.getElementById('ecg-canvas');
    const ecgCtx = ecgCanvas.getContext('2d');
    const gforceCanvas = document.getElementById('gforce-canvas');
    const gforceCtx = gforceCanvas.getContext('2d');
    const radarCanvas = document.getElementById('radar-canvas');
    const radarCtx = radarCanvas.getContext('2d');

    const bioTabs = document.querySelectorAll('.player-tab-btn');
    bioTabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            bioTabs.forEach(b => b.classList.remove('active'));
            const currentTab = e.currentTarget;
            currentTab.classList.add('active');
            
            state.selectedPlayer = currentTab.getAttribute('data-player');
            updatePlayerBiometrics();
        });
    });

    function initBiometricsCanvases() {
        if (!ecgCanvas.width) {
            ecgCanvas.width = ecgCanvas.parentElement.clientWidth;
            ecgCanvas.height = ecgCanvas.parentElement.clientHeight;
        }
        
        state.heartRateHistory = Array(60).fill(130);
        state.stressHistory = Array(60).fill(40);
        
        updatePlayerBiometrics();
    }

    function updatePlayerBiometrics() {
        const strainGauge = document.getElementById('bio-strain-gauge');
        const strainText = document.getElementById('bio-strain-text');
        
        const sweatVal = document.getElementById('bio-sweat-val');
        const fluidLossVal = document.getElementById('bio-fluid-loss-val');
        const flaskFill = document.getElementById('flask-fill-level');

        // Let's add time-based dynamic factor (progress is 0 to 1)
        const progress = state.timelineVal / 100.0;
        
        // Dynamic speed calculations with a slight live jitter
        const speedJitter = Math.sin(Date.now() / 1500) * 0.4;

        if (state.selectedPlayer === 'messi') {
            // Messi dynamic biometrics (8.21 km to 8.42 km over the timeline)
            const baseDist = 8.21;
            const dist = (baseDist + progress * 0.21).toFixed(2);
            document.getElementById('bio-dist-val').innerText = `${dist} km`;
            
            // Sprint count updates from 17 to 18 as match advances
            const sprints = progress >= 0.7 ? 18 : 17;
            document.getElementById('bio-sprints-val').innerText = `${sprints} sprints`;
            
            // Speed depends on timeline: active build-up (0-15%), slow jog/recovery (15-60%), walk (60-85%), repositioning (85-100%)
            let speed = 4.2;
            if (progress < 0.15) {
                speed = 7.2 + speedJitter;
            } else if (progress < 0.60) {
                speed = 2.8 + speedJitter;
            } else if (progress < 0.85) {
                speed = 1.6 + speedJitter;
            } else {
                speed = 5.2 + speedJitter;
            }
            if (speed < 0) speed = 0;
            document.getElementById('bio-speed-val').innerText = `${speed.toFixed(1)} km/h`;
            
            // Stamina decays from 44% to 42%
            const stamina = Math.round(44 - progress * 2);
            document.getElementById('bio-stamina-val').innerText = `${stamina}%`;
            document.getElementById('bio-stamina-val').className = 'font-bold text-yellow';

            // Strain starts at 71.2% and climbs to 72.4%
            const strainVal = (71.2 + progress * 1.2).toFixed(1);
            strainText.innerText = strainVal;
            strainGauge.style.strokeDashoffset = 314 * (1 - parseFloat(strainVal) / 100);

            sweatVal.innerHTML = '1.2 <span class="stat-unit">L/hour</span>';
            const fluidLoss = (1.79 + progress * 0.05).toFixed(2);
            fluidLossVal.innerText = `${fluidLoss} L`;
            
            const flaskPct = Math.round(64 - progress * 2);
            flaskFill.style.height = `${flaskPct}%`;

        } else {
            // Mbappe dynamic biometrics (11.58 km to 11.85 km over the timeline)
            const baseDist = 11.58;
            const dist = (baseDist + progress * 0.27).toFixed(2);
            document.getElementById('bio-dist-val').innerText = `${dist} km`;
            
            // Sprint count updates from 34 to 36 as match advances
            const sprints = progress >= 0.8 ? 36 : (progress >= 0.3 ? 35 : 34);
            document.getElementById('bio-sprints-val').innerText = `${sprints} sprints`;
            
            // Speed: build-up (0-15%), sprint counter (15-50%), jog recovery (50-80%), active run (80-90%), shooting (90-100%)
            let speed = 6.4;
            if (progress < 0.15) {
                speed = 8.2 + speedJitter;
            } else if (progress < 0.50) {
                // SPRINTING!
                speed = 31.8 + Math.sin(progress * 20) * 4.4;
            } else if (progress < 0.80) {
                speed = 11.2 + speedJitter;
            } else if (progress < 0.90) {
                speed = 24.5 + speedJitter;
            } else {
                speed = 13.8 + speedJitter;
            }
            if (speed < 0) speed = 0;
            if (speed > 36.2) speed = 36.2;
            document.getElementById('bio-speed-val').innerText = `${speed.toFixed(1)} km/h`;
            
            // Stamina decays from 21% to 18%
            const stamina = Math.round(21 - progress * 3);
            document.getElementById('bio-stamina-val').innerText = `${stamina}%`;
            document.getElementById('bio-stamina-val').className = 'font-bold text-crimson';

            // Strain starts at 86.5% and climbs to 89.5%
            const strainVal = (86.5 + progress * 3.0).toFixed(1);
            strainText.innerText = strainVal;
            strainGauge.style.strokeDashoffset = 314 * (1 - parseFloat(strainVal) / 100);

            sweatVal.innerHTML = '1.6 <span class="stat-unit">L/hour</span>';
            const fluidLoss = (2.39 + progress * 0.06).toFixed(2);
            fluidLossVal.innerText = `${fluidLoss} L`;
            
            const flaskPct = Math.round(40 - progress * 2);
            flaskFill.style.height = `${flaskPct}%`;
        }

        drawGforceDial();
        drawRadarChart();
    }

    // G-Force Deceleration Circle
    function drawGforceDial() {
        gforceCtx.clearRect(0, 0, gforceCanvas.width, gforceCanvas.height);
        const cx = gforceCanvas.width / 2;
        const cy = gforceCanvas.height / 2;
        const maxR = 65;

        // Draw coordinate grid circles
        gforceCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        gforceCtx.lineWidth = 1;
        
        gforceCtx.beginPath();
        gforceCtx.arc(cx, cy, maxR, 0, Math.PI*2);
        gforceCtx.arc(cx, cy, maxR * 0.66, 0, Math.PI*2);
        gforceCtx.arc(cx, cy, maxR * 0.33, 0, Math.PI*2);
        gforceCtx.stroke();

        // X/Y Axis lines
        gforceCtx.beginPath();
        gforceCtx.moveTo(cx - maxR, cy);
        gforceCtx.lineTo(cx + maxR, cy);
        gforceCtx.moveTo(cx, cy - maxR);
        gforceCtx.lineTo(cx, cy + maxR);
        gforceCtx.stroke();

        // Dynamic vector length based on player's current speed
        const speedText = document.getElementById('bio-speed-val').innerText;
        const currentSpeed = parseFloat(speedText) || 5.0;
        
        let dx, dy, valStr;
        let baseRadius = 25;
        let maxSpeed = 30.0;
        
        if (state.selectedPlayer === 'messi') {
            baseRadius = 20 + (currentSpeed / 29.4) * 25;
            maxSpeed = 29.4;
        } else {
            baseRadius = 22 + (currentSpeed / 36.2) * 38;
            maxSpeed = 36.2;
        }
        
        // Add rotational oscillation and radial noise to simulate high-frequency match vibrations
        const timeFactor = Date.now();
        const angle = (state.selectedPlayer === 'messi') 
            ? (-Math.PI / 5 + Math.sin(timeFactor / 1000) * 0.08) 
            : (-Math.PI / 3.5 + Math.sin(timeFactor / 800) * 0.12);
            
        const radius = baseRadius + Math.sin(timeFactor / 600) * 1.5;
        
        dx = radius * Math.cos(angle);
        dy = radius * Math.sin(angle);
        
        // Calculate a practical G-force: 1.0G rest, sprint is up to 1.8G (Messi) or 2.2G (Mbappe)
        const gForceVal = (0.8 + (currentSpeed / maxSpeed) * (state.selectedPlayer === 'messi' ? 1.0 : 1.4) + Math.sin(timeFactor / 700) * 0.05).toFixed(2);
        valStr = `${gForceVal} G`;

        document.getElementById('gforce-overlay-val').innerText = valStr;

        // Draw active vector line
        gforceCtx.strokeStyle = '#FF0033';
        gforceCtx.lineWidth = 2.5;
        gforceCtx.shadowColor = '#FF0033';
        gforceCtx.shadowBlur = 6;
        
        gforceCtx.beginPath();
        gforceCtx.moveTo(cx, cy);
        gforceCtx.lineTo(cx + dx, cy + dy);
        gforceCtx.stroke();

        // Plot end dot
        gforceCtx.fillStyle = '#FFFFFF';
        gforceCtx.beginPath();
        gforceCtx.arc(cx + dx, cy + dy, 4, 0, Math.PI*2);
        gforceCtx.fill();
        gforceCtx.shadowBlur = 0;
    }

    // Physio-Cognitive Radar Chart
    function drawRadarChart() {
        radarCtx.clearRect(0, 0, radarCanvas.width, radarCanvas.height);
        const cx = radarCanvas.width / 2;
        const cy = radarCanvas.height / 2;
        const maxR = 60;
        const variables = 5;

        // Draw radial pentagram skeleton lines
        radarCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        radarCtx.lineWidth = 1;

        // Draw 3 nested pentagons
        for (let j = 1; j <= 3; j++) {
            const r = maxR * (j / 3);
            radarCtx.beginPath();
            for (let i = 0; i < variables; i++) {
                const angle = (i * Math.PI * 2) / variables - Math.PI / 2;
                const px = cx + r * Math.cos(angle);
                const py = cy + r * Math.sin(angle);
                if (i === 0) radarCtx.moveTo(px, py);
                else radarCtx.lineTo(px, py);
            }
            radarCtx.closePath();
            radarCtx.stroke();
        }

        // Draw web lines to vertices
        radarCtx.beginPath();
        for (let i = 0; i < variables; i++) {
            const angle = (i * Math.PI * 2) / variables - Math.PI / 2;
            radarCtx.moveTo(cx, cy);
            radarCtx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
        }
        radarCtx.stroke();

        // Plot player values
        // Variables: [Stamina, Stress, SprintPower, SpaceAwareness, xTContribution]
        const timeFactor = Date.now();
        const staminaText = document.getElementById('bio-stamina-val').innerText;
        const currentStamina = (parseInt(staminaText) || 40) / 100.0;
        
        // Micro-oscillations to simulate dynamic live telemetry updates
        const stressJitter = Math.sin(timeFactor / 1200) * 0.02;
        const spaceJitter = Math.cos(timeFactor / 1000) * 0.015;
        
        let dataset = [];
        if (state.selectedPlayer === 'messi') {
            dataset = [
                currentStamina, 
                0.62 + stressJitter, 
                0.84 + Math.sin(timeFactor / 800) * 0.01, 
                0.97 + spaceJitter, 
                0.91 + Math.cos(timeFactor / 1500) * 0.01
            ];
        } else {
            dataset = [
                currentStamina, 
                0.88 + stressJitter, 
                0.97 + Math.sin(timeFactor / 700) * 0.01, 
                0.71 + spaceJitter, 
                0.87 + Math.cos(timeFactor / 1300) * 0.01
            ];
        }

        radarCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        radarCtx.strokeStyle = '#FFFFFF';
        radarCtx.lineWidth = 2.5;
        radarCtx.shadowColor = '#FFFFFF';
        radarCtx.shadowBlur = 4;

        radarCtx.beginPath();
        for (let i = 0; i < variables; i++) {
            const angle = (i * Math.PI * 2) / variables - Math.PI / 2;
            const valR = dataset[i] * maxR;
            const px = cx + valR * Math.cos(angle);
            const py = cy + valR * Math.sin(angle);
            if (i === 0) radarCtx.moveTo(px, py);
            else radarCtx.lineTo(px, py);
        }
        radarCtx.closePath();
        radarCtx.fill();
        radarCtx.stroke();
        radarCtx.shadowBlur = 0;
    }

    // Real-Time Cardiorespiratory ECG Renderer loop
    function animateECG() {
        if (state.activeTab !== 'biometrics' || !ecgCanvas.width) {
            setTimeout(animateECG, 100);
            return;
        }

        ecgCtx.fillStyle = '#060B12';
        ecgCtx.fillRect(0, 0, ecgCanvas.width, ecgCanvas.height);

        // Draw static grid backing
        ecgCtx.strokeStyle = 'rgba(255, 0, 51, 0.03)';
        ecgCtx.lineWidth = 1;
        for (let x = 0; x < ecgCanvas.width; x += 15) {
            ecgCtx.beginPath();
            ecgCtx.moveTo(x, 0);
            ecgCtx.lineTo(x, ecgCanvas.height);
            ecgCtx.stroke();
        }
        for (let y = 0; y < ecgCanvas.height; y += 15) {
            ecgCtx.beginPath();
            ecgCtx.moveTo(0, y);
            ecgCtx.lineTo(ecgCanvas.width, y);
            ecgCtx.stroke();
        }

        // Generate ECG heart rate tracing path
        const midY = ecgCanvas.height / 2;
        const step = 4;
        
        // Simulate dynamic heart rate BPM based on player exertion & time in play
        let baseBpm = 142;
        const progress = state.timelineVal / 100.0;
        
        if (state.selectedPlayer === 'messi') {
            if (progress < 0.15) baseBpm = 148;
            else if (progress < 0.60) baseBpm = 138;
            else if (progress < 0.85) baseBpm = 135;
            else baseBpm = 145;
        } else {
            if (progress < 0.15) baseBpm = 168;
            else if (progress < 0.50) baseBpm = 188; // SPRINTING!
            else if (progress < 0.80) baseBpm = 174;
            else if (progress < 0.90) baseBpm = 182;
            else baseBpm = 176;
        }
        
        // Add dynamic sinusoidal fluctuation + random walk component to simulate normal HR variability
        const fluctuation = Math.floor(Math.sin(Date.now() / 1500) * 3.2) + (Math.random() > 0.65 ? 1 : (Math.random() < 0.35 ? -1 : 0));
        const bpm = baseBpm + fluctuation;
        document.getElementById('bio-live-hr-display').innerText = `${bpm} BPM`;

        // Dynamically compute how many animation cycles represent one heartbeat
        // 0.035 represents the 35ms loop delay (28.5 fps)
        const stepsPerBeat = Math.max(8, Math.round((60 / bpm) / 0.035));
        
        // Push a new point to the array based on computed step rate
        state.ecgIndex = (state.ecgIndex + 1) % stepsPerBeat;

        let activeOffset = 0;
        const t = state.ecgIndex;
        
        // Compress the PQRST wave shape dynamically based on the space between beats
        if (stepsPerBeat >= 12) {
            // Jogging/walking rates (Messi or recovering Mbappe)
            if (t === 2) activeOffset = -6;      // P wave
            else if (t === 4) activeOffset = 4;   // Q wave
            else if (t === 5) activeOffset = -42; // R peak (Tall ventricular depolarization spike)
            else if (t === 6) activeOffset = 16;  // S wave
            else if (t === 8) activeOffset = -12; // T wave
        } else if (stepsPerBeat >= 10) {
            // Elevated heart rate (Active Mbappe)
            if (t === 1) activeOffset = -6;      // P wave
            else if (t === 3) activeOffset = 4;   // Q wave
            else if (t === 4) activeOffset = -42; // R peak
            else if (t === 5) activeOffset = 16;  // S wave
            else if (t === 7) activeOffset = -12; // T wave
        } else {
            // Extreme anaerobic heart rate (Mbappe during peak sprint counter)
            if (t === 1) activeOffset = -6;      // P wave
            else if (t === 2) activeOffset = 4;   // Q wave
            else if (t === 3) activeOffset = -42; // R peak
            else if (t === 4) activeOffset = 16;  // S wave
            else if (t === 6) activeOffset = -12; // T wave
        }

        // Shift existing values left
        state.heartRateHistory.push(midY + activeOffset);
        if (state.heartRateHistory.length > ecgCanvas.width / step) {
            state.heartRateHistory.shift();
        }

        // Draw line trace
        ecgCtx.strokeStyle = '#FF0033';
        ecgCtx.lineWidth = 2.5;
        ecgCtx.shadowColor = '#FF0033';
        ecgCtx.shadowBlur = 6;
        ecgCtx.beginPath();

        state.heartRateHistory.forEach((val, idx) => {
            const px = idx * step;
            if (idx === 0) ecgCtx.moveTo(px, val);
            else ecgCtx.lineTo(px, val);
        });

        ecgCtx.stroke();
        ecgCtx.shadowBlur = 0;

        setTimeout(animateECG, 35); // matches ~30fps loop
    }

    animateECG(); // Start loop


    // ==========================================
    // 9. IBM GRANITE TACTICAL ORACLE (CHAT MODULE)
    // ==========================================
    const chatHistory = document.getElementById('oracle-chat-history');
    const chatInput = document.getElementById('oracle-chat-input');
    const chatSendBtn = document.getElementById('oracle-send-btn');
    const presetBtns = document.querySelectorAll('.preset-btn');

    presetBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const queryType = e.target.getAttribute('data-query');
            let queryText = '';

            if (queryType === 'switch') queryText = "Analyze France 80' Tactical Switch";
            else if (queryType === 'volley') queryText = "Explain Mbappe 82' Volley Gap";
            else queryText = "Explain the VAR Law 12 Penalty rules";

            triggerChatQuery(queryText, queryType);
        });
    });

    chatSendBtn.addEventListener('click', () => {
        const text = chatInput.value.trim();
        if (text) {
            triggerChatQuery(text, 'custom');
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const text = chatInput.value.trim();
            if (text) {
                triggerChatQuery(text, 'custom');
                chatInput.value = '';
            }
        }
    });

    function formatAIResponse(text) {
        if (!text) return '';
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/##\s*(.*)/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    async function triggerChatQuery(queryText, type) {
        // 1. Append User Message
        appendMessage('user', 'USER ANALYST', queryText);

        // 2. Append Oracle Typing Placeholder with animation
        const typingMsg = appendMessage('oracle', 'IBM GRANITE CORE', '<div class="ai-typing"><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div><div class="ai-typing-dot"></div></div>');
        
        // Try backend API first
        let answerText = null;
        if (backendOnline) {
            answerText = await apiChat(queryText, 'tactical');
        }

        // Fallback to built-in responses
        if (!answerText) {
            await new Promise(r => setTimeout(r, 1200));
            if (type === 'switch') {
                answerText = `<strong>Granite-3.0-8b-Instruct:</strong> France head coach switched from a static 4-3-3 to an aggressive 4-2-4 overloading block at 79:50. Substituting Coman and Thuram forced Argentina's wide defenders out, leaving central gaps. Click the <a href="#" class="chat-embedded-link" data-target="telestrator" data-slide="50">3D Telestrator (80:30)</a> to inspect.`;
            } else if (type === 'volley') {
                answerText = `<strong>Granite-3.0-8b-Instruct:</strong> At 82:12, Thuram's header path bypassed Fernandez. Mbappe's acceleration peaked at 1.95G, catching Romero out of alignment. Argentina's backline distance gap expanded by 6.4m, allowing Mbappe to connect with the ball in open space. Open the <a href="#" class="chat-embedded-link" data-target="biometrics" data-player="mbappe">Biometrics HUD (Mbappé)</a> to review his exertion.`;
            } else if (type === 'law12') {
                answerText = `<strong>Granite-3.0-8b-Instruct:</strong> Under IFAB Law 12, a penalty is awarded if a defender makes contact inside the box that is reckless, careless, or with excessive force (Otamendi tackle). For handball checks (Montiel), the main assessment criteria is silhouette enlargement. Visit the <a href="#" class="chat-embedded-link" data-target="var-lab">VAR Calibration Lab</a> to inspect.`;
            } else {
                answerText = `<strong>Granite-3.0-8b-Instruct:</strong> I have processed your custom query against the IFAB rule cache and coordinate models. The telemetry points indicate Argentina is experiencing tactical exhaustion, shifting Expected Threat (xT) generation fully to the French side (-0.14 xT deficit).`;
            }
        }

        answerText = formatAIResponse(answerText);

        // Render with typewriter effect
        typingMsg.innerHTML = `
            <div class="message-sender">IBM GRANITE CORE</div>
            <div class="message-content"></div>
        `;
        const contentEl = typingMsg.querySelector('.message-content');
        typewriterEffect(contentEl, answerText);
        
        // Wire up embedded navigation links after typewriter completes
        setTimeout(() => {
            typingMsg.querySelectorAll('.chat-embedded-link').forEach(link => {
                link.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    const targetTab = ev.target.getAttribute('data-target');
                    const targetTabBtn = document.querySelector(`.nav-item[data-tab="${targetTab}"]`);
                    if (targetTabBtn) {
                        targetTabBtn.click();
                        const targetSlide = ev.target.getAttribute('data-slide');
                        if (targetSlide) {
                            timelineRange.value = targetSlide;
                            state.timelineVal = parseInt(targetSlide);
                            updateTimelineDetails();
                        }
                        const playerTarget = ev.target.getAttribute('data-player');
                        if (playerTarget) {
                            const pBtn = document.querySelector(`.player-tab-btn[data-player="${playerTarget}"]`);
                            if (pBtn) pBtn.click();
                        }
                    }
                });
            });
        }, answerText.length * 8 + 200);

        // Scroll chat to bottom
        chatHistory.scrollTop = chatHistory.scrollHeight;
    }

    function appendMessage(senderClass, senderName, text) {
        const msg = document.createElement('div');
        msg.className = `chat-message ${senderClass}`;
        msg.innerHTML = `
            <div class="message-sender">${senderName}</div>
            <div class="message-content">${text}</div>
        `;
        chatHistory.appendChild(msg);
        chatHistory.scrollTop = chatHistory.scrollHeight;
        return msg;
    }


    // ==========================================
    // 10. INTERACTIVE AGENT NETWORK TOPOLOGY CONTROLLER
    // ==========================================
    const agentConfigs = {
        core: {
            name: "IBM GRANITE ENGINE",
            status: "SUPERVISORY CORE",
            cpu: 94.8,
            latency: "12 ms",
            memory: "148.4 MB",
            consensus: "98.2%",
            logs: [
                "[INFO] IBM Granite Supervisory Core Online (8B-Instruct).",
                "[INFO] Consensus protocol initialized: 98.2% agreement across sub-agents.",
                "[INFO] Optical telemetry pipeline synced at 10Hz match stream rate.",
                "[INFO] Cognitive orchestrator running in EXPLAINABLE AI mode."
            ],
            logTemplates: [
                "Running heuristic optimization on expected goals momentum matrix.",
                "Consensus validation check: OK (all nodes returned 200).",
                "Synthesizing explainable tactical advice: zone 14 threat highlighted.",
                "Broadcasting metrics state update to dashboard HUD.",
                "System check completed. Resource footprint stable."
            ]
        },
        tactics: {
            name: "TACTICAL DATA AGENT",
            status: "SPATIAL DIAGNOSTICS",
            cpu: 76.2,
            latency: "18 ms",
            memory: "84.1 MB",
            consensus: "96.5%",
            logs: [
                "[INFO] Tactical Spatial Analyzer Online.",
                "[INFO] Subscribed to FIFA telemetry coordinate channel.",
                "[INFO] Dynamic Expected Threat (xT) grid calculations active."
            ],
            logTemplates: [
                "XY coordinate telemetry frame parsed. Ball [52.4, 28.1].",
                "xT calculation completed in 4.2ms. Trend: France pressure ascending.",
                "PPDA high-block threshold checked: active pressing zone confirmed.",
                "Defensive compactness vector delta: CB separation increased by 6.4m."
            ]
        },
        biometrics: {
            name: "PLAYER STATE AGENT",
            status: "BIOLOGICAL TELEMETRY",
            cpu: 42.1,
            latency: "6 ms",
            memory: "48.2 MB",
            consensus: "99.4%",
            logs: [
                "[INFO] Player Wearable Telemetry Monitor Online.",
                "[INFO] Syncing heart rate sensors (p_10 Messi, p_10 Mbappe).",
                "[INFO] Dynamic physical strain index (PSI) calculator active."
            ],
            logTemplates: [
                "Wearable sync: p_10 (Messi) heart rate 165 BPM | strain 72.4%.",
                "Wearable sync: p_10 (Mbappe) heart rate 182 BPM | strain 81.9%.",
                "Dehydration calculation: total sweat loss 1.84 L | flask at 42%.",
                "Kinetic cut force calculation: Peak acceleration lateral cuts 1.95G."
            ]
        },
        context: {
            name: "ENVIRONMENTAL CONTEXT",
            status: "TEMPORAL ANALYSIS",
            cpu: 58.4,
            latency: "10 ms",
            memory: "64.9 MB",
            consensus: "95.1%",
            logs: [
                "[INFO] Environmental Context Agent Online.",
                "[INFO] Score state tracking model initialized: 2:2.",
                "[INFO] Time remaining calculations active (82:14)."
            ],
            logTemplates: [
                "Score state delta sync: Argentina 2 - France 2. Tactical threat high.",
                "Exertion context checked: Time 82:14. Strategic shift expected.",
                "Substitution telemetry updated: Coman (FRA_20) on field.",
                "Match period status: 2nd Half. Transition overload warning."
            ]
        },
        regulations: {
            name: "REGULATIONS SUPERVISOR",
            status: "IFAB COMPLIANCE ENGINE",
            cpu: 84.6,
            latency: "24 ms",
            memory: "112.5 MB",
            consensus: "97.8%",
            logs: [
                "[INFO] IFAB Regulations Supervisor Online.",
                "[INFO] Skeletal joint silhouette models loaded.",
                "[INFO] Hawk-Eye sub-pixel camera feed aligned."
            ],
            logTemplates: [
                "Hawk-Eye line check: defender sleeve at 340px, attacker toe at 325px.",
                "VAR offset calculation: -3.4 cm (OFFSIDE confirmed).",
                "Joint silhouette checked: Arm abduction angle 45 deg - Natural.",
                "Kinetic tackle force check: collision impact 3.8G."
            ]
        }
    };

    let activeAgentId = 'core';
    let logStreamInterval = null;

    function initAgentTopologyController() {
        const agentNodes = document.querySelectorAll('.agent-node');
        const coreNode = document.getElementById('node-core');
        const inspectName = document.getElementById('inspect-agent-name');
        const inspectStatus = document.getElementById('inspect-agent-status');
        const inspectLatency = document.getElementById('inspect-latency-val');
        const inspectMemory = document.getElementById('inspect-memory-val');
        const inspectConsensus = document.getElementById('inspect-consensus-val');
        const inspectCpuCircle = document.getElementById('inspect-cpu-circle');
        const inspectCpuText = document.getElementById('inspect-cpu-text');
        const inspectTerminal = document.getElementById('inspect-terminal-stdout');
        const btnRecalibrate = document.getElementById('btn-recalibrate-agent');
        const btnClearLogs = document.getElementById('btn-clear-logs');

        if (!inspectTerminal) return;

        function inspectAgent(agentId) {
            activeAgentId = agentId;
            const config = agentConfigs[agentId];
            if (!config) return;

            // Update details
            inspectName.innerText = config.name;
            inspectStatus.innerText = config.status;
            inspectLatency.innerText = config.latency;
            inspectMemory.innerText = config.memory;
            inspectConsensus.innerText = config.consensus;
            
            // Update CPU Gauge
            inspectCpuText.textContent = `${config.cpu.toFixed(1)}%`;
            const strokeDashOffset = 100 - config.cpu;
            inspectCpuCircle.setAttribute('stroke-dasharray', `${config.cpu.toFixed(1)}, 100`);

            // Highlight selected node in SVG
            agentNodes.forEach(node => node.classList.remove('active-inspect'));
            if (coreNode) coreNode.classList.remove('active-inspect');
            
            if (agentId === 'core') {
                if (coreNode) coreNode.classList.add('active-inspect');
            } else {
                const activeNode = document.getElementById(`node-${agentId}`);
                if (activeNode) activeNode.classList.add('active-inspect');
            }

            // Dump initial logs
            inspectTerminal.innerHTML = '';
            config.logs.forEach(line => {
                inspectTerminal.innerHTML += `<span class="log-info">${line}</span>\n`;
            });
            inspectTerminal.scrollTop = inspectTerminal.scrollHeight;

            // Reset intervals
            if (logStreamInterval) clearInterval(logStreamInterval);
            logStreamInterval = setInterval(() => {
                // Generate log line
                const templates = config.logTemplates;
                const randomLine = templates[Math.floor(Math.random() * templates.length)];
                const logTime = new Date().toLocaleTimeString();
                
                // Add stylized console line
                let colorClass = 'log-success';
                if (randomLine.includes('[WARN]')) colorClass = 'log-warn';
                else if (randomLine.includes('threat') || randomLine.includes('compactness')) colorClass = 'log-error';
                else if (randomLine.includes('sync') || randomLine.includes('parsed')) colorClass = 'log-cyan';

                inspectTerminal.innerHTML += `[${logTime}] <span class="${colorClass}">${randomLine}</span>\n`;

                // Capping buffer
                const lines = inspectTerminal.innerHTML.split('\n');
                if (lines.length > 20) {
                    inspectTerminal.innerHTML = lines.slice(lines.length - 20).join('\n');
                }
                inspectTerminal.scrollTop = inspectTerminal.scrollHeight;

                // Slightly fluctuate CPU & Latency to feel alive
                const cpuFluctuate = Math.max(10, Math.min(100, config.cpu + (Math.random() * 6 - 3)));
                inspectCpuText.textContent = `${cpuFluctuate.toFixed(1)}%`;
                inspectCpuCircle.setAttribute('stroke-dasharray', `${cpuFluctuate.toFixed(1)}, 100`);

                const latencyNum = parseInt(config.latency);
                const latencyFluctuate = Math.max(2, latencyNum + Math.floor(Math.random() * 4 - 2));
                inspectLatency.innerText = `${latencyFluctuate} ms`;

            }, 1800);
        }

        // Bind SVG node click listeners
        agentNodes.forEach(node => {
            node.addEventListener('click', () => {
                const agentId = node.getAttribute('data-agent');
                inspectAgent(agentId);
            });
        });

        if (coreNode) {
            coreNode.addEventListener('click', () => {
                inspectAgent('core');
            });
        }

        // Bind control buttons
        if (btnRecalibrate) {
            btnRecalibrate.addEventListener('click', () => {
                const logTime = new Date().toLocaleTimeString();
                inspectTerminal.innerHTML += `[${logTime}] <span class="log-warn">[WARN] FORCED RECALIBRATION SIGNAL SENT TO CORE...</span>\n`;
                inspectCpuText.textContent = "100.0%";
                inspectCpuCircle.setAttribute('stroke-dasharray', "100.0, 100");
                inspectLatency.innerText = "99 ms";
                inspectTerminal.scrollTop = inspectTerminal.scrollHeight;
                
                setTimeout(() => {
                    const logTime2 = new Date().toLocaleTimeString();
                    inspectTerminal.innerHTML += `[${logTime2}] <span class="log-success">[SUCCESS] SYSTEM SYNC RESTORED. FLUSHED DATA PACKETS.</span>\n`;
                    inspectTerminal.scrollTop = inspectTerminal.scrollHeight;
                    inspectAgent(activeAgentId);
                }, 1000);
            });
        }

        if (btnClearLogs) {
            btnClearLogs.addEventListener('click', () => {
                inspectTerminal.innerHTML = `<span class="log-info">[INFO] Console buffers flushed. Awaiting next active telemetry line...</span>\n`;
            });
        }

        // Animate SVG packet transmission flow along connection lines
        function animatePackets() {
            let t = 0;
            setInterval(() => {
                t = (t + 0.02) % 1;
                
                // Tactics packet: Moves vertically from (250,210) to (250,80)
                const tacticsPct = document.getElementById('packet-tactics');
                if (tacticsPct) {
                    tacticsPct.setAttribute('cy', 210 - (210 - 80) * t);
                }

                // Biometrics packet: Moves horizontally from (250,210) to (380,210)
                const bioPct = document.getElementById('packet-biometrics');
                if (bioPct) {
                    bioPct.setAttribute('cx', 250 + (380 - 250) * t);
                }

                // Context packet: Moves vertically from (250,210) to (250,340)
                const ctxPct = document.getElementById('packet-context');
                if (ctxPct) {
                    ctxPct.setAttribute('cy', 210 + (340 - 210) * t);
                }

                // Regulations packet: Moves horizontally from (250,210) to (120,210)
                const regPct = document.getElementById('packet-regulations');
                if (regPct) {
                    regPct.setAttribute('cx', 250 - (250 - 120) * t);
                }

            }, 40);
        }

        // Initialize
        inspectAgent('core');
        animatePackets();
    }

    // Call topology map initializer
    initAgentTopologyController();

    // Click on sidebar footer to go to Agent Network topology page
    const footerMonitor = document.querySelector('.hologram-footer-monitor');
    if (footerMonitor) {
        footerMonitor.addEventListener('click', () => {
            const agentNetTabBtn = document.querySelector('.nav-item[data-tab="agent-network"]');
            if (agentNetTabBtn) {
                agentNetTabBtn.click();
                showToast("Diverting view to Cognitive Agent Network Graph...");
            }
        });
        footerMonitor.style.cursor = 'pointer';
    }

    // ==========================================
    // 11. INITIALIZATION CALIBRATION AND LAUNCH RUNS
    // ==========================================
    updateTimelineDetails();
    calculateOffside();
    
    // Draw initial empty canvases for tabs to catch
    setTimeout(() => {
        resizePitchCanvas();
        resizeVARCanvas();
    }, 100);
});
