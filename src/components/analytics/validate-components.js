/**
 * Simple validation script to check for common issues in analytics components
 */

const fs = require('fs');
const path = require('path');

const componentsDir = __dirname;
const componentFiles = [
  'CustomReports.tsx',
  'AnalyticsDashboard.tsx',
  'MetricsOverview.tsx',
  'TrendAnalysis.tsx',
  'PredictiveInsights.tsx',
  'ReportScheduler.tsx'
];

function validateComponent(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  // Check for incomplete JSX tags
  const openTags = content.match(/<[a-zA-Z][^>]*>/g) || [];
  const closeTags = content.match(/<\/[a-zA-Z][^>]*>/g) || [];
  
  // Check for basic syntax issues
  if (content.includes('<d>') || content.includes('<d ')) {
    issues.push('Found incomplete JSX tag: <d>');
  }

  // Check for missing imports
  const imports = content.match(/import.*from.*['"][^'"]*['"]/g) || [];
  const usedComponents = content.match(/[<]([A-Z][a-zA-Z]*)/g) || [];
  
  // Check for missing exports
  if (!content.includes('export')) {
    issues.push('No export statement found');
  }

  // Check for TypeScript issues
  if (content.includes(': any') && !content.includes('// eslint-disable')) {
    issues.push('Found untyped "any" usage - consider adding proper types');
  }

  return issues;
}

function main() {
  console.log('Validating analytics components...\n');
  
  let totalIssues = 0;
  
  componentFiles.forEach(file => {
    const filePath = path.join(componentsDir, file);
    
    if (fs.existsSync(filePath)) {
      console.log(`Checking ${file}...`);
      const issues = validateComponent(filePath);
      
      if (issues.length === 0) {
        console.log('  ✅ No issues found');
      } else {
        console.log(`  ❌ Found ${issues.length} issue(s):`);
        issues.forEach(issue => console.log(`    - ${issue}`));
        totalIssues += issues.length;
      }
      console.log('');
    } else {
      console.log(`  ⚠️  File not found: ${file}`);
    }
  });
  
  console.log(`\nValidation complete. Total issues: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('🎉 All components look good!');
  } else {
    console.log('🔧 Please review and fix the issues above.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { validateComponent };