//Reserved prefixes:
//  api
//  admin
//  login
//  signup
//  settings
//  account

var app = require('express').createServer();
//var get = require('request').get;
var cons = require('consolidate');
var cacheHandler=require('./cachehandler');
var Q = require('q');
function get(url){
	function getuncached(url){
		var deferred = Q.defer();
		require('request').get(url, function(err, result, body){
			if(err) deferred.reject(err);
			else if (result.statusCode !== 200) deferred.reject(result.statusCode);
			else deferred.resolve(JSON.parse(body.toString()));
			console.log(url);
			console.log(result.headers);
		});
		return deferred.promise;
	}
	var cachedVersion = null;
	var checkedTimes = 0;
	return cacheHandler.get('web-cache', url).then(function(cache){
		if(!cache){
			console.log("cache miss");
			return Q.reject("cache miss");
		}
		else if ((Math.round((new Date()).getTime() / 1000) - cache.checkedLast) > Math.min(60 + 60*cache.checkedTimes, 60*60*2)){
			cachedVersion = JSON.parse(cache.data);
			checkedTimes = cache.checkedTimes;
			console.log("cache out of date by: "+(Math.round((new Date()).getTime() / 1000) - cache.checkedLast) + " vs " + Math.min(60 + 60*cache.checkedTimes, 60*60*2));
			return Q.reject("cache out of date");
		}else{
			//console.log("cache hit");
			return JSON.parse(cache.data);
		}
	}).fail(function(err){
		return getuncached(url).then(function(uncached){
			var obj = {data:JSON.stringify(uncached)};
			if(!require('deep-equal')(uncached,cachedVersion)){
				obj.checkedTimes = 0;
			} else {
				obj.checkedTimes  = checkedTimes + 1;
			}
			obj.checkedLast = Math.round((new Date()).getTime() / 1000);
			return cacheHandler.set('web-cache', url, obj).then(function(){return uncached;});
		});
	})
}
//Set view defaults
app.set('view options', {
  open: '{{',
  close: '}}'
});
app.engine('html', (function(){
	var engine = require('qejs');
	var cache = {};
	var fs = require('fs');
	function read(path, options, fn) {
	  var str = cache[path];

	  // cached
	  if (options.cache && str) return fn(null, str);
	  options.open = '{{';
	  options.close = '}}';

	  // read
	  fs.readFile(path, 'utf8', function(err, str){
	    if (err) return fn(err);
	    if (options.cache) cache[path] = str;
	    fn(null, str);
	  });
	}

	return function(path, options, fn){
	  read(path, options, function(err, str){
	    if (err) return fn(err);
	    try {
	      options.filename = path;
	      var tmpl = engine.compile(str, options);
	      options.contents = tmpl(options);
	      read("./views/layout.html", options, function(err, str){
	      	var tmpl = engine.compile(str, options);
			tmpl(options).then(function(result){
				fn(null, result);
			},function(err){
				fn(err);
			}).end();
	      });
	    } catch (err) {
	      fn(err);
	    }
	  });
	};
}()));
app.set('view engine', 'html');
//app.register('.html', require('ejs'));

app.use(require('express').static(__dirname + '/static'));

function checkType(type){
	return function(metadata){
		return type === metadata.type;
	};
}
function getSimplified(location){
	return function(metadata){
		return {path:'/'+location.user+'/'+location.repo+'/'+
			location.path+metadata.path,
			name:metadata.path};
	}
}
function select(){
	var fields = arguments;
	return function(item){
		var output = {};
		for (var i = 0; i < fields.length; i++) {
			if(typeof fields[i] === 'string'){
				output[fields[i]] = item[fields[i]]
			}else{
				output[fields[i][1]] = item[fields[i][0]]
			}
		}
		return output;
	};
}

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
})

