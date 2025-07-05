#!/usr/bin/env node

/**
 * Comprehensive ZK Proof Test Runner
 * Executes all test suites in the correct order with proper reporting
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TestRunner {
  constructor() {
    this.results = {
      circuit: null,
      zkProofBuilder: null,
      apiEnhanced: null,
      e2e: null,
      overall: null
    };
    this.startTime = Date.now();
    this.coverageEnabled = process.argv.includes('--coverage');
    this.verbose = process.argv.includes('--verbose');
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    this.log('\n' + '='.repeat(60), 'cyan');
    this.log(`  ${title}`, 'bright');
    this.log('='.repeat(60), 'cyan');
  }

  async runCommand(command, cwd = process.cwd()) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(' ');
      const child = spawn(cmd, args, { cwd, stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        if (this.verbose) {
          process.stdout.write(data);
        }
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        if (this.verbose) {
          process.stderr.write(data);
        }
      });

      child.on('close', (code) => {
        resolve({
          code,
          stdout,
          stderr,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async checkPrerequisites() {
    this.logSection('Checking Prerequisites');
    
    // Check if server is running
    try {
      const response = await fetch('http://localhost:3000/api/verification-key');
      this.log('✅ Server is running and accessible', 'green');
    } catch (error) {
      this.log('⚠️  Server not running - some E2E tests may fail', 'yellow');
    }

    // Check if circuit files exist
    const circuitPaths = [
      'circom/build/circuits/ThresholdProof_js/ThresholdProof.wasm',
      'circom/build/keys/ThresholdProof_final.zkey',
      'circom/build/keys/verification_key.json'
    ];

    let circuitFilesReady = true;
    for (const filePath of circuitPaths) {
      if (fs.existsSync(filePath)) {
        this.log(`✅ Found ${filePath}`, 'green');
      } else {
        this.log(`❌ Missing ${filePath}`, 'red');
        circuitFilesReady = false;
      }
    }

    if (!circuitFilesReady) {
      this.log('\n💡 Run the following to build circuit files:', 'yellow');
      this.log('   cd circom && npm run build', 'yellow');
    }

    return circuitFilesReady;
  }

  async runCircuitTests() {
    this.logSection('Phase 1: Circuit Testing');
    
    try {
      const result = await this.runCommand('npm test', path.join(__dirname, '..', 'circom'));
      
      if (result.success) {
        this.log('✅ Circuit tests passed', 'green');
        this.results.circuit = { success: true, output: result.stdout };
      } else {
        this.log('❌ Circuit tests failed', 'red');
        this.results.circuit = { success: false, error: result.stderr };
      }
    } catch (error) {
      this.log(`❌ Circuit test execution failed: ${error.message}`, 'red');
      this.results.circuit = { success: false, error: error.message };
    }

    return this.results.circuit.success;
  }

  async runZkProofBuilderTests() {
    this.logSection('Phase 2: zkProofBuilder Testing');
    
    try {
      const result = await this.runCommand('npx jest test/zkProofBuilder.test.js --verbose');
      
      if (result.success) {
        this.log('✅ zkProofBuilder tests passed', 'green');
        this.results.zkProofBuilder = { success: true, output: result.stdout };
      } else {
        this.log('❌ zkProofBuilder tests failed', 'red');
        this.results.zkProofBuilder = { success: false, error: result.stderr };
      }
    } catch (error) {
      this.log(`❌ zkProofBuilder test execution failed: ${error.message}`, 'red');
      this.results.zkProofBuilder = { success: false, error: error.message };
    }

    return this.results.zkProofBuilder.success;
  }

  async runApiTests() {
    this.logSection('Phase 3: Enhanced API Testing');
    
    try {
      const result = await this.runCommand('npx jest test/api-verify-proof-enhanced.test.js --verbose');
      
      if (result.success) {
        this.log('✅ Enhanced API tests passed', 'green');
        this.results.apiEnhanced = { success: true, output: result.stdout };
      } else {
        this.log('❌ Enhanced API tests failed', 'red');
        this.results.apiEnhanced = { success: false, error: result.stderr };
      }
    } catch (error) {
      this.log(`❌ Enhanced API test execution failed: ${error.message}`, 'red');
      this.results.apiEnhanced = { success: false, error: error.message };
    }

    return this.results.apiEnhanced.success;
  }

  async runE2ETests() {
    this.logSection('Phase 4: End-to-End Integration Testing');
    
    try {
      const result = await this.runCommand('npx jest test/e2e-zk-proof.test.js --verbose --detectOpenHandles');
      
      if (result.success) {
        this.log('✅ E2E integration tests passed', 'green');
        this.results.e2e = { success: true, output: result.stdout };
      } else {
        this.log('❌ E2E integration tests failed', 'red');
        this.results.e2e = { success: false, error: result.stderr };
      }
    } catch (error) {
      this.log(`❌ E2E test execution failed: ${error.message}`, 'red');
      this.results.e2e = { success: false, error: error.message };
    }

    return this.results.e2e.success;
  }

  async generateCoverageReport() {
    if (!this.coverageEnabled) return;
    
    this.logSection('Generating Coverage Report');
    
    try {
      const result = await this.runCommand('npx jest --coverage --collectCoverageFrom="shared/**/*.js"');
      
      if (result.success) {
        this.log('✅ Coverage report generated', 'green');
        this.log('📊 Coverage report available in coverage/ directory', 'blue');
      } else {
        this.log('❌ Coverage report generation failed', 'red');
      }
    } catch (error) {
      this.log(`❌ Coverage generation failed: ${error.message}`, 'red');
    }
  }

  async runPerformanceBenchmarks() {
    this.logSection('Performance Benchmarks');
    
    // Performance metrics from test results
    const benchmarks = {
      circuitCalculation: '< 5 seconds',
      proofGeneration: '< 10 seconds', 
      apiResponse: '< 1 second',
      memoryUsage: '< 512MB',
      e2eFlow: '< 60 seconds'
    };

    this.log('📊 Performance Requirements:', 'blue');
    Object.entries(benchmarks).forEach(([metric, requirement]) => {
      this.log(`   ${metric}: ${requirement}`, 'cyan');
    });

    // Extract actual performance data from test outputs
    let actualMetrics = {};
    
    if (this.results.circuit && this.results.circuit.output) {
      const circuitTime = this.extractMetric(this.results.circuit.output, /Circuit calculation.*(\d+)ms/);
      if (circuitTime) actualMetrics.circuitCalculation = `${circuitTime}ms`;
    }

    if (this.results.e2e && this.results.e2e.output) {
      const e2eTime = this.extractMetric(this.results.e2e.output, /Complete.*pipeline.*(\d+)ms/);
      if (e2eTime) actualMetrics.e2eFlow = `${e2eTime}ms`;
    }

    if (Object.keys(actualMetrics).length > 0) {
      this.log('\n📈 Actual Performance:', 'blue');
      Object.entries(actualMetrics).forEach(([metric, value]) => {
        this.log(`   ${metric}: ${value}`, 'green');
      });
    }
  }

  extractMetric(output, regex) {
    const match = output.match(regex);
    return match ? match[1] : null;
  }

  async generateFinalReport() {
    this.logSection('Final Test Report');
    
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - this.startTime) / 1000);
    
    const testSuites = [
      { name: 'Circuit Tests', result: this.results.circuit },
      { name: 'zkProofBuilder Tests', result: this.results.zkProofBuilder },
      { name: 'Enhanced API Tests', result: this.results.apiEnhanced },
      { name: 'E2E Integration Tests', result: this.results.e2e }
    ];

    let passedCount = 0;
    let totalCount = testSuites.length;

    testSuites.forEach(suite => {
      const status = suite.result?.success ? '✅ PASS' : '❌ FAIL';
      const color = suite.result?.success ? 'green' : 'red';
      
      this.log(`${status} ${suite.name}`, color);
      
      if (suite.result?.success) {
        passedCount++;
      } else if (suite.result?.error) {
        this.log(`    Error: ${suite.result.error}`, 'red');
      }
    });

    const overallSuccess = passedCount === totalCount;
    this.results.overall = { success: overallSuccess, passedCount, totalCount };

    this.log('\n' + '─'.repeat(60), 'cyan');
    this.log(`📊 Summary: ${passedCount}/${totalCount} test suites passed`, 
      overallSuccess ? 'green' : 'red');
    this.log(`⏱️  Total duration: ${totalDuration} seconds`, 'blue');
    this.log('─'.repeat(60), 'cyan');

    if (overallSuccess) {
      this.log('\n🎉 All ZK proof tests completed successfully!', 'green');
      this.log('✅ Your ZK advertising pipeline is ready for production', 'green');
    } else {
      this.log('\n⚠️  Some tests failed - please review and fix issues', 'yellow');
    }

    // Save detailed report
    await this.saveDetailedReport(totalDuration);
  }

  async saveDetailedReport(duration) {
    const reportPath = path.join(__dirname, '..', 'test-results.json');
    
    const report = {
      timestamp: new Date().toISOString(),
      duration,
      results: this.results,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`📄 Detailed report saved to: ${reportPath}`, 'blue');
    } catch (error) {
      this.log(`⚠️  Could not save detailed report: ${error.message}`, 'yellow');
    }
  }

  async run() {
    try {
      this.log('🚀 Starting Comprehensive ZK Proof Test Suite', 'bright');
      this.log(`📅 ${new Date().toISOString()}`, 'cyan');

      // Check prerequisites
      const prerequisitesOk = await this.checkPrerequisites();
      
      // Run test phases
      await this.runCircuitTests();
      await this.runZkProofBuilderTests();
      await this.runApiTests();
      await this.runE2ETests();

      // Generate reports
      await this.generateCoverageReport();
      await this.runPerformanceBenchmarks();
      await this.generateFinalReport();

      // Exit with appropriate code
      process.exit(this.results.overall.success ? 0 : 1);

    } catch (error) {
      this.log(`💥 Test runner crashed: ${error.message}`, 'red');
      process.exit(1);
    }
  }
}

// Handle command line execution
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner; 