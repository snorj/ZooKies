const puppeteer = require('puppeteer');

async function debugInitialization() {
    const browser = await puppeteer.launch({ 
        headless: false, // Show browser for debugging
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Capture all console output
    page.on('console', msg => {
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Capture errors
    page.on('pageerror', err => {
        console.error('Page error:', err.message);
    });
    
    // Navigate to the page
    console.log('Navigating to themodernbyte...');
    await page.goto('http://localhost:3000/themodernbyte', { 
        waitUntil: 'networkidle2',
        timeout: 10000
    });
    
    // Check if zkAffinityAgent is loaded
    const zkAgentCheck = await page.evaluate(() => {
        return {
            windowZkAffinityAgent: typeof window.zkAffinityAgent,
            zkAffinityAgentClass: typeof ZkAffinityAgent,
            hasZkAgent: !!window.zkAffinityAgent,
            zkAgentMethods: window.zkAffinityAgent ? Object.getOwnPropertyNames(Object.getPrototypeOf(window.zkAffinityAgent)) : null,
            error: window.zkAffinityAgent ? null : 'zkAffinityAgent not found on window'
        };
    });
    
    console.log('zkAffinityAgent status:', JSON.stringify(zkAgentCheck, null, 2));
    
    // Try to click the ad and see what happens
    console.log('Looking for NeoBank ad...');
    try {
        await page.waitForSelector('[data-ad-id="neobank-apy"]', { timeout: 5000 });
        console.log('✅ Found NeoBank ad element');
        
        // Click the ad
        await page.click('[data-ad-id="neobank-apy"]');
        console.log('✅ Clicked NeoBank ad');
        
        // Wait a bit and check for modal
        await page.waitForTimeout(2000);
        
        const modalCheck = await page.evaluate(() => {
            const modal = document.querySelector('.ad-modal-overlay');
            const modalTitle = document.querySelector('#adModalTitle');
            return {
                hasModal: !!modal,
                modalVisible: modal ? modal.style.display !== 'none' : false,
                modalTitle: modalTitle ? modalTitle.textContent : null,
                allModals: Array.from(document.querySelectorAll('.ad-modal-overlay, #adModalOverlay')).map(el => ({
                    className: el.className,
                    id: el.id,
                    display: el.style.display,
                    visible: el.style.display !== 'none'
                }))
            };
        });
        
        console.log('Modal status:', JSON.stringify(modalCheck, null, 2));
        
    } catch (error) {
        console.error('Failed to interact with ad:', error.message);
    }
    
    // Keep browser open for inspection
    console.log('Keeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
    await browser.close();
}

debugInitialization().catch(console.error); 