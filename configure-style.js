var lessMiddleware = require('less-middleware');

module.exports = function (app) {
    app.use('/css', lessMiddleware({
        src: __dirname + '/style/source',
        dest: __dirname + '/style/output',
        force: true,
        debug: true
        //compress: false,
    }));
    app.use('/css', require('express').static(__dirname + '/style/output'));
    app.use('/img/', require('express').static(__dirname + '/style/images'));
};