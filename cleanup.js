/**
 * Cverso Cleanup Utility
 * Removes only truly unnecessary legacy files/folders.
 * Safe to run — will NOT delete essential app code.
 */
const fs = require('fs');
const path = require('path');

// Only target files that are genuinely unused leftovers
const targets = [
  'Aakashrepo',       // Empty legacy folder
  'codeforce',        // Unrelated folder
  'fix_images.bat',   // One-time batch script, no longer needed
  'public/cverso-logo.svg'  // Duplicate/unused logo variant
];

console.log('🗑️  Cverso Cleanup — removing legacy files...\n');

let deletedCount = 0;

targets.forEach(target => {
  const fullPath = path.join(__dirname, target);

  if (fs.existsSync(fullPath)) {
    const stat = fs.statSync(fullPath);
    try {
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  ✅ Deleted directory: ${target}`);
      } else {
        fs.unlinkSync(fullPath);
        console.log(`  ✅ Deleted file: ${target}`);
      }
      deletedCount++;
    } catch (err) {
      console.error(`  ❌ Failed to delete ${target}: ${err.message}`);
    }
  } else {
    console.log(`  ⚠️  Skipped (not found): ${target}`);
  }
});

console.log(`\n✨ Cleanup complete! Removed ${deletedCount} item(s).`);
console.log('   Essential files (explore.html, explore.js, explore.css) are preserved.');
