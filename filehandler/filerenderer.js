var fs = require('fs');
var qejs = require('qejs');
var Q = require('q');
function checkDirectory(dir) {
    if (fs.statSync(dir).isDirectory()) {
        var files = fs.readdirSync(dir);
        var output = [];
        for (var i = 0; i < files.length; i++) {
            var res = checkDirectory(dir + '/' + files[i]);
            if (Array.isArray(res)) {
                for (var j = 0; j < res.length; j++) {
                    output.push(res[j]);
                };
            } else {
                output.push(res);
            }
        }
        return output;
    } else if (/\.html$/.test(dir)) {
        var output = {path:dir, name: undefined, description: undefined, thumbnail: undefined, screenshot: undefined, supports: [], supportsAll:undefined};
        var locals = {mode:'describe', open:'{{', close:'}}'};
        locals.extensions = {};
        locals.extensions.supports = function(){
            for(var i = 0; i<arguments.length; i++){
                output.supports.push('.' + arguments[i].replace(/^\./g, ''));
            }
        };
        locals.extensions.supportsAll = function(){
            output.supportsAll = true;
        };
        return qejs.renderFile(dir, locals).then(function(v){
            if(typeof output.supportsAll === 'undefined') output.supportsAll = false;
            if(output.supports.length === 0 && !output.supportsAll) { 
                throw new Error(dir + ': A template must either support all text file formats, or specify which formats it does support.');
            }
            if(output.supports.length > 0 && output.supportsAll) { 
                throw new Error(dir + ': A template must either support all text file formats, or specify which formats it does support, it cannot do both.');
            }
            return output;
        });
    }
}
var templates = Q.all(checkDirectory(require('path').resolve('./views/filetypes'))).then(function (templateList) {
    var templates = {byExtension:{}, default:[]};
    templateList.forEach(function(template){
        if (template.supportsAll) {
            templates.default.push(template);
        } else {
            template.supports.forEach(function (extension) {
                (templates.byExtension[extension] = templates.byExtension[extension] || []).push(template);
            })
        }
    });
    return templates;
});

function render(locals, req, res) {
    locals.extension;
    locals.mode = 'render';
    templates.then(function (templates) {
        if (templates.byExtension[locals.extension] && templates.byExtension[locals.extension].length > 0) {
            res.render(templates.byExtension[locals.extension][0].path, locals);
        } else {
            res.render(templates.default[0].path, locals);
        }
    }).end();
};
module.exports.render = render;