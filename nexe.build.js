const nexe = require('nexe');

nexe.compile({
    input: './dist/index.bundle.js',
    output: './dist/sample',
    target: 'windows-x86-14.15.3',
    nodeTempDir: __dirname,
    resources: ["./assets/**/*","./dist/sql-wasm.wasm"]
}, function (err) {
    if (err) console.log(err);
});