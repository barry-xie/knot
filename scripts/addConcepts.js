/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

function normalizeClassNames(input) {
  if (!Array.isArray(input)) return [];

  const normalized = input
    .map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object' && typeof item.className === 'string') {
        return item.className.trim();
      }
      return '';
    })
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

function extractClassNamesFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.classes)) return normalizeClassNames(payload.classes);
  if (Array.isArray(payload.classNames)) return normalizeClassNames(payload.classNames);
  return [];
}

function buildClassesWithConcepts(classNames) {
  return classNames.map((className, index) => {
    const start = index * 6 + 1;
    return {
      className,
      concepts: Array.from({ length: 6 }, (_, offset) => `Concept ${start + offset}`),
    };
  });
}

async function run(options = {}) {
  const outputPath = options.outputPath || 'public/classNames.json';
  const writeFile = options.writeFile !== false;

  let classNames = normalizeClassNames(options.classNames);

  if (classNames.length === 0) {
    const existing = fs.existsSync(outputPath)
      ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
      : {};
    classNames = extractClassNamesFromPayload(existing);
  }

  const result = {
    classes: buildClassesWithConcepts(classNames),
    classNames,
  };

  if (writeFile) {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  }

  return result;
}

module.exports = {
  run,
  buildClassesWithConcepts,
  extractClassNamesFromPayload,
  normalizeClassNames,
};

if (require.main === module) {
  run().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
