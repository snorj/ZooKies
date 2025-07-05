/**
 * Browser-compatible database module
 * Exposes DatabaseManager to window object for use in browser environment
 * This is a simplified client-side version that communicates with the server API
 */

class DatabaseManager {
    constructor() {
        this.baseUrl = window.location.origin; // Get the current server URL
        console.log('🗄️ DatabaseManager initialized for browser');
    }

    async makeRequest(endpoint, method = 'GET', data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, config);
            if (!response.ok) {
                // Try to get error details from response
                let errorDetails = `HTTP error! status: ${response.status}`;
                try {
                    const errorBody = await response.json();
                    errorDetails = `HTTP ${response.status}: ${errorBody.error || errorBody.message || 'Unknown error'}`;
                    console.error('Server error details:', errorBody);
                } catch (parseError) {
                    console.error('Could not parse error response:', parseError);
                }
                throw new Error(errorDetails);
            }
            return await response.json();
        } catch (error) {
            console.error('Database request failed:', error);
            throw error;
        }
    }

    // Attestation management
    async storeAttestation(attestationData) {
        // Wrap attestation in the expected format for the server
        const requestBody = { attestation: attestationData };
        console.log('🌐 Sending attestation to server:', {
            endpoint: '/api/store-attestation',
            attestation: attestationData,
            requestBody: requestBody
        });
        return await this.makeRequest('/api/store-attestation', 'POST', requestBody);
    }

    async verifyAndStoreAttestation(attestation) {
        // For browser environment, delegate to server-side verification
        return await this.storeAttestation(attestation);
    }

    async getAttestations(userWallet = null) {
        if (!userWallet) {
            return [];
        }
        const response = await this.makeRequest(`/api/attestations?wallet=${userWallet}`);
        return response.attestations || [];
    }

    async getAllAttestations(userWallet) {
        return await this.getAttestations(userWallet);
    }

    async getAttestationById(id) {
        // Not implemented yet
        throw new Error('getAttestationById not implemented in browser version');
    }

    // Profile management
    async storeProfile(profileData) {
        return await this.makeRequest('/api/profiles', 'POST', profileData);
    }

    async getProfile(userWallet) {
        return await this.makeRequest(`/api/profiles/${userWallet}`);
    }

    async updateProfile(userWallet, profileData) {
        return await this.makeRequest(`/api/profiles/${userWallet}`, 'PUT', profileData);
    }

    // Analytics and reporting
    async logInteraction(interactionData) {
        return await this.makeRequest('/api/interactions', 'POST', interactionData);
    }

    async getAnalytics(domain = null, dateRange = null) {
        let endpoint = '/api/analytics';
        const params = new URLSearchParams();
        
        if (domain) params.append('domain', domain);
        if (dateRange) {
            params.append('startDate', dateRange.start);
            params.append('endDate', dateRange.end);
        }
        
        if (params.toString()) {
            endpoint += `?${params.toString()}`;
        }
        
        return await this.makeRequest(endpoint);
    }

    // Utility methods
    async healthCheck() {
        return await this.makeRequest('/api/health');
    }

    async validateConnection() {
        try {
            const result = await this.healthCheck();
            return result.status === 'OK';
        } catch (error) {
            console.error('Database connection validation failed:', error);
            return false;
        }
    }

    // Browser-specific helper methods
    async initializeForSite(domain) {
        console.log(`🌐 Initializing database connection for ${domain}`);
        
        const isConnected = await this.validateConnection();
        if (!isConnected) {
            throw new Error('Failed to connect to database API');
        }
        
        console.log('✅ Database connection validated');
        return true;
    }
}

// Expose to window object if in browser environment
if (typeof window !== 'undefined') {
    window.DatabaseManager = DatabaseManager;
    
    // Create a global instance for convenience
    window.dbManager = new DatabaseManager();
    
    console.log('✅ DatabaseManager available on window object');
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DatabaseManager };
} 