app.use(app.router);
app.use(function(req,res, next){
	var path = require('url').parse(req.url).pathname;
	var shortFormat = /^\/([\w\-\.]*)\/([\w\-\.]*)$/g;
	if(shortFormat.test(path)){
		path += "/";
	}
	var format = /^\/([\w\-\.]*)\/([\w\-\.]*)\/([\w\/\.\-]*)$/;
	if(!format.test(path)){
		console.log('SKIP: '+path);
		return next();
	}
	var parsed = format.exec(path);
	var location = {user:parsed[1],repo:parsed[2],path:parsed[3]};
	var url = 'https://api.github.com/repos/' + location.user + '/' + location.repo + '/contents/'+ (/\/$/g.test(location.path)?location.path.substr(0,location.path.length-1):location.path);
	get(url).then(function(metafile){
		if(Array.isArray(metafile)){
			if(location.path.length > 0) location.path = (/\/$/g.test(location.path)?location.path:location.path+'/');
			var readmeurl = 'https://api.github.com/repos/' + location.user + '/' + location.repo + '/readme/'+location.path;
			var readme = get(readmeurl).then(function(readmemetafile){
				return {
					exists:true, 
					extension:/.(\w*)$/g.exec(readmemetafile.path)[0], 
					content:new Buffer(readmemetafile.content, readmemetafile.encoding).toString()
				};
			}, function(err){
				if(err !== 404 && err !== 500) return Q.reject(err);
				else return {exists:false};
			});
			return readme.then(function(readme){
				proxy.directory({
					type:'dir',
					files: metafile.filter(checkType('file')).map(getSimplified(location)),
					directories: metafile.filter(checkType('dir')).map(getSimplified(location)),
					location:location,
					readme:readme
				},req,res,next);
			});
		} else {
			if(/\.png$/g.test(metafile.path)){
				proxy.image({
					type:'image',
					path:'/'+location.user+'/'+location.repo+'/'+
					location.path,
					name:metafile.path,
					source:metafile._links.html,
					url:'data:image/png;base64,'+metafile.content
				},req,res,next);
			} else {
			var content = new Buffer(metafile.content, metafile.encoding).toString();
				proxy.file({
					type:'file',
					path:'/'+location.user+'/'+location.repo+'/'+
					location.path,
					name:metafile.path,
					source:metafile._links.html,
					content:content
				},req,res,next);
			}
		}
	}).fail(function(err){
		if(err === 404) next();
		else next(err);
	}).end();
});

app.get('/:user', function(req,res,next){
	var repos = get('https://api.github.com/users/'+req.params.user+'/repos');
	var user = get('https://api.github.com/users/'+req.params.user);
	Q.all([repos, user]).spread(function(repos, user){
		repos = repos.map(select(['full_name','path'], 'language', 'name', 'private', 'description', 'watchers', 'forks', 'updated_at'))
			.sort(function(rep1,rep2){
				return rep2.watchers - rep1.watchers;
			});
		proxy.user({type:'user', user:user, repos:repos}, req, res, next);
	}).fail(function(err){
		if(err===404) next();
		else next(err);
	}).end();
});

app.listen(3000);

var proxy = {};
var marked = require('marked');
// Set default options
marked.setOptions({
  gfm: true,
  pedantic: false,
  sanitize: true,
  // callback for code highlighter
  highlight: require('./highlighter')
});

proxy.directory = function(data, req, res, next){
	data.breadcrumb = breadcrumb(req);
	if(data.readme.exists){
		data.readme.content = marked(data.readme.content);
	}
	res.render('directory', data);
};
proxy.file = function(data, req, res, next){
	data.breadcrumb = breadcrumb(req);
	res.render('file', require('./filehandler').formatContent(data));
};
proxy.user = function(data, req, res, next){
	data.breadcrumb = breadcrumb(req);
	res.render('userProfile', data);
};
proxy.image = function(data, req, res, next){
	data.breadcrumb = breadcrumb(req);
	res.render('image', data);
};

function breadcrumb(req){
	var path = require('url').parse(req.url).pathname.split(/\//g).filter(function(s){return s.length > 0;});

	var buffer = ['<ul class="breadcrumb">'];
	var pathSoFar = '/';
	path.forEach(function(part, i){
		pathSoFar += part + '/';
		if(i !== path.length -1) buffer.push('<li><a href="', pathSoFar, '">',part,'</a> <span class="divider">/</span></li>');
		else buffer.push('<li class="active">',part,'</a></li>');
	});
	buffer.push('</ul>');
	return buffer.join('\n');
}