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
            // Many sources include the page reference, resulting in lot of duplicates. Normalize by truncating at " pg."
            const normalized = c.source.split(' pg.')[0].trim();
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
