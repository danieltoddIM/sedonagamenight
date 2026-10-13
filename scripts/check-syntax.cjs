/* This checks parsing/transpilation only. Run npm run typecheck for type checking. */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let count = 0;
const errors = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
    if (['node_modules','.next','.git'].includes(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.tsx?$/.test(entry.name) && !/\.d\.ts$/.test(entry.name)) {
      count++;
      const result = ts.transpileModule(fs.readFileSync(file,'utf8'), {
        fileName:file, reportDiagnostics:true,
        compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}
      });
      for (const diagnostic of result.diagnostics || []) {
        if (diagnostic.category === ts.DiagnosticCategory.Error)
          errors.push(`${path.relative(root,file)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
      }
    }
  }
}
walk(root);
if (errors.length) { console.error(errors.join('\n')); process.exitCode=1; }
else console.log(`Syntax/transpilation passed for ${count} TypeScript modules.`);
