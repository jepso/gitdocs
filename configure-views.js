var Q = require('q');

module.exports = function (app) {
    app.engine('html', require('consolidate').qejs);
    app.set('view engine', 'html');
    app.set('views', __dirname + '/views');
    app.locals.use(function (req, res) {
        res.locals.cache = false;
    });


    function breadcrumb(path){
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

    app.locals.use(function(req,res){
        var path = require('url').parse(req.url).pathname.split(/\//g).filter(function(s){return s.length > 0;});
        if(path.length > 1){
            res.locals.breadcrumb = breadcrumb(path);
        }
    });
};