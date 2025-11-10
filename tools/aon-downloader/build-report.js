/*
    build-report.js builds the report metadata.json of the data in creatures.json
    Data extracted:
    - Total number of creatures
    - Traits
    - Rarities
    - Sizes
    - Sources
    - Sources normalized (e.g. "Bestiary 2 pg. 172 <sup>2.0</sup>" -> "Bestiary 2")
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Normalize a source string by removing trailing page references and HTML tags.
// Examples:
//  - "Bestiary 2 pg. 172 <sup>2.0</sup>" -> "Bestiary 2"
//  - "Bestiary 2 p 172" -> "Bestiary 2"
//  - "Adventure Path #123: Title (pp. 12–13)" -> "Adventure Path #123: Title"
function normalizeSource(src) {
    if (typeof src !== 'string') return '';
    // Remove HTML tags (e.g., <sup>2.0</sup>)
    let s = src.replace(/<[^>]*>/g, '').trim();
    // Collapse whitespace
    s = s.replace(/\s+/g, ' ');

    // If multiple sources are listed, keep only the first segment (commonly separated by commas)
    if (s.includes(',')) {
        s = s.split(',')[0].trim();
    }

    // Remove trailing page references like: pg. 172, p. 12, pp 12-13, page 7, pages 10–12
    // Also consume an optional trailing edition marker like "2.0" that may appear after the page number
    const pageTail = /\s*(?:[,;]|—|–|-)?\s*(?:p|pg|pp|page|pages)\.?\s*\d+(?:\s*[-–]\s*\d+)?(?:\s+\d+(?:\.\d+)?)?\s*$/i;
    const withoutTail = s.replace(pageTail, '');
    if (withoutTail !== s) {
        s = withoutTail.trim();
    } else {
        // Also handle when the page reference is wrapped in trailing parentheses, e.g., "(pg. 172)"
        s = s.replace(/\s*\((?:p|pg|pp|page|pages)\.?\s*\d+(?:\s*[-–]\s*\d+)?(?:\s+\d+(?:\.\d+)?)?\)\s*$/i, '').trim();
    }

    return s.trim();
}

export function buildReport(inputPath, outputPath) {
    const jsonPath = path.resolve(inputPath);
    const creatures = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    const traits = new Set();
    const rarities = new Set();
    const sizes = new Set();
    const sources = new Set();
    const sources_normalized = new Set();

    for (const c of creatures) {
        if (c.trait) {
            c.trait.split(',').forEach(t => traits.add(t.trim()));
        }
        if (c.rarity) rarities.add(c.rarity.trim());
        if (c.size) sizes.add(c.size.trim());
        if (c.source) {
            // Normalize source to remove trailing page refs and HTML
            const normalized = normalizeSource(c.source);
            sources_normalized.add(normalized);
            sources.add(c.source.trim());
        }
    }

    const metadata = {
        total: creatures.length,
        traits: [...traits].sort(),
        rarities: [...rarities].sort(),
        sizes: [...sizes].sort(),
        sources: [...sources].sort(),
        sources_normalized: [...sources_normalized].sort()
    };

    const outFile = outputPath ? path.resolve(outputPath) : path.join(path.dirname(jsonPath), 'metadata.json');
    fs.mkdirSync(path.dirname(outFile), { recursive: true });
    fs.writeFileSync(outFile, JSON.stringify(metadata, null, 0), 'utf8');

    return outFile;
}

// Allow running as a standalone script: node build-report.js [inputJson] [outputMetadata]
const isDirect = (() => {
    try {
        const thisFile = fileURLToPath(import.meta.url);
        return process.argv[1] && path.resolve(process.argv[1]) === thisFile;
    } catch {
        return false;
    }
})();

if (isDirect) {
    const input = process.argv[2] || path.resolve('output', 'creatures.json');
    const output = process.argv[3] || path.resolve('output', 'metadata.json');
    buildReport(input, output);
}
