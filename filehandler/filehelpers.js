var use = require('./fileprocessor').use;
var Q = require('q');


function marked(content){
    var marked = require('marked');
    // Set default options
    marked.setOptions({
        gfm: true,
        pedantic: false,
        sanitize: true,
        // callback for code highlighter
        highlight: require('../highlighter')
    });
    var tokens = marked.lexer(content);
    var path = [];
    var nav = [];
    for (var i = 0; i < tokens.length; i++) {
        var token = tokens[i];
        if (token.type === 'heading') {
            //to_param = token.text.parameterize();
            var depth = token.depth;
            while (path.length + 1 > depth) path.pop();
            path.push(token.text.toLowerCase().replace(/ /g, ''));
            token.depth = depth + ' id="' + path.join("/") + '"';
            nav.push({name: token.text, depth: depth, path: path.join("/")});
        }
    }
    var text = marked.parser(tokens);
    return {text:text, nav:nav};
}
use(['.md', '.markdown'], 'marked', function (content) {
    return Q.when(marked(content||this.content));
});

use('highlight', function(source, lang, preventGuessing){
    if (arguments.length === 0) {
        return require('../highlighter')(this.content, this.extension.substr(1));
    }
    if (arguments.length === 1 && (arguments[0] === true || arguments[0] === false)) {
        return require('../highlighter')(this.content, this.extension.substr(1), arguments[0]);
    }
    return Q.when(require('../highlighter')(source, lang, preventGuessing));
});

use('.js', 'dox', function (options) {
    var content = this.content;
    return Q.when(options, function (options){
        options = options || {};
        var raw = options.raw;
        options.raw = true;
        var processed = require('dox').parseComments(content, options);
        if (!raw) {
            processed.forEach(function (comment) {
                var description = comment.description;
                description.full = marked(description.full).text;
                description.summary = marked(description.summary).text;
                description.body = marked(description.body).text;
            });
        }
        return processed;
    }).fail(function (err) {
        return [{description:{full:''}, code:content}];
    });
});