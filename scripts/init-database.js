const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const dbPath = path.join(__dirname, '..', 'database', 'zookies.db');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Create and initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to SQLite database at:', dbPath);
});

// Attestations table creation
const createAttestationsTable = `
CREATE TABLE IF NOT EXISTS attestations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag TEXT NOT NULL,                    -- 'finance', 'privacy', 'travel', 'gaming'
    timestamp INTEGER NOT NULL,           -- Unix timestamp
    nonce TEXT NOT NULL,                  -- UUID for uniqueness
    signature TEXT NOT NULL,              -- ECDSA signature
    publisher TEXT NOT NULL,              -- 'themodernbyte.com' or 'smartlivingguide.com'
    user_wallet TEXT NOT NULL,            -- User's wallet address
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// User profiles table creation
const createUserProfilesTable = `
CREATE TABLE IF NOT EXISTS user_profiles (
    wallet_address TEXT PRIMARY KEY,
    signed_profile_claim TEXT,            -- JSON string of signed message
    self_proof TEXT,                      -- JSON string of Self identity proof
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`;

// Index creation for performance optimization
const createIndexes = [
    `CREATE INDEX IF NOT EXISTS idx_attestations_wallet ON attestations(user_wallet);`,
    `CREATE INDEX IF NOT EXISTS idx_attestations_tag ON attestations(tag);`,
    `CREATE INDEX IF NOT EXISTS idx_attestations_timestamp ON attestations(timestamp);`,
    `CREATE INDEX IF NOT EXISTS idx_attestations_publisher ON attestations(publisher);`,
    `CREATE INDEX IF NOT EXISTS idx_user_profiles_created ON user_profiles(created_at);`
];

// Execute database schema creation
db.serialize(() => {
    console.log('Creating attestations table...');
    db.run(createAttestationsTable, (err) => {
        if (err) {
            console.error('Error creating attestations table:', err.message);
            process.exit(1);
        }
        console.log('✅ Attestations table created successfully');
    });

    console.log('Creating user_profiles table...');
    db.run(createUserProfilesTable, (err) => {
        if (err) {
            console.error('Error creating user_profiles table:', err.message);
            process.exit(1);
        }
        console.log('✅ User profiles table created successfully');
    });

    console.log('Creating performance indexes...');
    createIndexes.forEach((indexQuery, i) => {
        db.run(indexQuery, (err) => {
            if (err) {
                console.error(`Error creating index ${i + 1}:`, err.message);
            } else {
                console.log(`✅ Index ${i + 1} created successfully`);
            }
        });
    });

    // Verify schema creation
    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
            console.error('Error verifying tables:', err.message);
            process.exit(1);
        }
        
        console.log('\n📊 Database Schema Verification:');
        console.log('Tables created:', tables.map(t => t.name));
        
        // Verify attestations table schema
        db.all("PRAGMA table_info(attestations)", (err, attestationColumns) => {
            if (err) {
                console.error('Error checking attestations schema:', err.message);
                process.exit(1);
            }
            
            console.log('\n🔍 Attestations Table Schema:');
            attestationColumns.forEach(col => {
                console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
            });
            
            // Verify user_profiles table schema
            db.all("PRAGMA table_info(user_profiles)", (err, profileColumns) => {
                if (err) {
                    console.error('Error checking user_profiles schema:', err.message);
                    process.exit(1);
                }
                
                console.log('\n🔍 User Profiles Table Schema:');
                profileColumns.forEach(col => {
                    console.log(`  - ${col.name}: ${col.type} ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
                });
                
                console.log('\n✅ Database initialization completed successfully!');
                console.log(`Database file created at: ${dbPath}`);
                
                // Close database connection
                db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err.message);
                        process.exit(1);
                    }
                    console.log('Database connection closed.');
                    process.exit(0);
                });
            });
        });
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    db.close();
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    db.close();
    process.exit(1);
}); 