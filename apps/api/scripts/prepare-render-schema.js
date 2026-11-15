const fs = require('node:fs');
const path = require('node:path');

const sourcePath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const renderPath = path.join(__dirname, '..', 'prisma', 'schema.render.prisma');
const source = fs.readFileSync(sourcePath, 'utf8');
const sqliteProvider = 'provider = "sqlite"';
const occurrences = source.split(sqliteProvider).length - 1;

if (occurrences !== 1) {
  throw new Error(`Expected one SQLite datasource provider, found ${occurrences}.`);
}

fs.writeFileSync(renderPath, source.replace(sqliteProvider, 'provider = "postgresql"'));
