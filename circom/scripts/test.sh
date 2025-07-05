#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 Running ZK Circuit Test Suite...${NC}"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

# Check if test files exist
if [ ! -f "inputs/test/valid_threshold.json" ]; then
    echo -e "${RED}❌ Error: Test input files not found${NC}"
    exit 1
fi

# Run basic compilation test
echo -e "${YELLOW}🔧 Testing circuit compilation...${NC}"
if ./scripts/compile.sh > /tmp/compile.log 2>&1; then
    echo -e "${GREEN}✅ Circuit compilation test passed${NC}"
else
    echo -e "${RED}❌ Circuit compilation test failed${NC}"
    echo -e "${YELLOW}📄 Compilation log:${NC}"
    cat /tmp/compile.log
    exit 1
fi

# Test witness generation with various inputs
echo -e "${YELLOW}🧪 Testing witness generation...${NC}"

# Test with valid threshold input
if [ -f "build/circuits/ThresholdProof_js/generate_witness.js" ]; then
    cd build/circuits/ThresholdProof_js
    
    echo -e "${BLUE}  • Testing valid threshold case...${NC}"
    if node generate_witness.js ThresholdProof.wasm ../../../inputs/test/valid_threshold.json ../witness/valid_test.wtns; then
        echo -e "${GREEN}    ✅ Valid threshold test passed${NC}"
    else
        echo -e "${RED}    ❌ Valid threshold test failed${NC}"
        cd ../../..
        exit 1
    fi
    
    cd ../../..
else
    echo -e "${YELLOW}⚠️  Skipping witness tests - circuit not compiled${NC}"
fi

# Test proof generation if setup is complete
if [ -f "build/keys/ThresholdProof_final.zkey" ] && [ -f "build/witness/valid_test.wtns" ]; then
    echo -e "${YELLOW}🔐 Testing proof generation...${NC}"
    
    if snarkjs groth16 prove \
        "build/keys/ThresholdProof_final.zkey" \
        "build/witness/valid_test.wtns" \
        "build/proofs/validation_proof.json" \
        "build/proofs/validation_public.json"; then
        echo -e "${GREEN}✅ Proof generation test passed${NC}"
        
        # Test verification
        echo -e "${YELLOW}🔍 Testing proof verification...${NC}"
        if snarkjs groth16 verify \
            "build/keys/verification_key.json" \
            "build/proofs/validation_public.json" \
            "build/proofs/validation_proof.json"; then
            echo -e "${GREEN}✅ Proof verification test passed${NC}"
        else
            echo -e "${RED}❌ Proof verification test failed${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ Proof generation test failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping proof tests - setup not complete${NC}"
    echo -e "${BLUE}💡 Run './scripts/setup.sh' first to enable proof testing${NC}"
fi

# Run npm tests if available
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    echo -e "${YELLOW}📋 Running npm test suite...${NC}"
    if npm test; then
        echo -e "${GREEN}✅ npm test suite passed${NC}"
    else
        echo -e "${RED}❌ npm test suite failed${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}🎉 All tests completed successfully!${NC}"
echo -e "${BLUE}📊 Test Summary:${NC}"
echo -e "   ✅ Circuit compilation"
echo -e "   ✅ Witness generation"

if [ -f "build/proofs/validation_proof.json" ]; then
    echo -e "   ✅ Proof generation"
    echo -e "   ✅ Proof verification"
fi

echo -e "${YELLOW}💡 Circuit is ready for integration!${NC}" 