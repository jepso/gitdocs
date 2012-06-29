var Q = require('q');

function getObject(path) {
    path = path.replace(/(^\/root\/)|(^\/)|(\/$)/g, '')
        .replace(/(^\/root\/)|(^\/)|(\/$)/g, '')
        .replace(/(^\/root\/)|(^\/)|(\/$)/g, '');    //Normalize the path endings

    var stat = require('fs').statSync('./'+path);

    if (stat.isFile()) {
        return Q.when(getFile(path));
    }
    if (stat.isDirectory()) {
        return getDirectory(path, Q.when({exists:false}));
    }
    //directory or file
    return Q.reject(404);  
}

function getFile(path) {
    return {
        type:'file',
        path:'/'+path,
        name: require('path').basename(path),
        source:"#",
        content: require('fs').readFileSync('./'+path).toString()
    };
}
function getDirectory(path, readme) {
    path = (/\/$/g.test(path)?path:path+'/');
    var dir = require('fs').readdirSync('./' + path).map(function (f) {
        return {path:'/root/'+path+f, name:f};
    });

    return readme.then(function(readme){
        return {
            type:'dir',
            files: dir.filter(function (f) { 
                return require('fs').statSync('./'+f.path.replace(/^\/root/,'')).isFile(); 
            }),
            directories: dir.filter(function (f) { 
                return require('fs').statSync('./'+f.path.replace(/^\/root/,'')).isDirectory(); 
            }),
            readme:readme
        };
    });
}

module.exports.getObject = getObject;