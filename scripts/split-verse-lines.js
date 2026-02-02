#!/usr/bin/env node
/**
 * Split Verse Lines Script
 *
 * Further splits verse lines that contain multiple phrases
 * (e.g., "恒河沙劫说难尽，见闻瞻礼一念间，" becomes two lines)
 *
 * Usage: node scripts/split-verse-lines.js [sutra-file.json]
 *        node scripts/split-verse-lines.js --all
 */

const fs = require('fs');
const path = require('path');

const SUTRAS_DIR = path.join(__dirname, '..', 'sutras');

/**
 * Check if a line looks like a verse (short line with Chinese punctuation)
 * Verses typically have phrases of 5-7 characters ending with ， or 。
 */
function isVerseLine(text) {
  // Must be relatively short (verses are usually under 50 chars per combined line)
  if (text.length > 60 || text.length < 10) return false;

  // Must contain at least one Chinese punctuation
  if (!text.includes('，') && !text.includes('。') && !text.includes('？') && !text.includes('！')) return false;

  // Count punctuation - verses have regular pattern
  const punctCount = (text.match(/[，。？！]/g) || []).length;

  // Should have at least 2 punctuation marks to be worth splitting
  if (punctCount < 2) return false;

  // Check if it looks like verse pattern (mostly Chinese chars with punctuation)
  const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
  const ratio = chineseChars.length / text.length;

  return ratio > 0.8;
}

/**
 * Split a verse line into individual phrases
 */
function splitVerseLine(text) {
  // Handle quote marks
  let prefix = '';
  let content = text;
  let suffix = '';

  if (text.startsWith('「')) {
    prefix = '「';
    content = text.slice(1);
  }
  if (content.endsWith('」')) {
    suffix = '」';
    content = content.slice(0, -1);
  }

  // Split by Chinese punctuation (，。？！), keeping the punctuation attached
  const phrases = content.match(/[^，。？！]+[，。？！]/g);

  if (!phrases || phrases.length <= 1) {
    return [text]; // Can't split, return original
  }

  const lines = phrases.map(p => p.trim()).filter(p => p.length > 0);

  // Add back quote marks
  if (lines.length > 0) {
    lines[0] = prefix + lines[0];
    lines[lines.length - 1] = lines[lines.length - 1] + suffix;
  }

  return lines;
}

/**
 * Process a sutra JSON file
 */
function processSutra(filePath) {
  console.log(`Processing: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const sutra = JSON.parse(content);

  let modified = false;
  let totalSplits = 0;

  // Process each chapter
  sutra.chapters.forEach((chapter, chapterIndex) => {
    const newParagraphs = [];

    chapter.paragraphs.forEach((para, paraIndex) => {
      if (typeof para === 'string') {
        if (isVerseLine(para)) {
          const verses = splitVerseLine(para);
          if (verses.length > 1) {
            console.log(`  Chapter ${chapterIndex + 1}, Para ${paraIndex + 1}: Split into ${verses.length} lines`);
            newParagraphs.push(...verses);
            modified = true;
            totalSplits += verses.length - 1;
          } else {
            newParagraphs.push(para);
          }
        } else {
          newParagraphs.push(para);
        }
      } else {
        newParagraphs.push(para);
      }
    });

    chapter.paragraphs = newParagraphs;
  });

  if (modified) {
    const output = JSON.stringify(sutra, null, 2);
    fs.writeFileSync(filePath, output, 'utf-8');
    console.log(`  ✓ Updated: ${filePath} (${totalSplits} new lines)`);
  } else {
    console.log(`  - No changes needed: ${filePath}`);
  }

  return modified;
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  node scripts/split-verse-lines.js <sutra-file.json>  - Process single file');
    console.log('  node scripts/split-verse-lines.js --all              - Process all sutras');
    process.exit(1);
  }

  if (args[0] === '--all') {
    const files = fs.readdirSync(SUTRAS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(SUTRAS_DIR, f));

    let count = 0;
    files.forEach(file => {
      if (processSutra(file)) count++;
    });

    console.log(`\nDone! Modified ${count} file(s).`);
  } else {
    const filePath = args[0].startsWith('/')
      ? args[0]
      : path.join(SUTRAS_DIR, args[0]);

    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    processSutra(filePath);
  }
}

main();
