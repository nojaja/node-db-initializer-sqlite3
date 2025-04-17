const nexe = require('nexe');

nexe.compile({
    input: './dist/index.bundle.js',
    output: './dist/bin/db-initializer-sqlite3',
    target: 'windows-x86-16.20.2',
    nodeTempDir: __dirname,
    resources: ["./assets/**/*","./dist/*.wasm"],
    build: true // ノードを自分でビルドするためのフラグを追加
}, function (err) {
    if (err) console.log(err);
});