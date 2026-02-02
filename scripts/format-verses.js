#!/usr/bin/env node
/**
 * Format Sutra Verses Script
 *
 * Splits verse lines that are combined with "　　" (two full-width spaces)
 * into separate paragraphs.
 *
 * Usage: node scripts/format-verses.js [sutra-file.json]
 *        node scripts/format-verses.js --all
 */

const fs = require('fs');
const path = require('path');

const SUTRAS_DIR = path.join(__dirname, '..', 'sutras');

// Pattern: two full-width spaces (used to separate verse lines)
const VERSE_SEPARATOR = '　　';

/**
 * Check if a paragraph looks like verses (contains verse separators)
 */
function isVerseParagraph(text) {
  return text.includes(VERSE_SEPARATOR);
}

/**
 * Split a verse paragraph into individual lines
 * Each verse phrase (ending with ， or 。) becomes its own line
 */
function splitVerses(text) {
  // Remove leading quote mark if present
  let prefix = '';
  let content = text;

  if (text.startsWith('「')) {
    prefix = '「';
    content = text.slice(1);
  }

  // Remove trailing quote mark if present
  let suffix = '';
  if (content.endsWith('」')) {
    suffix = '」';
    content = content.slice(0, -1);
  }

  // First split by the full-width space separator
  const roughLines = content.split(VERSE_SEPARATOR)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  // Then split each line further by Chinese punctuation (，。)
  // Each phrase ending with ， or 。 becomes its own line
  const lines = [];
  roughLines.forEach(line => {
    // Split by keeping the delimiter attached to the preceding text
    // Match sequences ending with ， or 。
    const phrases = line.match(/[^，。]+[，。]/g);
    if (phrases && phrases.length > 1) {
      phrases.forEach(phrase => {
        const trimmed = phrase.trim();
        if (trimmed) lines.push(trimmed);
      });
    } else {
      // If no split possible, keep the line as is
      if (line.trim()) lines.push(line.trim());
    }
  });

  // Add back the quote marks to first and last lines
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

  // Process each chapter
  sutra.chapters.forEach((chapter, chapterIndex) => {
    const newParagraphs = [];

    chapter.paragraphs.forEach((para, paraIndex) => {
      // Handle both string paragraphs and object paragraphs (like mantras)
      if (typeof para === 'string') {
        if (isVerseParagraph(para)) {
          const verses = splitVerses(para);
          console.log(`  Chapter ${chapterIndex + 1}, Para ${paraIndex + 1}: Split into ${verses.length} lines`);
          newParagraphs.push(...verses);
          modified = true;
        } else {
          newParagraphs.push(para);
        }
      } else {
        // Keep object paragraphs (mantras, etc.) as-is
        newParagraphs.push(para);
      }
    });

    chapter.paragraphs = newParagraphs;
  });

  if (modified) {
    // Write back with proper formatting
    const output = JSON.stringify(sutra, null, 2);
    fs.writeFileSync(filePath, output, 'utf-8');
    console.log(`  ✓ Updated: ${filePath}`);
  } else {
    console.log(`  - No verses to split in: ${filePath}`);
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
    console.log('  node scripts/format-verses.js <sutra-file.json>  - Process single file');
    console.log('  node scripts/format-verses.js --all              - Process all sutras');
    console.log('  node scripts/format-verses.js --dry-run          - Show what would be changed');
    process.exit(1);
  }

  if (args[0] === '--all') {
    // Process all JSON files in sutras directory
    const files = fs.readdirSync(SUTRAS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(SUTRAS_DIR, f));

    let count = 0;
    files.forEach(file => {
      if (processSutra(file)) count++;
    });

    console.log(`\nDone! Modified ${count} file(s).`);
  } else if (args[0] === '--dry-run') {
    // Show what would be changed without modifying
    const files = fs.readdirSync(SUTRAS_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => path.join(SUTRAS_DIR, f));

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const sutra = JSON.parse(content);

      console.log(`\n${path.basename(file)}:`);
      sutra.chapters.forEach((chapter, ci) => {
        chapter.paragraphs.forEach((para, pi) => {
          if (typeof para === 'string' && isVerseParagraph(para)) {
            const verses = splitVerses(para);
            console.log(`  Chapter ${ci + 1}, Para ${pi + 1}: Would split into ${verses.length} lines`);
            verses.slice(0, 4).forEach((v, i) => console.log(`    ${i + 1}. ${v.slice(0, 40)}...`));
            if (verses.length > 4) console.log(`    ... and ${verses.length - 4} more`);
          }
        });
      });
    });
  } else {
    // Process single file
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
