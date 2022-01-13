const nexe = require('nexe');

nexe.compile({
    input: './index.bundle.js',
    output: './dist/sample',
    target: 'windows-x86-14.15.3',
    nodeTempDir: __dirname,
    resources: ["./assets/**/*","./sql-wasm.wasm"]
}, function (err) {
    if (err) console.log(err);
});