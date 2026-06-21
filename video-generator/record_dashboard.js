const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Start static file server
function startServer() {
    const server = http.createServer((req, res) => {
        let urlPath = req.url.split('?')[0];
        if (urlPath === '/' || urlPath === '') {
            urlPath = '/index.html';
        }
        
        const filePath = path.join(PROJECT_ROOT, urlPath);
        const ext = path.extname(filePath).toLowerCase();
        
        let contentType = 'text/html';
        if (ext === '.js') contentType = 'text/javascript';
        else if (ext === '.css') contentType = 'text/css';
        else if (ext === '.json') contentType = 'application/json';
        else if (ext === '.png') contentType = 'image/png';
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.svg') contentType = 'image/svg+xml';
        
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`404 Not Found`);
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    });
    
    server.listen(PORT);
    console.log(`[Server] Static server started on http://localhost:${PORT}`);
    return server;
}

// Native GPU-accelerated smooth scrolling using requestAnimationFrame and cubic easing
async function smoothScrollToElement(page, selector, durationMs) {
    await page.evaluate(async ([sel, duration]) => {
        const el = document.querySelector(sel);
        if (!el) return;
        const startY = window.pageYOffset;
        const endY = startY + el.getBoundingClientRect().top - 20;
        
        return new Promise((resolve) => {
            const startTime = performance.now();
            function step(now) {
                const progress = Math.min((now - startTime) / duration, 1);
                // Cubic ease-in-out curve
                const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                const currentY = startY + (endY - startY) * ease;
                window.scrollTo(0, currentY);
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    resolve();
                }
            }
            window.requestAnimationFrame(step);
        });
    }, [selector, durationMs]);
}

// Native smooth scroll for child containers (like the dashboard panels)
async function smoothScrollContainerTo(page, containerSel, targetSel, durationMs) {
    await page.evaluate(async ([cSel, tSel, duration]) => {
        const container = document.querySelector(cSel);
        const target = document.querySelector(tSel);
        if (!container || !target) return;
        const startY = container.scrollTop;
        const endY = startY + target.getBoundingClientRect().top - container.getBoundingClientRect().top - 20;
        
        return new Promise((resolve) => {
            const startTime = performance.now();
            function step(now) {
                const progress = Math.min((now - startTime) / duration, 1);
                const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                container.scrollTop = startY + (endY - startY) * ease;
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    resolve();
                }
            }
            window.requestAnimationFrame(step);
        });
    }, [containerSel, targetSel, durationMs]);
}

// Glides the mouse cursor smoothly to the center of an element to simulate real human interaction
async function smoothMoveTo(page, selector, steps = 5) {
    const el = page.locator(selector).first();
    const box = await el.boundingBox();
    if (box) {
        const targetX = box.x + box.width / 2;
        const targetY = box.y + box.height / 2;
        await page.mouse.move(targetX, targetY, { steps });
        console.log(`[Cursor] Moved to element: ${selector}`);
    } else {
        console.warn(`[Cursor] Cannot move to element: ${selector} (not found)`);
    }
}

