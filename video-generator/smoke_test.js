const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8081; // Use a different port to avoid conflicts
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
    console.log(`[Smoke Test] Static server started on http://localhost:${PORT}`);
    return server;
}

async function runSmokeTest() {
    const server = startServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const errors = [];
    page.on('pageerror', (err) => {
        console.error('[Browser Page Error]:', err.stack || err.message);
        errors.push(err);
    });

    page.on('console', (msg) => {
        if (msg.type() === 'error') {
            console.error('[Browser Console Error]:', msg.text());
        }
    });

    try {
        console.log('[Smoke Test] Navigating to app.html...');
        await page.goto(`http://localhost:${PORT}/app.html`);
        await page.waitForLoadState('domcontentloaded');
        
        // Wait for the splash screen to fade out
        await page.waitForTimeout(4000);

        const isSplashHidden = await page.evaluate(() => {
            const splash = document.getElementById('splash-screen');
            return splash ? splash.classList.contains('hidden') : true;
        });
        if (!isSplashHidden) {
            throw new Error('Splash screen is not hidden after 4 seconds');
        }

        console.log('[Smoke Test] Checking initial state (should be World Cup Final by default)...');
        const homeTeam = await page.locator('#home-team-name').innerText();
        const awayTeam = await page.locator('#away-team-name').innerText();
        const stadium = await page.locator('#hud-stadium').innerText();
        
        console.log(`[Smoke Test] Default teams: ${homeTeam} vs ${awayTeam} at ${stadium}`);
        
        // Assertions for the default World Cup Final
        if (homeTeam !== 'ARG' || awayTeam !== 'FRA') {
            throw new Error(`Default match is not World Cup 2022 (ARG vs FRA). Got ${homeTeam} vs ${awayTeam}`);
        }
        if (!stadium.toLowerCase().includes('lusail')) {
            throw new Error(`Default stadium should be Lusail. Got ${stadium}`);
        }

        console.log('[Smoke Test] Selecting different match (Qatar vs Ecuador)...');
        await page.selectOption('#global-match-select', 'qatar-ecuador-2022');
        await page.waitForTimeout(1000);

        const homeTeam2 = await page.locator('#home-team-name').innerText();
        const awayTeam2 = await page.locator('#away-team-name').innerText();
        console.log(`[Smoke Test] Selected match teams: ${homeTeam2} vs ${awayTeam2}`);
        
        if (homeTeam2 !== 'QAT' || awayTeam2 !== 'ECU') {
            throw new Error(`Match switching failed. Expected QAT vs ECU, got ${homeTeam2} vs ${awayTeam2}`);
        }

        console.log('[Smoke Test] Selecting World Cup Final again...');
        await page.selectOption('#global-match-select', 'world-cup-2022');
        await page.waitForTimeout(1000);
        
        if (errors.length > 0) {
            throw new Error(`Smoke test failed with ${errors.length} browser errors during execution.`);
        }
        
        console.log('[Smoke Test] SUCCESS: App loaded, match selector and state initialization checked without console errors.');
        process.exitCode = 0;
    } catch (err) {
        console.error('[Smoke Test] FAILED:', err.message);
        process.exitCode = 1;
    } finally {
        await browser.close();
        server.close();
        console.log('[Smoke Test] Teardown complete.');
    }
}

runSmokeTest();
