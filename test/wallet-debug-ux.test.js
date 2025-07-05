/**
 * Test suite for Wallet Debug UX implementation
 */

import { describe, test, expect } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Wallet Debug UX Implementation', () => {
    test('themodernbyte should have wallet debug HTML elements', () => {
        const htmlPath = join(__dirname, '../themodernbyte/index.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        
        // Check for wallet debug HTML structure
        expect(htmlContent).toContain('wallet-debug');
        expect(htmlContent).toContain('id="walletAddress"');
        expect(htmlContent).toContain('wallet-refresh');
        expect(htmlContent).toContain('onclick="refreshWalletDisplay()"');
        expect(htmlContent).toContain('Wallet:');
        expect(htmlContent).toContain('Connecting...');
    });

    test('smartlivingguide should have wallet debug HTML elements', () => {
        const htmlPath = join(__dirname, '../smartlivingguide/index.html');
        const htmlContent = readFileSync(htmlPath, 'utf8');
        
        // Check for wallet debug HTML structure
        expect(htmlContent).toContain('wallet-debug');
        expect(htmlContent).toContain('id="walletAddress"');
        expect(htmlContent).toContain('wallet-refresh');
        expect(htmlContent).toContain('onclick="refreshWalletDisplay()"');
        expect(htmlContent).toContain('Wallet:');
        expect(htmlContent).toContain('Connecting...');
    });

    test('themodernbyte should have wallet debug CSS styling', () => {
        const cssPath = join(__dirname, '../themodernbyte/styles.css');
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Check for wallet debug CSS classes
        expect(cssContent).toContain('.wallet-debug');
        expect(cssContent).toContain('.wallet-label');
        expect(cssContent).toContain('.wallet-address');
        expect(cssContent).toContain('.wallet-refresh');
        expect(cssContent).toContain('.wallet-address.loading');
        expect(cssContent).toContain('.wallet-address.error');
        expect(cssContent).toContain('@keyframes pulse');
        expect(cssContent).toContain('font-family: \'Courier New\', monospace');
        expect(cssContent).toContain('min-width: 120px');
    });

    test('smartlivingguide should have wallet debug CSS styling', () => {
        const cssPath = join(__dirname, '../smartlivingguide/styles.css');
        const cssContent = readFileSync(cssPath, 'utf8');
        
        // Check for wallet debug CSS classes
        expect(cssContent).toContain('.wallet-debug');
        expect(cssContent).toContain('.wallet-label');
        expect(cssContent).toContain('.wallet-address');
        expect(cssContent).toContain('.wallet-refresh');
        expect(cssContent).toContain('.wallet-address.loading');
        expect(cssContent).toContain('.wallet-address.error');
        expect(cssContent).toContain('@keyframes pulse');
        expect(cssContent).toContain('font-family: \'Courier New\', monospace');
        expect(cssContent).toContain('min-width: 120px');
    });

    test('themodernbyte should have wallet debug JavaScript functions', () => {
        const jsPath = join(__dirname, '../themodernbyte/scripts.js');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        // Check for wallet debug JavaScript functions
        expect(jsContent).toContain('initializeWalletDebug');
        expect(jsContent).toContain('updateWalletDisplay');
        expect(jsContent).toContain('refreshWalletDisplay');
        expect(jsContent).toContain('truncateAddress');
        expect(jsContent).toContain('setupWalletConsoleDebug');
        expect(jsContent).toContain('window.zkAgent.getWallet');
        expect(jsContent).toContain('window.zkAgent.getWalletShort');
        expect(jsContent).toContain('window.zkAgent.ensureWalletAndProfile');
        expect(jsContent).toContain('await initializeWalletDebug()');
    });

    test('smartlivingguide should have wallet debug JavaScript functions', () => {
        const jsPath = join(__dirname, '../smartlivingguide/scripts.js');
        const jsContent = readFileSync(jsPath, 'utf8');
        
        // Check for wallet debug JavaScript functions
        expect(jsContent).toContain('initializeWalletDebug');
        expect(jsContent).toContain('updateWalletDisplay');
        expect(jsContent).toContain('refreshWalletDisplay');
        expect(jsContent).toContain('truncateAddress');
        expect(jsContent).toContain('setupWalletConsoleDebug');
        expect(jsContent).toContain('window.zkAgent.getWallet');
        expect(jsContent).toContain('window.zkAgent.getWalletShort');
        expect(jsContent).toContain('window.zkAgent.ensureWalletAndProfile');
        expect(jsContent).toContain('await initializeWalletDebug()');
    });

    test('wallet debug should have proper responsive design', () => {
        const themodernbyteCss = readFileSync(join(__dirname, '../themodernbyte/styles.css'), 'utf8');
        const smartlivinguideCss = readFileSync(join(__dirname, '../smartlivingguide/styles.css'), 'utf8');
        
        // Check mobile responsive styles
        [themodernbyteCss, smartlivinguideCss].forEach(cssContent => {
            expect(cssContent).toContain('@media (max-width: 768px)');
            expect(cssContent).toMatch(/\.wallet-debug\s*{[\s\S]*font-size:\s*0\.75rem/);
            expect(cssContent).toMatch(/\.wallet-address\s*{[\s\S]*min-width:\s*100px/);
        });
    });

    test('wallet debug should have proper console debug commands', () => {
        const themodernbyteJs = readFileSync(join(__dirname, '../themodernbyte/scripts.js'), 'utf8');
        const smartlivinguideJs = readFileSync(join(__dirname, '../smartlivingguide/scripts.js'), 'utf8');
        
        // Check for debug command logging
        [themodernbyteJs, smartlivinguideJs].forEach(jsContent => {
            expect(jsContent).toContain('🔧 Wallet Debug Commands Available:');
            expect(jsContent).toContain('window.zkAgent.getWallet() - Get full wallet object');
            expect(jsContent).toContain('window.zkAgent.getWalletShort() - Get truncated address');
            expect(jsContent).toContain('window.zkAgent.ensureWalletAndProfile() - Initialize Privy wallet');
            expect(jsContent).toContain('window.zkAgent.getProfile() - Get profile summary');
            expect(jsContent).toContain('window.zkAgent.refreshWallet() - Refresh wallet display');
        });
    });

    test('wallet debug should handle error states properly', () => {
        const themodernbyteJs = readFileSync(join(__dirname, '../themodernbyte/scripts.js'), 'utf8');
        const smartlivinguideJs = readFileSync(join(__dirname, '../smartlivingguide/scripts.js'), 'utf8');
        
        // Check for error handling
        [themodernbyteJs, smartlivinguideJs].forEach(jsContent => {
            expect(jsContent).toContain('wallet-address error');
            expect(jsContent).toContain('No Wallet');
            expect(jsContent).toContain('zkAgent not available');
            expect(jsContent).toContain('Privy wallet not available, trying fallback');
            expect(jsContent).toContain('Failed to get wallet address');
        });
    });

    test('wallet debug should support Privy integration', () => {
        const themodernbyteJs = readFileSync(join(__dirname, '../themodernbyte/scripts.js'), 'utf8');
        const smartlivinguideJs = readFileSync(join(__dirname, '../smartlivingguide/scripts.js'), 'utf8');
        
        // Check for Privy integration support
        [themodernbyteJs, smartlivinguideJs].forEach(jsContent => {
            expect(jsContent).toContain('zkAgent.getWalletShort');
            expect(jsContent).toContain('zkAgent.ensureWalletAndProfile');
            expect(jsContent).toContain('Privy integration not available');
            expect(jsContent).toContain('Try clicking an ad first to initialize');
        });
    });
}); 