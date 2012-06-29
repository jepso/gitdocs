module.exports = function (app) {
    var express = require('express');
    app.use(express.cookieParser());
    app.use(express.session({secret:'bajdfklajflksajflka'}));
    app.use(express.bodyParser())

    app.use(function (req, res, next) {
        req.userSettings = req.session;
        next();
    });

    app.get('/api/settings', function (req, res) {
        res.json(req.userSettings);
    });

    app.post('/api/settings/:key', function (req, res) {
        var key = req.params.key;
        if(key === 'cookie') res.send(403);
        req.userSettings[key] = req.body;
        res.json(req.body);
    });
};