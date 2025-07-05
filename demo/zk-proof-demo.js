/**
 * ZooKies ZK Proof System - Comprehensive Judge Demo
 * 
 * This demo provides a complete interactive demonstration of the ZK proof system
 * with visual interface and console debugging capabilities for judges.
 */

class ZKProofDemo {
    constructor() {
        this.zkAgent = null;
        this.metrics = {
            setupTime: 0,
            attestationTime: 0,
            proofTime: 0,
            targetingTime: 0
        };
        this.attestations = [];
        this.currentProof = null;
        this.init();
    }

    async init() {
        console.log('🎬 ZK Proof Demo initializing...');
        this.attachEventListeners();
        await this.loadConsoleInterface();
        console.log('✅ Demo ready! Use window.demo() for quick start');
    }

    attachEventListeners() {
        // Phase 1: Setup
        document.getElementById('setup-btn').addEventListener('click', () => {
            this.setupDemo();
        });

        // Phase 2: Attestations
        document.getElementById('create-attestations-btn').addEventListener('click', () => {
            this.createAttestations();
        });

        // Phase 3: Proof Generation
        document.getElementById('generate-proof-btn').addEventListener('click', () => {
            const tag = document.getElementById('proof-tag-select').value;
            const threshold = parseInt(document.getElementById('proof-threshold').value);
            this.generateProof(tag, threshold);
        });

        // Phase 4: Ad Targeting
        document.getElementById('test-targeting-btn').addEventListener('click', () => {
            this.testAdTargeting();
        });
    }

    /**
     * Phase 1: Setup Demo - Initialize wallet and profile
     */
    async setupDemo() {
        const startTime = performance.now();
        
        try {
            this.updateStatus('setup-status', 'Initializing zkAffinityAgent...', 'info');
            this.setButtonLoading('setup-btn', true);

            // Initialize zkAffinityAgent
            if (!window.zkAffinityAgent) {
                window.zkAffinityAgent = new zkAffinityAgent();
            }
            this.zkAgent = window.zkAffinityAgent;

            // Ensure wallet and profile are initialized
            await this.zkAgent.ensureWalletAndProfile();

            // Update UI with wallet info
            await this.updateWalletInfo();

            this.metrics.setupTime = Math.round(performance.now() - startTime);
            document.getElementById('setup-time').textContent = this.metrics.setupTime;

            this.updateStatus('setup-status', 'System initialized successfully!', 'success');
            this.setButtonLoading('setup-btn', false);
            
            // Enable next phase
            document.getElementById('create-attestations-btn').disabled = false;
            document.getElementById('attestation-status').textContent = 'Ready to create attestations';

            console.log('✅ Phase 1 Complete: System initialized');

        } catch (error) {
            console.error('❌ Setup failed:', error);
            this.updateStatus('setup-status', `Setup failed: ${error.message}`, 'error');
            this.setButtonLoading('setup-btn', false);
        }
    }

