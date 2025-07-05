const { ethers } = require('ethers');
const database = require('../shared/database');
const { PublisherSigner } = require('../shared/cryptography');
const ZkAffinityAgent = require('../shared/zkAffinityAgent');
const puppeteer = require('puppeteer');
const assert = require('assert');
const path = require('path');

// Color codes for console output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

class FinanceNerdJourneyTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testWallet = null;
        this.baseUrl = 'http://localhost:3000';
        this.testStartTime = Date.now();
        this.stepResults = [];
    }

    async setup() {
        console.log(`${colors.blue}🚀 Setting up Finance Nerd Journey Test...${colors.reset}`);
        
        // Initialize clean database state
        await this.initializeCleanDatabase();
        
        // Create test wallet
        this.testWallet = ethers.Wallet.createRandom();
        console.log(`${colors.blue}📱 Test wallet created: ${this.testWallet.address}${colors.reset}`);
        
        // Launch browser
        this.browser = await puppeteer.launch({
            headless: false, // Set to true for automated environments
            defaultViewport: { width: 1280, height: 720 },
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 720 });
        
        // Enable console logging from browser
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log(`${colors.red}Browser Error: ${msg.text()}${colors.reset}`);
            }
        });
        
        // Handle page errors
        this.page.on('pageerror', error => {
            console.log(`${colors.red}Page Error: ${error.message}${colors.reset}`);
        });
        
        console.log(`${colors.green}✅ Setup completed successfully${colors.reset}`);
    }

    async initializeCleanDatabase() {
        try {
            const db = new database.DatabaseManager();
            await db.connect();
            
            // Clean test data
            await db.clearTestData();
            console.log(`${colors.blue}🗄️ Database cleaned for testing${colors.reset}`);
            
            await db.close();
        } catch (error) {
            console.error(`${colors.red}❌ Database cleanup failed: ${error.message}${colors.reset}`);
            throw error;
        }
    }

    async runComplete7StepJourney() {
        console.log(`${colors.blue}🎯 Starting Complete 7-Step Finance Nerd Journey${colors.reset}`);
        
        try {
            // Step 1: Navigate to themodernbyte.com
            await this.step1_NavigateToTheModernByte();
            
            // Step 2: Click NeoBank+ 5% APY finance ad
            await this.step2_ClickNeoBank();
            
            // Step 3: Complete attestation and verify database
            await this.step3_VerifyNeoBank();
            
            // Step 4: Click ClearVPN privacy ad
            await this.step4_ClickClearVPN();
            
            // Step 5: Navigate to smartlivingguide.com
            await this.step5_NavigateToSmartLivingGuide();
            
            // Step 6: Click Bloom debit card finance ad
            await this.step6_ClickBloomDebitCard();
            
            // Step 7: Access profile viewer and validate results
            await this.step7_ValidateProfileResults();
            
            console.log(`${colors.green}🎉 Complete 7-Step Journey PASSED!${colors.reset}`);
            
        } catch (error) {
            console.error(`${colors.red}❌ Journey Step Failed: ${error.message}${colors.reset}`);
            throw error;
        }
    }

    async step1_NavigateToTheModernByte() {
        console.log(`${colors.blue}📍 Step 1: Navigate to themodernbyte.com${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            await this.page.goto(`${this.baseUrl}/themodernbyte/`, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Verify page loaded correctly
            await this.page.waitForSelector('.site-title', { timeout: 10000 });
            const title = await this.page.$eval('.site-title', el => el.textContent);
            assert.strictEqual(title, 'TheModernByte', 'Site title should be TheModernByte');
            
            // Verify zkAffinityAgent is loaded
            await this.page.waitForFunction(() => window.zkAffinityAgent, { timeout: 10000 });
            
            // Verify articles are present
            const articles = await this.page.$$('.article');
            assert(articles.length >= 3, 'Should have at least 3 articles');
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 1, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 1 PASSED (${stepTime}ms)${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 1, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 1 failed: ${error.message}`);
        }
    }

    async step2_ClickNeoBank() {
        console.log(`${colors.blue}💰 Step 2: Click NeoBank+ 5% APY finance ad${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            // Find and click the NeoBank+ ad
            await this.page.waitForSelector('[data-ad-id="neobank-apy"]', { timeout: 10000 });
            
            // Verify ad content
            const adContent = await this.page.$eval('[data-ad-id="neobank-apy"]', el => el.textContent);
            assert(adContent.includes('5% APY'), 'NeoBank ad should mention 5% APY');
            assert(adContent.includes('NeoBank+'), 'NeoBank ad should mention NeoBank+');
            
            // Click the ad
            await this.page.click('[data-ad-id="neobank-apy"]');
            
            // Wait for modal to appear
            await this.page.waitForSelector('.modal-overlay', { timeout: 10000 });
            
            // Verify modal content
            const modalVisible = await this.page.isVisible('.modal-overlay');
            assert(modalVisible, 'Modal should be visible after ad click');
            
            // Simulate attestation creation by clicking interaction button
            await this.page.waitForSelector('.ad-interact-btn', { timeout: 5000 });
            await this.page.click('.ad-interact-btn');
            
            // Wait for success feedback
            await this.page.waitForSelector('.success-message', { timeout: 10000 });
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 2, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 2 PASSED (${stepTime}ms)${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 2, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 2 failed: ${error.message}`);
        }
    }

    async step3_VerifyNeoBank() {
        console.log(`${colors.blue}🔍 Step 3: Verify NeoBank attestation in database${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            // Wait a moment for database operation to complete
            await this.page.waitForTimeout(2000);
            
            // Verify attestation was created in database
            const attestations = await this.verifyDatabaseAttestation('finance', 'themodernbyte.com');
            assert(attestations.length >= 1, 'Should have at least 1 finance attestation');
            
            const latestAttestation = attestations[attestations.length - 1];
            assert.strictEqual(latestAttestation.tag, 'finance', 'Attestation should have finance tag');
            assert.strictEqual(latestAttestation.publisher, 'themodernbyte.com', 'Attestation should be from themodernbyte.com');
            
            // Verify signature is valid
            const isValid = await this.verifyAttestationSignature(latestAttestation);
            assert(isValid, 'Attestation signature should be valid');
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 3, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 3 PASSED (${stepTime}ms) - Finance attestation verified${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 3, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 3 failed: ${error.message}`);
        }
    }

    async step4_ClickClearVPN() {
        console.log(`${colors.blue}🛡️ Step 4: Click ClearVPN privacy ad${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            // Close any existing modal
            await this.dismissModal();
            
            // Find and click ClearVPN ad
            await this.page.waitForSelector('[data-ad-id="clearvpn"]', { timeout: 10000 });
            
            // Verify ad content
            const adContent = await this.page.$eval('[data-ad-id="clearvpn"]', el => el.textContent);
            assert(adContent.includes('ClearVPN'), 'ClearVPN ad should mention ClearVPN');
            assert(adContent.includes('privacy') || adContent.includes('Privacy'), 'ClearVPN ad should mention privacy');
            
            // Click the ad
            await this.page.click('[data-ad-id="clearvpn"]');
            
            // Wait for modal and interaction
            await this.page.waitForSelector('.modal-overlay', { timeout: 10000 });
            await this.page.waitForSelector('.ad-interact-btn', { timeout: 5000 });
            await this.page.click('.ad-interact-btn');
            
            // Wait for success feedback
            await this.page.waitForSelector('.success-message', { timeout: 10000 });
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 4, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 4 PASSED (${stepTime}ms)${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 4, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 4 failed: ${error.message}`);
        }
    }

    async step5_NavigateToSmartLivingGuide() {
        console.log(`${colors.blue}🏠 Step 5: Navigate to smartlivingguide.com${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            // Navigate to smartlivingguide
            await this.page.goto(`${this.baseUrl}/smartlivingguide/`, { 
                waitUntil: 'networkidle2',
                timeout: 30000 
            });
            
            // Verify page loaded
            await this.page.waitForSelector('.site-title', { timeout: 10000 });
            const title = await this.page.$eval('.site-title', el => el.textContent);
            assert(title.includes('Smart Living Guide'), 'Site title should include Smart Living Guide');
            
            // Verify zkAffinityAgent is loaded (cross-site functionality)
            await this.page.waitForFunction(() => window.zkAffinityAgent, { timeout: 10000 });
            
            // Verify articles are present
            const articles = await this.page.$$('.article');
            assert(articles.length >= 3, 'Should have at least 3 articles');
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 5, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 5 PASSED (${stepTime}ms)${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 5, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 5 failed: ${error.message}`);
        }
    }

    async step6_ClickBloomDebitCard() {
        console.log(`${colors.blue}🏦 Step 6: Click Bloom debit card finance ad${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            // Find and click Bloom ad
            await this.page.waitForSelector('[data-ad-id="bloom"]', { timeout: 10000 });
            
            // Verify ad content
            const adContent = await this.page.$eval('[data-ad-id="bloom"]', el => el.textContent);
            assert(adContent.includes('Bloom'), 'Bloom ad should mention Bloom');
            assert(adContent.includes('debit card') || adContent.includes('No Hidden Fees'), 'Bloom ad should mention debit card or no fees');
            
            // Click the ad
            await this.page.click('[data-ad-id="bloom"]');
            
            // Wait for modal and interaction
            await this.page.waitForSelector('.modal-overlay', { timeout: 10000 });
            await this.page.waitForSelector('.ad-interact-btn', { timeout: 5000 });
            await this.page.click('.ad-interact-btn');
            
            // Wait for success feedback
            await this.page.waitForSelector('.success-message', { timeout: 10000 });
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 6, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 6 PASSED (${stepTime}ms)${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 6, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 6 failed: ${error.message}`);
        }
    }

    async step7_ValidateProfileResults() {
        console.log(`${colors.blue}📊 Step 7: Validate aggregated profile results${colors.reset}`);
        
        const stepStart = Date.now();
        
        try {
            // Close any existing modal
            await this.dismissModal();
            
            // Open profile viewer
            await this.page.waitForSelector('.profile-viewer', { timeout: 10000 });
            await this.page.click('.profile-viewer .toggle-btn');
            
            // Wait for profile modal
            await this.page.waitForSelector('.profile-modal', { timeout: 10000 });
            
            // Verify profile data in UI
            const profileData = await this.page.evaluate(() => {
                const modal = document.querySelector('.profile-modal');
                if (!modal) return null;
                
                const totalElement = modal.querySelector('.total-attestations');
                const tagsElement = modal.querySelector('.tag-breakdown');
                const publishersElement = modal.querySelector('.publishers-list');
                const statusElement = modal.querySelector('.signature-status');
                
                return {
                    total: totalElement ? totalElement.textContent : '',
                    tags: tagsElement ? tagsElement.textContent : '',
                    publishers: publishersElement ? publishersElement.textContent : '',
                    status: statusElement ? statusElement.textContent : ''
                };
            });
            
            // Verify expected counts
            assert(profileData.total.includes('3'), 'Should show 3 total attestations');
            assert(profileData.tags.includes('finance') && profileData.tags.includes('2'), 'Should show 2 finance attestations');
            assert(profileData.tags.includes('privacy') && profileData.tags.includes('1'), 'Should show 1 privacy attestation');
            
            // Verify publishers
            assert(profileData.publishers.includes('themodernbyte.com'), 'Should show themodernbyte.com');
            assert(profileData.publishers.includes('smartlivingguide.com'), 'Should show smartlivingguide.com');
            
            // Verify signatures are valid
            assert(profileData.status.includes('valid') || profileData.status.includes('Valid'), 'All signatures should be valid');
            
            // Final database verification
            const allAttestations = await this.verifyCompleteJourney();
            assert.strictEqual(allAttestations.length, 3, 'Should have exactly 3 attestations in database');
            
            const stepTime = Date.now() - stepStart;
            this.stepResults.push({ step: 7, time: stepTime, status: 'PASSED' });
            
            console.log(`${colors.green}✅ Step 7 PASSED (${stepTime}ms) - Profile validation complete${colors.reset}`);
            
        } catch (error) {
            this.stepResults.push({ step: 7, time: Date.now() - stepStart, status: 'FAILED', error: error.message });
            throw new Error(`Step 7 failed: ${error.message}`);
        }
    }

    async verifyDatabaseAttestation(expectedTag, expectedPublisher) {
        const db = new database.DatabaseManager();
        await db.connect();
        
        try {
            const attestations = await db.getAttestations();
            const filtered = attestations.filter(att => 
                att.tag === expectedTag && att.publisher === expectedPublisher
            );
            
            return filtered;
        } finally {
            await db.close();
        }
    }

    async verifyAttestationSignature(attestation) {
        try {
            const signer = new PublisherSigner(null, attestation.publisher);
            return await signer.verifyAttestation(attestation);
        } catch (error) {
            console.error(`Signature verification failed: ${error.message}`);
            return false;
        }
    }

    async verifyCompleteJourney() {
        const db = new database.DatabaseManager();
        await db.connect();
        
        try {
            const attestations = await db.getAttestations();
            
            // Count by tags
            const tagCounts = {};
            const publisherCounts = {};
            
            attestations.forEach(att => {
                tagCounts[att.tag] = (tagCounts[att.tag] || 0) + 1;
                publisherCounts[att.publisher] = (publisherCounts[att.publisher] || 0) + 1;
            });
            
            console.log(`${colors.blue}📊 Journey Summary:${colors.reset}`);
            console.log(`   Total attestations: ${attestations.length}`);
            console.log(`   Tag breakdown: ${JSON.stringify(tagCounts)}`);
            console.log(`   Publisher breakdown: ${JSON.stringify(publisherCounts)}`);
            
            return attestations;
        } finally {
            await db.close();
        }
    }

    async dismissModal() {
        try {
            const modalExists = await this.page.$('.modal-overlay');
            if (modalExists) {
                await this.page.click('.modal-overlay');
                await this.page.waitForSelector('.modal-overlay', { hidden: true, timeout: 5000 });
            }
        } catch (error) {
            // Modal might not exist or already closed
        }
    }

    async cleanup() {
        console.log(`${colors.blue}🧹 Cleaning up test environment...${colors.reset}`);
        
        if (this.browser) {
            await this.browser.close();
        }
        
        // Clean test data
        await this.initializeCleanDatabase();
        
        console.log(`${colors.green}✅ Cleanup completed${colors.reset}`);
    }

    async generateReport() {
        const totalTime = Date.now() - this.testStartTime;
        const passedSteps = this.stepResults.filter(s => s.status === 'PASSED').length;
        const failedSteps = this.stepResults.filter(s => s.status === 'FAILED').length;
        
        console.log(`\n${colors.blue}📈 FINANCE NERD JOURNEY TEST REPORT${colors.reset}`);
        console.log(`${'='.repeat(50)}`);
        console.log(`Total execution time: ${totalTime}ms`);
        console.log(`Steps passed: ${colors.green}${passedSteps}${colors.reset}`);
        console.log(`Steps failed: ${colors.red}${failedSteps}${colors.reset}`);
        console.log(`Success rate: ${Math.round((passedSteps / this.stepResults.length) * 100)}%`);
        
        console.log(`\n${colors.blue}Step-by-step breakdown:${colors.reset}`);
        this.stepResults.forEach(step => {
            const status = step.status === 'PASSED' ? 
                `${colors.green}✅ PASSED${colors.reset}` : 
                `${colors.red}❌ FAILED${colors.reset}`;
            console.log(`  Step ${step.step}: ${status} (${step.time}ms)`);
            if (step.error) {
                console.log(`    Error: ${colors.red}${step.error}${colors.reset}`);
            }
        });
        
        return {
            totalTime,
            passedSteps,
            failedSteps,
            successRate: Math.round((passedSteps / this.stepResults.length) * 100),
            steps: this.stepResults
        };
    }
}

// Main test execution
async function runFinanceNerdJourneyTest() {
    console.log(`${colors.blue}🧪 Starting Finance Nerd Journey End-to-End Test${colors.reset}`);
    console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
    
    const test = new FinanceNerdJourneyTest();
    
    try {
        await test.setup();
        await test.runComplete7StepJourney();
        
        const report = await test.generateReport();
        
        if (report.failedSteps === 0) {
            console.log(`\n${colors.green}🎉 ALL TESTS PASSED! Finance Nerd Journey is working perfectly.${colors.reset}`);
            process.exit(0);
        } else {
            console.log(`\n${colors.red}❌ SOME TESTS FAILED. Please check the errors above.${colors.reset}`);
            process.exit(1);
        }
        
    } catch (error) {
        console.error(`\n${colors.red}💥 Test execution failed: ${error.message}${colors.reset}`);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await test.cleanup();
    }
}

// Export for use in other test files
module.exports = {
    FinanceNerdJourneyTest,
    runFinanceNerdJourneyTest
};

// Run test if this file is executed directly
if (require.main === module) {
    runFinanceNerdJourneyTest();
} 