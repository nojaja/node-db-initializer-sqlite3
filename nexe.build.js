const nexe = require('nexe');

nexe.compile({
    input: './dist/index.bundle.js',
    output: './dist/bin/db-initializer-sqlite3',
    target: 'windows-x86-16.20.2',
    nodeTempDir: __dirname,
    resources: ["./assets/**/*","./dist/*.wasm"],
    build: true // �m�[�h�������Ńr���h���邽�߂̃t���O��ǉ�
}, function (err) {
    if (err) console.log(err);
});