    /**
     * Phase 2: Create Test Attestations
     */
    async createAttestations() {
        const startTime = performance.now();
        
        try {
            this.updateStatus('attestation-status', 'Creating test attestations...', 'info');
            this.setButtonLoading('create-attestations-btn', true);

            const attestationPlan = [
                { tag: 'defi', count: 3, description: 'DeFi Protocol Interactions' },
                { tag: 'privacy', count: 2, description: 'Privacy Tool Usage' },
                { tag: 'travel', count: 2, description: 'Travel Booking Behavior' },
                { tag: 'gaming', count: 1, description: 'Gaming Platform Activity' },
                { tag: 'technology', count: 2, description: 'Tech Product Interest' },
                { tag: 'finance', count: 1, description: 'Financial Service Usage' }
            ];

            let progress = 0;
            const totalAttestations = attestationPlan.reduce((sum, plan) => sum + plan.count, 0);

            for (const plan of attestationPlan) {
                for (let i = 0; i < plan.count; i++) {
                    await this.createSingleAttestation(plan.tag, `${plan.description} ${i + 1}`);
                    progress++;
                    
                    // Update progress bar
                    const progressPercent = (progress / totalAttestations) * 100;
                    document.getElementById('attestation-progress').style.width = `${progressPercent}%`;
                    
                    // Add small delay for visual effect
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }

            // Load and display attestations
            await this.loadAttestations();
            this.displayAttestations();

            this.metrics.attestationTime = Math.round(performance.now() - startTime);
            document.getElementById('attestation-time').textContent = this.metrics.attestationTime;

            this.updateStatus('attestation-status', `Created ${totalAttestations} test attestations across 6 categories`, 'success');
            this.setButtonLoading('create-attestations-btn', false);
            
            // Enable next phase
            document.getElementById('generate-proof-btn').disabled = false;
            document.getElementById('proof-status').textContent = 'Ready to generate ZK proof';

            console.log('✅ Phase 2 Complete: Attestations created');

        } catch (error) {
            console.error('❌ Attestation creation failed:', error);
            this.updateStatus('attestation-status', `Attestation creation failed: ${error.message}`, 'error');
            this.setButtonLoading('create-attestations-btn', false);
        }
    }

    /**
     * Phase 3: Generate ZK Proof
     */
    async generateProof(tag = 'defi', threshold = 2) {
        const startTime = performance.now();
        
        try {
            this.updateStatus('proof-status', `Generating ZK proof for ${tag} (threshold: ${threshold})...`, 'info');
            this.setButtonLoading('generate-proof-btn', true);

            // Start progress animation
            this.animateProgress('proof-progress', 10000); // 10 second animation

            // Generate proof using zkAffinityAgent
            const proofResult = await this.zkAgent.prove({ tag, threshold });
            this.currentProof = proofResult;

            this.metrics.proofTime = Math.round(performance.now() - startTime);
            document.getElementById('proof-time').textContent = this.metrics.proofTime;

            // Display proof results
            this.displayProofResults(proofResult, tag, threshold);

            if (proofResult.success) {
                this.updateStatus('proof-status', 'ZK proof generated and verified successfully!', 'success');
                
                // Enable next phase
                document.getElementById('test-targeting-btn').disabled = false;
                document.getElementById('targeting-status').textContent = 'Ready to test ad targeting';
                
                console.log('✅ Phase 3 Complete: ZK proof generated');
            } else {
                this.updateStatus('proof-status', `Proof generation failed: ${proofResult.error}`, 'error');
            }

            this.setButtonLoading('generate-proof-btn', false);

        } catch (error) {
            console.error('❌ Proof generation failed:', error);
            this.updateStatus('proof-status', `Proof generation failed: ${error.message}`, 'error');
            this.setButtonLoading('generate-proof-btn', false);
        }
    }

    /**
     * Phase 4: Test Ad Targeting
     */
    async testAdTargeting() {
        const startTime = performance.now();
        
        try {
            this.updateStatus('targeting-status', 'Testing ad targeting logic...', 'info');
            this.setButtonLoading('test-targeting-btn', true);

            const tag = document.getElementById('proof-tag-select').value;
            const threshold = parseInt(document.getElementById('proof-threshold').value);

            // Request ad using zkAffinityAgent
            const adResult = await this.zkAgent.requestAd({ tag, threshold });

            // Render ad in preview area
            this.renderAdPreview(adResult, tag);

            // Display targeting results
            this.displayTargetingResults(adResult, tag, threshold);

            this.metrics.targetingTime = Math.round(performance.now() - startTime);
            document.getElementById('targeting-time').textContent = this.metrics.targetingTime;

            if (adResult.qualified) {
                this.updateStatus('targeting-status', 'User qualified for targeted ad!', 'success');
            } else {
                this.updateStatus('targeting-status', 'User shown fallback ad', 'warning');
            }

            this.setButtonLoading('test-targeting-btn', false);
            
            console.log('✅ Phase 4 Complete: Ad targeting tested');
            console.log('🎉 Full demo complete! All phases executed successfully');

        } catch (error) {
            console.error('❌ Ad targeting failed:', error);
            this.updateStatus('targeting-status', `Ad targeting failed: ${error.message}`, 'error');
            this.setButtonLoading('test-targeting-btn', false);
        }
    }

    /**
     * Utility Methods
     */
    async createSingleAttestation(tag, description) {
        // Map demo tags to database-allowed tags
        const tagMapping = {
            'defi': 'finance',
            'finance': 'finance', 
            'privacy': 'privacy',
            'travel': 'travel',
            'gaming': 'gaming',
            'technology': 'gaming' // Map technology to gaming as fallback
        };
        
        const dbTag = tagMapping[tag.toLowerCase()] || 'finance';
        const nonce = Date.now() + Math.random(); // Simple nonce generation
        const walletAddress = this.zkAgent.wallet?.address;
        
        // Create attestation with all required fields
        const attestation = {
            tag: dbTag,
            timestamp: Date.now(),
            nonce: nonce.toString(),
            signature: `demo_sig_${nonce}`, // Demo signature
            publisher: 'demo-publisher',
            user_wallet: walletAddress,
            // Additional demo fields
            id: Date.now() + Math.random(),
            score: Math.floor(Math.random() * 50) + 50, // Score between 50-100
            description: description,
            source: `demo-${tag}`,
            verified: true,
            metadata: {
                created: new Date().toISOString(),
                demo: true,
                originalTag: tag
            }
        };

        // Store in IndexedDB via zkAffinityAgent
        await this.zkAgent.dbManager.storeAttestation(attestation);
        return attestation;
    }

    async loadAttestations() {
        try {
            const walletAddress = this.zkAgent.wallet?.address;
            if (walletAddress) {
                this.attestations = await this.zkAgent.dbManager.getAttestations(walletAddress);
            } else {
                this.attestations = [];
            }
            console.log(`📄 Loaded ${this.attestations.length} attestations`);
        } catch (error) {
            console.error('Failed to load attestations:', error);
            this.attestations = [];
        }
    }

    displayAttestations() {
        const grid = document.getElementById('attestation-grid');
        const tagCounts = {};
        
        // Count attestations by tag
        this.attestations.forEach(att => {
            tagCounts[att.tag] = (tagCounts[att.tag] || 0) + 1;
        });

        // Create cards for each tag
        const cards = Object.entries(tagCounts).map(([tag, count]) => `
            <div class="attestation-card">
                <h4>${tag.toUpperCase()}</h4>
                <p>${count} attestation${count !== 1 ? 's' : ''}</p>
            </div>
        `).join('');

        grid.innerHTML = cards;
        grid.classList.remove('hidden');
        grid.classList.add('fade-in');
    }

    displayProofResults(result, tag, threshold) {
        const resultsDiv = document.getElementById('proof-results');
        
        if (result.success) {
            resultsDiv.innerHTML = `
                <strong>Proof Generated Successfully!</strong><br>
                <strong>Tag:</strong> ${tag}<br>
                <strong>Threshold:</strong> ${threshold}<br>
                <strong>Attestations Used:</strong> ${result.attestationCount}<br>
                <strong>Verification:</strong> ${result.verification.valid ? '✅ Valid' : '❌ Invalid'}<br>
                <strong>Generation Time:</strong> ${this.metrics.proofTime}ms<br>
                <strong>Proof Size:</strong> ${JSON.stringify(result.proof).length} bytes
            `;
            resultsDiv.className = 'status-display success';
        } else {
            resultsDiv.innerHTML = `
                <strong>Proof Generation Failed</strong><br>
                <strong>Error:</strong> ${result.error}<br>
                <strong>Tag:</strong> ${tag}<br>
                <strong>Threshold:</strong> ${threshold}
            `;
            resultsDiv.className = 'status-display error';
        }
        
        resultsDiv.classList.remove('hidden');
        resultsDiv.classList.add('fade-in');
    }

    renderAdPreview(adResult, tag) {
        const preview = document.getElementById('ad-preview');
        
        if (adResult.qualified) {
            preview.innerHTML = `
                <div style="text-align: center;">
                    <h3>🎯 Targeted Ad - ${tag.toUpperCase()}</h3>
                    <p>This premium ad was shown because you proved interest in ${tag}</p>
                    <div style="background: #27ae60; color: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        ✅ ZK Verified - Privacy Preserved
                    </div>
                    <button style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px;">
                        Learn More
                    </button>
                </div>
            `;
            preview.classList.add('has-ad');
        } else {
            preview.innerHTML = `
                <div style="text-align: center;">
                    <h3>📝 Fallback Ad</h3>
                    <p>Generic advertisement - no targeting applied</p>
                    <div style="background: #f39c12; color: white; padding: 10px; border-radius: 5px; margin: 10px 0;">
                        ⚠️ ${adResult.reason}
                    </div>
                    <button style="background: #95a5a6; color: white; border: none; padding: 10px 20px; border-radius: 5px;">
                        General Offer
                    </button>
                </div>
            `;
            preview.classList.remove('has-ad');
        }
    }

    displayTargetingResults(result, tag, threshold) {
        const resultsDiv = document.getElementById('targeting-results');
        
        resultsDiv.innerHTML = `
            <strong>Ad Targeting Results</strong><br>
            <strong>Qualified:</strong> ${result.qualified ? '✅ Yes' : '❌ No'}<br>
            <strong>Tag:</strong> ${tag}<br>
            <strong>Threshold:</strong> ${threshold}<br>
            <strong>Response Time:</strong> ${this.metrics.targetingTime}ms<br>
            ${result.qualified 
                ? '<strong>Ad Type:</strong> Targeted (Premium)' 
                : `<strong>Reason:</strong> ${result.reason}`
            }
        `;
        
        resultsDiv.className = `status-display ${result.qualified ? 'success' : 'warning'}`;
        resultsDiv.classList.remove('hidden');
        resultsDiv.classList.add('fade-in');
    }

    async updateWalletInfo() {
        try {
            const walletAddress = this.zkAgent.wallet?.address || 'Not connected';
            const profileId = this.zkAgent.profile?.id || 'Not set';
            const dbStatus = this.zkAgent.dbManager ? 'Initialized' : 'Not initialized';

            document.getElementById('wallet-address').textContent = walletAddress;
            document.getElementById('profile-id').textContent = profileId;
            document.getElementById('db-status').textContent = dbStatus;
            
            document.getElementById('wallet-info').classList.remove('hidden');
            document.getElementById('wallet-info').classList.add('fade-in');
        } catch (error) {
            console.error('Failed to update wallet info:', error);
        }
    }

    updateStatus(elementId, message, type = 'info') {
        const element = document.getElementById(elementId);
        element.innerHTML = `<strong>Status:</strong> ${message}`;
        element.className = `status-display ${type}`;
    }

    setButtonLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.disabled = true;
            button.innerHTML += ' <div class="loading-spinner"></div>';
        } else {
            button.disabled = false;
            button.innerHTML = button.innerHTML.replace(/ <div class="loading-spinner"><\/div>/, '');
        }
    }

    animateProgress(elementId, duration) {
        const element = document.getElementById(elementId);
        element.style.width = '0%';
        
        const startTime = performance.now();
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            element.style.width = `${progress * 100}%`;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Console Interface for Judges
     */
    async loadConsoleInterface() {
        // Quick access commands
        window.demo = async () => {
            console.log('🎬 Running full automated demo...');
            try {
                await this.setupDemo();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.createAttestations();
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.generateProof('defi', 2);
                await new Promise(resolve => setTimeout(resolve, 1000));
                await this.testAdTargeting();
                console.log('🎉 Automated demo complete!');
            } catch (error) {
                console.error('❌ Demo failed:', error);
            }
        };

        window.stats = async () => {
            console.log('📊 Attestation Statistics:');
            await this.loadAttestations();
            
            const tagCounts = {};
            this.attestations.forEach(att => {
                tagCounts[att.tag] = (tagCounts[att.tag] || 0) + 1;
            });
            
            console.table(tagCounts);
            console.log(`Total attestations: ${this.attestations.length}`);
        };

        window.testAll = async () => {
            console.log('🧪 Testing all tag combinations...');
            const tags = ['defi', 'privacy', 'travel', 'gaming', 'technology', 'finance'];
            
            for (const tag of tags) {
                console.log(`\n🔍 Testing ${tag}...`);
                try {
                    const result = await this.zkAgent.prove({ tag, threshold: 1 });
                    console.log(`${tag}: ${result.success ? '✅ Success' : '❌ Failed'}`);
                    if (!result.success) {
                        console.log(`  Error: ${result.error}`);
                    }
                } catch (error) {
                    console.log(`${tag}: ❌ Error - ${error.message}`);
                }
            }
        };

        // zkAgent shortcuts
        window.zkAgent = {
            prove: async (tag = 'defi', threshold = 2) => {
                return await window.zkAffinityAgent.prove({ tag, threshold });
            },
            ad: async (tag = 'defi', threshold = 2) => {
                return await window.zkAffinityAgent.requestAd({ tag, threshold });
            },
            demo: async (tag = 'defi', threshold = 2) => {
                return await window.zkAffinityAgent.fullDemo(tag, threshold);
            },
            help: () => {
                window.zkAffinityAgent.help();
            }
        };

        console.log('🖥️ Console interface loaded:');
        console.log('  window.demo()     - Run full automated demo');
        console.log('  window.stats()    - Show attestation statistics');
        console.log('  window.testAll()  - Test all tag combinations');
        console.log('  window.zkAgent.*  - Quick access to proof methods');
    }

    /**
     * Full automated demo for judges
     */
    async runFullDemo() {
        console.log('🎬 Starting full automated judge demo...');
        
        try {
            // Run all phases automatically
            await this.setupDemo();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.createAttestations();
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.generateProof('defi', 2);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await this.testAdTargeting();
            
            console.log('🎉 Full demo completed successfully!');
            console.log('📊 Performance Summary:', this.metrics);
            
        } catch (error) {
            console.error('❌ Full demo failed:', error);
        }
    }
}

// Initialize demo when page loads
window.addEventListener('DOMContentLoaded', () => {
    window.zkProofDemo = new ZKProofDemo();
});

// Export for use in other contexts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ZKProofDemo;
} 