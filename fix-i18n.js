const fs = require('fs');
const content = fs.readFileSync('src/i18n.ts', 'utf8');

// Find the start boundary
const startTarget = "budgetType: 'Tipo de Orçamento',";
const startIndex = content.indexOf(startTarget);

// Find the end boundary
const endTarget = "welcome: 'VyntaJobs में आपका स्वागत है'";
const endIndex = content.indexOf(endTarget);

if (startIndex !== -1 && endIndex !== -1) {
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  const middle = "budgetType: 'Tipo de Orçamento',\n          }\n        }\n      },\n      hi: {\n        translation: {\n          common: {\n            brandName: 'VyntaJobs',\n            search: 'नौकरियां खोजें...',\n            ";
  
  fs.writeFileSync('src/i18n.ts', before + middle + after, 'utf8');
  console.log('Successfully repaired /src/i18n.ts!');
} else {
  console.error('Failed to locate repair boundaries:', { startIndex, endIndex });
}
