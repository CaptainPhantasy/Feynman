#!/usr/bin/env node

// verify.js - Run this to check implementation completeness
import fs from 'fs';
import path from 'path';

const requiredFiles = [
  // Core App Files
  { path: 'src/App.jsx', minSize: 1000 },
  { path: 'src/main.jsx', minSize: 100 },
  { path: 'index.html', minSize: 200 },
  { path: 'package.json', minSize: 400 },
  { path: 'vite.config.js', minSize: 100 },

  // Components
  { path: 'src/components/TeachingPane/TeachingPane.jsx', minSize: 2000 },
  { path: 'src/components/PracticeSheetPane/PracticeSheetPane.jsx', minSize: 2000 },
  { path: 'src/components/FieldComponent/FieldComponent.jsx', minSize: 1000 },
  { path: 'src/components/DemoPlayer/DemoPlayer.jsx', minSize: 2000 },
  { path: 'src/components/ProgressTracking/ProgressTracking.jsx', minSize: 500 },

  // Services
  { path: 'src/services/claudeService.js', minSize: 3000 },

  // Utils
  { path: 'src/utils/conceptAnalyzer.js', minSize: 1500 },
  { path: 'src/utils/contextManager.js', minSize: 2000 },
  { path: 'src/utils/continuationCode.js', minSize: 1000 },
  { path: 'src/utils/emotionalIntelligence.js', minSize: 1500 },
  { path: 'src/utils/pdfExport.js', minSize: 1500 },
  { path: 'src/utils/stateManager.js', minSize: 1500 },

  // Shared Resources
  { path: 'shared/architecture.json', minSize: 200 },
  { path: 'shared/field_validation_rules.json', minSize: 200 },
  { path: 'shared/demo_script.json', minSize: 1000 },

  // Styles
  { path: 'src/styles/App.css', minSize: 500 },
  { path: 'src/styles/index.css', minSize: 300 },

  // Config
  { path: '.env.example', minSize: 200 },
];

console.log('🔍 Feynman Learning System - Implementation Verification\n');

let complete = 0;
let incomplete = 0;
let missing = 0;
let warnings = [];

requiredFiles.forEach(({ path: filePath, minSize }) => {
  if (fs.existsSync(filePath)) {
    const size = fs.statSync(filePath).size;
    if (size >= minSize) {
      console.log(`✅ ${filePath} (${size} bytes)`);
      complete++;
    } else {
      console.log(`⚠️  ${filePath} (${size} bytes - expected at least ${minSize} bytes)`);
      incomplete++;
      warnings.push(`${filePath} may be incomplete (${size}/${minSize} bytes)`);
    }
  } else {
    console.log(`❌ ${filePath} (missing)`);
    missing++;
  }
});

console.log(`\n📊 Status: ${complete}/${requiredFiles.length} files complete`);

if (incomplete > 0) {
  console.log(`⚠️  ${incomplete} files may be incomplete`);
}

if (missing > 0) {
  console.log(`❌ ${missing} files missing`);
}

// Check for node_modules
console.log('\n📦 Dependencies:');
if (fs.existsSync('node_modules')) {
  console.log('✅ node_modules installed');
} else {
  console.log('❌ node_modules missing - run "npm install"');
  warnings.push('Dependencies not installed');
}

// Check for .env
console.log('\n🔑 Environment:');
if (fs.existsSync('.env')) {
  const envContent = fs.readFileSync('.env', 'utf8');
  if (envContent.includes('your_api_key_here')) {
    console.log('⚠️  .env exists but needs API key configuration');
    warnings.push('API key not configured in .env');
  } else {
    console.log('✅ .env configured');
  }
} else {
  console.log('⚠️  .env missing - copy from .env.example and add your API key');
  warnings.push('.env file not created');
}

// Summary
console.log('\n' + '='.repeat(60));

if (missing === 0 && incomplete === 0 && warnings.length === 0) {
  console.log('🎉 READY TO LAUNCH!');
  console.log('\nQuick start:');
  console.log('  1. Configure your API key in .env');
  console.log('  2. Run: npm run dev');
  console.log('  3. Visit: http://localhost:5173');
  console.log('\nThe compound interest demo will auto-play on first visit!');
} else if (missing === 0 && incomplete === 0) {
  console.log('✅ Core implementation complete!');
  console.log('\n⚠️  Setup needed:');
  warnings.forEach(w => console.log(`  - ${w}`));
} else {
  console.log('🚧 Implementation in progress...');
  if (missing > 0) {
    console.log(`\n❌ ${missing} critical files missing`);
  }
  if (incomplete > 0) {
    console.log(`\n⚠️  ${incomplete} files may need completion`);
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  Additional issues:');
    warnings.forEach(w => console.log(`  - ${w}`));
  }
}

console.log('='.repeat(60));

// Exit with appropriate code
process.exit(missing === 0 && incomplete === 0 ? 0 : 1);
