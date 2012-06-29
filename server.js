/**
 * # Server.js
 *
 * Server.js is the entry point of the application, it loads all the necessary modules.
 */

/*!
  */
//Reserved prefixes:
//  api
//  admin
//  login
//  signup
//  settings
//  account
var express   = require('express');
var app 	  = express.createServer();
var getObject = require('./git-api').getObject;
var proxy 	  = require('./git-proxy');


require('./configure-views')(app);
require('./configure-style')(app);
app.use(express.static(__dirname + '/static'));
require('./configure-settings')(app);

app.get('/', function(req, res){
  res.render('home');
});

app.get('/favicon.ico', function(req,res,next){
	res.send(404);
});

app.get('/api/cache', function(req,res){
	res.send(cacheHandler.debug);
});

app.get('/api/cache/clean', function(req,res){
	cacheHandler.clean();
	res.send('Cache Cleaned', 200);
});

app.use(app.router);

app.use(function(req,res, next){
	var path = require('url').parse(req.url).pathname;
	getObject(path).then(function(obj){
		return proxy.run(obj, req, res, next);
	}).fail(function(err){
		if(err === 404) next();
		else next(err);
	}).end();
});

app.listen(3000);