async function record() {
    const server = startServer();
    const durations = JSON.parse(fs.readFileSync(path.join(__dirname, 'durations.json'), 'utf8'));
    console.log('[Recorder] Timings configuration loaded:', durations);
    
    // Highlight helper functions to highlight currently discussed components on the screen
    async function highlightElement(page, selector) {
        await page.evaluate((sel) => {
            // Remove existing highlights
            document.querySelectorAll('.hud-active-highlight').forEach(el => {
                el.classList.remove('hud-active-highlight');
            });
            // Add new highlight
            const target = document.querySelector(sel);
            if (target) {
                target.classList.add('hud-active-highlight');
            }
        }, selector);
    }

    async function removeHighlights(page) {
        await page.evaluate(() => {
            document.querySelectorAll('.hud-active-highlight').forEach(el => {
                el.classList.remove('hud-active-highlight');
            });
        });
    }
    
    const browser = await chromium.launch({
        headless: true,
        args: ['--allow-file-access-from-files', '--window-size=1920,1080']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1.5,
        recordVideo: {
            dir: path.join(__dirname, 'recordings'),
            size: { width: 1920, height: 1080 }
        }
    });
    
    // Inject custom virtual pointer overlay to make the cursor visible on video
    await context.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
            const cursor = document.createElement('div');
            cursor.id = 'playwright-fake-cursor';
            cursor.style.position = 'fixed';
            cursor.style.width = '24px';
            cursor.style.height = '24px';
            cursor.style.borderRadius = '50%';
            cursor.style.backgroundColor = 'rgba(255, 0, 51, 0.3)';
            cursor.style.border = '2.5px solid #FF0033';
            cursor.style.boxShadow = '0 0 12px rgba(255, 0, 51, 0.7)';
            cursor.style.pointerEvents = 'none';
            cursor.style.zIndex = '999999';
            cursor.style.transform = 'translate(-50%, -50%)';
            cursor.style.transition = 'width 0.1s, height 0.1s, background-color 0.1s';
            
            // Draw standard white cursor pointer inside
            const arrow = document.createElement('div');
            arrow.style.position = 'absolute';
            arrow.style.left = '4px';
            arrow.style.top = '4px';
            arrow.style.width = '0';
            arrow.style.height = '0';
            arrow.style.borderLeft = '7px solid white';
            arrow.style.borderTop = '7px solid white';
            arrow.style.borderRight = '7px solid transparent';
            arrow.style.borderBottom = '7px solid transparent';
            arrow.style.transform = 'rotate(-20deg)';
            cursor.appendChild(arrow);

            document.body.appendChild(cursor);

            window.addEventListener('mousemove', (e) => {
                cursor.style.left = e.clientX + 'px';
                cursor.style.top = e.clientY + 'px';
            });

            window.addEventListener('mousedown', () => {
                cursor.style.width = '16px';
                cursor.style.height = '16px';
                cursor.style.backgroundColor = 'rgba(255, 0, 51, 0.75)';
                cursor.style.boxShadow = '0 0 15px rgba(255, 0, 51, 0.9)';
            });

            window.addEventListener('mouseup', () => {
                cursor.style.width = '24px';
                cursor.style.height = '24px';
                cursor.style.backgroundColor = 'rgba(255, 0, 51, 0.3)';
                cursor.style.boxShadow = '0 0 12px rgba(255, 0, 51, 0.7)';
            });
        });
    });
    
    const page = await context.newPage();
    await page.addStyleTag({
        content: `
            .hud-active-highlight {
                outline: 2.5px solid #FF0033 !important;
                box-shadow: 0 0 25px rgba(255, 0, 51, 0.5) !important;
                transition: outline 0.4s ease, box-shadow 0.4s ease !important;
            }
        `
    });
    console.log('[Recorder] Automation recording session online (Virtual Cursor & Highlights injected).');
    
    try {
        const sessionStart = Date.now();
        const act1Dur = durations['act1'] || 15000;
        const act2Dur = durations['act2'] || 15000;
        const act3Dur = durations['act3'] || 30000;
        const act4Dur = durations['act4'] || 25000;
        const act5Dur = durations['act5'] || 35000;
        const act6Dur = durations['act6'] || 25000;
        const act7Dur = durations['act7'] || 20000;
        const act8Dur = durations['act8'] || 15000;

        const target1 = act1Dur;
        const target2 = target1 + act2Dur;
        const target3 = target2 + act3Dur;
        const target4 = target3 + act4Dur;
        const target5 = target4 + act5Dur;
        const target6 = target5 + act6Dur;
        const target7 = target6 + act7Dur;
        const target8 = target7 + act8Dur;

        // ==========================================
        // ACT 1: Landing Page Hook (approx 15s)
        // ==========================================
        console.log(`[Recorder] Act 1: Landing Hook - Target: ${target1}ms`);
        await page.goto(`http://localhost:${PORT}/index.html`);
        await page.waitForTimeout(500);
        
        // Glide cursor to the title
        await smoothMoveTo(page, '.massive-title');
        
        // Scroll smoothly to "THE CHALLENGE"
        await smoothScrollToElement(page, '.challenge-split', 3000);
        await page.waitForTimeout(500);
        
        const act1Elapsed = Date.now() - sessionStart;
        const act1Wait = Math.max(0, target1 - act1Elapsed);
        console.log(`[Recorder] Act 1 actions took ${act1Elapsed}ms. Waiting ${act1Wait}ms for sync...`);
        if (act1Wait > 0) await page.waitForTimeout(act1Wait);
        
        // ==========================================
        // ACT 2: Multi-Agent Architecture (approx 15s)
        // ==========================================
        console.log(`[Recorder] Act 2: Architecture - Target: ${target2}ms (cumulative)`);
        
        // Scroll smoothly to Architecture grid
        await smoothScrollToElement(page, '.section-architecture', 1200);
        await page.waitForTimeout(300);
        
        // Scroll to the bottom CTA section
        await smoothScrollToElement(page, '.section-cta', 1000);
        
        // Glide cursor to launching button
        await smoothMoveTo(page, '.launch-btn-final');
        await page.waitForTimeout(200);
        
        // Click and Navigate to app.html
        console.log('[Recorder] Transitioning to Command Center Dashboard...');
        await Promise.all([
            page.waitForNavigation(),
            page.click('.launch-btn-final')
        ]);
        
        const act2Elapsed = Date.now() - sessionStart;
        const act2Wait = Math.max(0, target2 - act2Elapsed);
        console.log(`[Recorder] Act 2 actions took ${act2Elapsed}ms cumulative. Waiting ${act2Wait}ms for sync...`);
        if (act2Wait > 0) await page.waitForTimeout(act2Wait);
        
        // ==========================================
        // ACT 3: Command Center & Real-time Insights (approx 30s)
        // ==========================================
        console.log(`[Recorder] Act 3: Command Center - Target: ${target3}ms (cumulative)`);
        
        // Check if splash screen is visible, if so click it to skip
        const splashVisible = await page.evaluate(() => {
            const splash = document.getElementById('splash-screen');
            return splash && !splash.classList.contains('hidden');
        });
        
        if (splashVisible) {
            console.log('[Recorder] Splash screen visible, clicking to skip...');
            await page.waitForTimeout(500); // Briefly show splash screen
            await smoothMoveTo(page, '#splash-screen');
            await page.click('#splash-screen');
            console.log('[Recorder] Skipped splash screen.');
            await page.waitForTimeout(1500); // Wait for transition
        } else {
            console.log('[Recorder] Splash screen already hidden, proceeding.');
        }
        
        // Highlight Expected Threat card
        await highlightElement(page, '.stat-card:first-child');
        await smoothMoveTo(page, '.stat-card:first-child');
        await page.waitForTimeout(3000);
        
        // Scroll content pane down to the momentum timeline
        await removeHighlights(page);
        await smoothScrollContainerTo(page, '.workspace-viewport', '#momentum-svg-chart', 4000);
        
        // Glide cursor to hover over momentum chart and highlight it
        await highlightElement(page, '.dashboard-card.md-span-2');
        await smoothMoveTo(page, '#momentum-svg-chart');
        
        const act3Elapsed = Date.now() - sessionStart;
        const act3Wait = Math.max(0, target3 - act3Elapsed);
        console.log(`[Recorder] Act 3 actions took ${act3Elapsed}ms cumulative. Waiting ${act3Wait}ms for sync...`);
        if (act3Wait > 0) await page.waitForTimeout(act3Wait);
        
        // ==========================================
        // ACT 4: IBM Granite Oracle (approx 25s)
        // ==========================================
        console.log(`[Recorder] Act 4: IBM Granite Oracle - Target: ${target4}ms (cumulative)`);
        
        // Scroll content pane back to top and remove highlights
        await removeHighlights(page);
        await page.evaluate(() => {
            const container = document.querySelector('.workspace-viewport');
            if (container) container.scrollTo({ top: 0, behavior: 'smooth' });
        });
        await page.waitForTimeout(2000);
        
        // Highlight Granite chat panel
        await highlightElement(page, '.command-chat-card');
        
        // Glide cursor to preset query button "switch"
        await smoothMoveTo(page, '.preset-btn[data-query="switch"]');
        await page.waitForTimeout(300);
        await page.click('.preset-btn[data-query="switch"]');
        
        // Wait for typing animation to print out tactical analysis
        const act4Elapsed = Date.now() - sessionStart;
        const act4Wait = Math.max(0, target4 - act4Elapsed);
        console.log(`[Recorder] Act 4 actions took ${act4Elapsed}ms cumulative. Waiting ${act4Wait}ms for sync...`);
        if (act4Wait > 0) await page.waitForTimeout(act4Wait);
        
        // ==========================================
        // ACT 5: 3D Telestrator & VAR Calibration (approx 35s)
        // ==========================================
        console.log(`[Recorder] Act 5: Telestrator & VAR - Target: ${target5}ms (cumulative)`);
        
        // Glide cursor to Telestrator tab and click
        await removeHighlights(page);
        await smoothMoveTo(page, 'button[data-tab="telestrator"]', 3);
        await page.click('button[data-tab="telestrator"]');
        await page.waitForTimeout(1000);
        
        // Highlight Telestrator panel
        await highlightElement(page, '.telestrator-workspace-card');
        
        const canvas = page.locator('#pitch-canvas');
        const box = await canvas.boundingBox();
        if (box) {
            // Step 1: Select run tool
            console.log('[Recorder] Selecting Run tool...');
            await smoothMoveTo(page, '#tool-run', 3);
            await page.click('#tool-run');
            await page.waitForTimeout(200);

            // Step 2: Draw attacking run
            console.log('[Recorder] Drawing tactical run on canvas...');
            const runStartX = box.x + box.width * 0.45;
            const runStartY = box.y + box.height * 0.55;
            const runEndX = box.x + box.width * 0.58;
            const runEndY = box.y + box.height * 0.4;
            
            await page.mouse.move(runStartX, runStartY, { steps: 3 });
            await page.waitForTimeout(100);
            await page.mouse.down();
            
            for (let step = 1; step <= 3; step++) {
                const fraction = step / 3;
                await page.mouse.move(
                    runStartX + (runEndX - runStartX) * fraction,
                    runStartY + (runEndY - runStartY) * fraction
                );
                await page.waitForTimeout(10);
            }
            await page.mouse.up();
            await page.waitForTimeout(300);
            
            // Step 3: Click Analyze
            console.log('[Recorder] Clicking Analyze...');
            await smoothMoveTo(page, '#analyze-play-btn', 3);
            await page.click('#analyze-play-btn');
            await page.waitForTimeout(2000); // Watch text compile

            // Step 4: Select pass tool
            console.log('[Recorder] Selecting Pass tool...');
            await smoothMoveTo(page, '#tool-pass', 3);
            await page.click('#tool-pass');
            await page.waitForTimeout(200);

            // Step 5: Draw passing arc
            console.log('[Recorder] Drawing passing arc on canvas...');
            const passStartX = box.x + box.width * 0.40;
            const passStartY = box.y + box.height * 0.45;
            const passEndX = box.x + box.width * 0.65;
            const passEndY = box.y + box.height * 0.50;
            
            await page.mouse.move(passStartX, passStartY, { steps: 3 });
            await page.waitForTimeout(100);
            await page.mouse.down();
            
            for (let step = 1; step <= 3; step++) {
                const fraction = step / 3;
                await page.mouse.move(
                    passStartX + (passEndX - passStartX) * fraction,
                    passStartY + (passEndY - passStartY) * fraction
                );
                await page.waitForTimeout(10);
            }
            await page.mouse.up();
            await page.waitForTimeout(300);

            // Step 6: Click Play timeline
            console.log('[Recorder] Playing timeline...');
            await smoothMoveTo(page, '#play-pause-btn', 3);
            await page.click('#play-pause-btn');
            await page.waitForTimeout(1500);

            // Step 7: Click Pause
            console.log('[Recorder] Pausing timeline...');
            await page.click('#play-pause-btn'); // Mouse is already hovering there
            await page.waitForTimeout(300);

            // Step 8: Select measure tool
            console.log('[Recorder] Selecting Measure tool...');
            await smoothMoveTo(page, '#tool-measure', 3);
            await page.click('#tool-measure');
            await page.waitForTimeout(200);

            // Step 9: Draw measurement caliper
            console.log('[Recorder] Drawing measurement line...');
            const measStartX = box.x + box.width * 0.50;
            const measStartY = box.y + box.height * 0.35;
            const measEndX = box.x + box.width * 0.50;
            const measEndY = box.y + box.height * 0.65;
            
            await page.mouse.move(measStartX, measStartY, { steps: 3 });
            await page.waitForTimeout(100);
            await page.mouse.down();
            
            for (let step = 1; step <= 3; step++) {
                const fraction = step / 3;
                await page.mouse.move(
                    measStartX + (measEndX - measStartX) * fraction,
                    measStartY + (measEndY - measStartY) * fraction
                );
                await page.waitForTimeout(10);
            }
            await page.mouse.up();
            await page.waitForTimeout(1000);

            // Step 10: Click Clear sketch
            console.log('[Recorder] Clearing sketched plays...');
            await smoothMoveTo(page, '#clear-sketch', 3);
            await page.click('#clear-sketch');
            await page.waitForTimeout(300);
        }
        
        // Glide cursor to VAR tab and click
        await removeHighlights(page);
        await smoothMoveTo(page, 'button[data-tab="var-lab"]', 3);
        await page.click('button[data-tab="var-lab"]');
        await page.waitForTimeout(1000);
        
        // Highlight VAR camera viewport
        await highlightElement(page, '.var-lab-viewport-pane');
        
        // Grab offside slider knob and drag it back and forth
        const slider = page.locator('#slider-attacker-line');
        const sliderBox = await slider.boundingBox();
        if (sliderBox) {
            console.log('[Recorder] Grabbing attacker offside calibrator slider (back and forth)...');
            const startX = sliderBox.x + sliderBox.width * 0.45;
            const startY = sliderBox.y + sliderBox.height / 2;
            const leftX = sliderBox.x + sliderBox.width * 0.20; // Drag left (offside)
            const rightX = sliderBox.x + sliderBox.width * 0.60; // Drag right (onside)
            
            await page.mouse.move(startX, startY, { steps: 3 });
            await page.waitForTimeout(200);
            await page.mouse.down();
            
            // Drag to left (offside)
            await page.mouse.move(leftX, startY, { steps: 3 });
            await page.waitForTimeout(400);
            
            // Drag to right (onside)
            await page.mouse.move(rightX, startY, { steps: 3 });
            await page.waitForTimeout(400);
            
            // Drag to final offside alignment
            await page.mouse.move(leftX + 25, startY, { steps: 3 });
            await page.mouse.up();
        }
        
        const act5Elapsed = Date.now() - sessionStart;
        const act5Wait = Math.max(0, target5 - act5Elapsed);
        console.log(`[Recorder] Act 5 actions took ${act5Elapsed}ms cumulative. Waiting ${act5Wait}ms for sync...`);
        if (act5Wait > 0) await page.waitForTimeout(act5Wait);
        
        // ==========================================
        // ACT 6: Biometrics HUD (approx 25s)
        // ==========================================
        console.log(`[Recorder] Act 6: Biometrics HUD - Target: ${target6}ms (cumulative)`);
        
        // Glide cursor to Biometrics tab and click
        await removeHighlights(page);
        await smoothMoveTo(page, 'button[data-tab="biometrics"]');
        await page.click('button[data-tab="biometrics"]');
        await page.waitForTimeout(1000);
        
        // Highlight player selectors
        await highlightElement(page, '.player-selector-header');
        await page.waitForTimeout(3000); // Watch Messi biometrics
        
        // Glide cursor to Mbappe and click
        console.log('[Recorder] Switching biometrics to Mbappe...');
        await smoothMoveTo(page, 'button[data-player="mbappe"]');
        await page.click('button[data-player="mbappe"]');
        await page.waitForTimeout(3000); // Observe Mbappe biometrics
        
        // Glide cursor back to Messi and click
        console.log('[Recorder] Switching biometrics back to Messi...');
        await smoothMoveTo(page, 'button[data-player="messi"]');
        await page.click('button[data-player="messi"]');
        await page.waitForTimeout(3000); // Observe Messi biometrics
        
        // Glide cursor to Mbappe again
        console.log('[Recorder] Switching biometrics to Mbappe...');
        await smoothMoveTo(page, 'button[data-player="mbappe"]');
        await page.click('button[data-player="mbappe"]');
        
        // Highlight biometrics telemetry graphs
        await highlightElement(page, '.bio-telemetry-pane');
        
        const act6Elapsed = Date.now() - sessionStart;
        const act6Wait = Math.max(0, target6 - act6Elapsed);
        console.log(`[Recorder] Act 6 actions took ${act6Elapsed}ms cumulative. Waiting ${act6Wait}ms for sync...`);
        if (act6Wait > 0) await page.waitForTimeout(act6Wait);
        
        // ==========================================
        // ACT 7: Agent Network (approx 20s)
        // ==========================================
        console.log(`[Recorder] Act 7: Agent Network - Target: ${target7}ms (cumulative)`);
        
        // Glide cursor to Agent Network tab and click
        await removeHighlights(page);
        await smoothMoveTo(page, 'button[data-tab="agent-network"]');
        await page.click('button[data-tab="agent-network"]');
        await page.waitForTimeout(1000);
        
        // Highlight SVG network topology
        await highlightElement(page, '.topology-map-wrapper');
        
        // Glide cursor to Regulations Node and click
        await smoothMoveTo(page, '#node-regulations');
        await page.click('#node-regulations', { force: true });
        await page.waitForTimeout(1000);
        
        // Highlight console inspector logs panel
        await highlightElement(page, '#agent-inspector-panel');
        await page.waitForTimeout(1000); // Allow logs to stream in
        
        // Glide cursor to Force Recalibration button and click
        await smoothMoveTo(page, '#btn-recalibrate-agent');
        await page.click('#btn-recalibrate-agent', { force: true });
        await page.waitForTimeout(2000); // Observe the calibration warning/success cycle
        
        // Glide cursor to Tactics Node and click to finish the act
        await removeHighlights(page);
        await smoothMoveTo(page, '#node-tactics');
        await page.click('#node-tactics', { force: true });
        
        const act7Elapsed = Date.now() - sessionStart;
        const act7Wait = Math.max(0, target7 - act7Elapsed);
        console.log(`[Recorder] Act 7 actions took ${act7Elapsed}ms cumulative. Waiting ${act7Wait}ms for sync...`);
        if (act7Wait > 0) await page.waitForTimeout(act7Wait);
        
        // ==========================================
        // ACT 8: Outro & CTA (approx 15s)
        // ==========================================
        console.log(`[Recorder] Act 8: Outro - Target: ${target8}ms (cumulative)`);
        
        // Go back to landing page
        await removeHighlights(page);
        await page.goto(`http://localhost:${PORT}/index.html`);
        await page.waitForTimeout(1000);
        
        // Smooth scroll down to the final CTA quote
        await smoothScrollToElement(page, '.section-cta', 5000);
        
        const act8Elapsed = Date.now() - sessionStart;
        const act8Wait = Math.max(0, target8 - act8Elapsed);
        console.log(`[Recorder] Act 8 actions took ${act8Elapsed}ms cumulative. Waiting ${act8Wait}ms for sync...`);
        if (act8Wait > 0) await page.waitForTimeout(act8Wait);
        
        console.log('[Recorder] Video recording session complete.');
        
    } catch (e) {
        console.error('[Recorder] Automation error:', e);
    } finally {
        await context.close();
        await browser.close();
        server.close();
        console.log('[Recorder] Server stopped and browser closed.');
        
        const recordingFiles = fs.readdirSync(path.join(__dirname, 'recordings'));
        if (recordingFiles.length > 0) {
            recordingFiles.sort((a, b) => {
                return fs.statSync(path.join(__dirname, 'recordings', b)).mtime.getTime() - 
                       fs.statSync(path.join(__dirname, 'recordings', a)).mtime.getTime();
            });
            const latestVideo = path.join(__dirname, 'recordings', recordingFiles[0]);
            fs.writeFileSync(path.join(__dirname, 'latest_recording.json'), JSON.stringify({ path: latestVideo }, null, 4));
            console.log(`[Recorder] Recording compiled and saved to: ${latestVideo}`);
        } else {
            console.error('[Recorder] Critical: No video recording saved.');
        }
    }
}

record();
