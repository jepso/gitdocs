var chain = [];

function process(locals){
    for(var i = 0; i < chain.length; i++){
        chain[i](locals);
    }

    return locals;
}
module.exports.process = process;

/**
 * Add a function which add's methods to a file type
 * 
 * @param  {array|string} [extensions] optionally narrow it down to a set of extensions
 * @param  {[type]} name       [description]
 * @param  {[type]} method     [description]
 * @return {[type]}            [description]
 */
function use(extensions, name, method){
    if(arguments.length === 3) {
        if (typeof name !== 'string') throw new TypeError('Name must be of type string');
        if (typeof method !== 'function') throw new TypeError('Method must be of type function');
        if (typeof extensions === 'string' && /^(\.?\w+)+$/g.test(extensions)) {
            extensions = extensions.split(/\./g);
        }
        if (!Array.isArray(extensions) ||
            !extensions.every(function (v) { return typeof v === 'string' && /\.?\w+/g.test(v); })) {
            throw new TypeError('Extensions must either be a string or an array of strings');
        }

        var hash = {};
        //extensions is now an array
        extensions.forEach(function(ext){
            hash[ext.replace(/^\.?/, '.')] = true;
        });
        console.log(hash);
        
        chain.push(function (locals) { console.log(locals.extension, name);
            if(hash[locals.extension] === true){
                if(typeof locals[name] !== 'undefined') throw new Error('The method you are attempting to add already exists');
                locals[name] = method;
            }
        });
    } else if (arguments.length === 2) {
        method = name;
        name = extensions;
        if(typeof name !== 'string') throw new TypeError('Name must be of type string');
        if(typeof method !== 'function') throw new TypeError('Method must be of type function');

        chain.push(function (locals) {
            if(typeof locals[name] !== 'undefined') throw new Error('The method you are attempting to add already exists');
            locals[name] = method.bind(locals);
        })
    }
}
module.exports.use = use;