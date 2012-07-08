var cacheHandler=require('./cachehandler');
var Q = require('q');
function get(url){
    function getuncached(url){
        var deferred = Q.defer();
        require('request').get(url, function(err, result, body){
            if(err) deferred.reject(err);
            else if (result.statusCode !== 200) deferred.reject(result.statusCode);
            else deferred.resolve(JSON.parse(body.toString()));
            //console.log(url);
            //console.log(result.headers);
        });
        return deferred.promise;
    }
    var cachedVersion = null;
    var checkedTimes = 0;
    return cacheHandler.get('web-cache', url).then(function(cache){
        if(!cache){
            //console.log("cache miss");
            return Q.reject("cache miss");
        }
        else if ((Math.round((new Date()).getTime() / 1000) - cache.checkedLast) > Math.min(30*cache.checkedTimes, 60*60)){
            cachedVersion = JSON.parse(cache.data);
            checkedTimes = cache.checkedTimes;
            //console.log("cache out of date by: "+(Math.round((new Date()).getTime() / 1000) - cache.checkedLast) + " vs " + Math.min(60 + 60*cache.checkedTimes, 60*60*2));
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
function getUrl(location){
    return 'https://api.github.com/repos/' + location.user + '/' + location.repo + '/contents/'+ 
        (/\/$/g.test(location.path)?
            location.path.substr(0,location.path.length-1)
            :location.path);
}
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

//ToDo: Wrap this function in a cache method.
function getObject(path) {
    path = path.replace(/(^\/)|(\/$)/g, '');                            //Normalize the path endings

    pathLength = path.split(/\//g).filter(function (v) { return v.length > 0; }).length;

    var format = /^([\w\-\.]+)\/([\w\-\.]+)(?:\/([\w\/\.\-]*))?$/;

    if(pathLength === 1){
        //user
        if(path.replace(/\//g,'') !== path){
            return Q.when({type:'redirect', path:'/'+path.replace(/\//g,'')+'/'});
        } else {
            return getUser(path);
        }
    } else if(format.test(path)) {
        var parsed = format.exec(path);
        var location = {user:parsed[1],repo:parsed[2],path:parsed[3]};
        location.path = location.path || '';
        location.url = getUrl(location);
        if (location.path.length === 0) {
            //repository
            return getFileOrDir(location, getReadme(location));
        } else if (isImage(path)) {
            //image
            return getImage(location);
        } else {
            //directory or file
            return getFileOrDir(location);
        }
    }
    return Q.reject(new Error("Could not find path: " + path));
}

function getUser(name) {
    var repos = get('https://api.github.com/users/'+name+'/repos');
    var user = get('https://api.github.com/users/'+name);
    return Q.all([repos, user]).spread(function(repos, user){
        repos = repos.map(select(['full_name','path'], 'language', 'name', 'private', 'description', 'watchers', 'forks', 'updated_at'))
            .sort(function(rep1,rep2){
                return rep2.watchers - rep1.watchers;
            });
        return {type:'user', user:user, repos:repos};
    });
}

function isImage(location){
    var p = require('path');
    var ext = p.extname(location);
    var images = ['.png', '.jpg', '.jpeg', '.png', '.gif'];
    for(var i = 0; i < images.length; i++) {
        if(images[i] === ext) return true;
    }
    return false;
}
function imageType(location){
    var p = require('path');
    var ext = p.extname(location);
    return ext.substr(1);
}

function getImage(location){
    return get(location.url).then(function(metafile){
        if(Array.isArray(metafile)){
            //directory?
            throw new Error("image turned out to be a directory");
        } else {
            return {
                type:'image',
                path:'/'+location.user+'/'+location.repo+'/'+ location.path,
                name:metafile.path,
                source:metafile._links.html,
                url:'data:image/' + imageType(metafile.path) + ';base64,'+metafile.content
            };
        }
    });
}

function getFileOrDir(location, readmePromise) {
    return get(location.url).then(function(metafile){
        if(Array.isArray(metafile)){
            if(location.path && location.path.length > 0) location.path = (/\/$/g.test(location.path)?location.path:location.path+'/');
            var readmeurl = 'https://api.github.com/repos/' + location.user + '/' + location.repo + '/readme/'+location.path;
            var readme = readmePromise || getReadme(location);
            return readme.then(function(readme){
                return {
                    type:'dir',
                    files: metafile.filter(checkType('file')).map(getSimplified(location)),
                    directories: metafile.filter(checkType('dir')).map(getSimplified(location)),
                    location:location,
                    readme:readme
                };
            });
        } else {
            var content = new Buffer(metafile.content, metafile.encoding).toString();
            return {
                type:'file',
                path:'/'+location.user+'/'+location.repo+'/'+
                location.path,
                name:metafile.path,
                source:metafile._links.html,
                content:content
            };
        }
    });
}

function getReadme(location) {
    var readmeurl = 'https://api.github.com/repos/' + location.user + '/' + location.repo + '/readme/'+location.path;
    return get(readmeurl).then(function(readmemetafile){
        console.log(readmemetafile.path);
        return {
            exists:true, 
            type: 'file',
            path: '/'+location.user+'/'+location.repo+'/'+readmemetafile.path,
            name: readmemetafile.path,
            source:readmemetafile._links.html,
            extension:/\.(\w*)$/g.exec(readmemetafile.path)[0], 
            content:new Buffer(readmemetafile.content, readmemetafile.encoding).toString()
        };
    }, function(err){
        if(err !== 404 && err !== 500) return Q.reject(err);
        else return {exists:false};
    });
}

module.exports.getObject = getObject;
module.exports.handlesHome = false;