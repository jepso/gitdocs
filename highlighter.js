module.exports = function(code, lang, preventGuessing) {
    //Source: http://softwaremaniacs.org/soft/highlight/en/download/
    //Docs: http://softwaremaniacs.org/wiki/doku.php/highlight.js:api
    var hljs = require("highlight.js");
	if(lang){
        try {
            lang = (typeof aliases[lang] !== 'undefined'?aliases[lang]:lang);
            return hljs.highlight(lang, code).value;
        } catch (ex) {
            //unrecognised language, fall through to automatted method.
            console.log(lang);
            console.log(ex);
        }
	}
    if(preventGuessing !== true){
        var t = hljs.highlightAuto(code);
    	if ((t.relevance / code.split(/\n/g).length) > 0) { //If we really don't know, we should just admit it :)
            return t.value;
        } else {
            return code;
        }
    } else {
        return code;
    }
}

var aliases = {
	js:'javascript',
    md:'markdown'
};