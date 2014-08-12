var url = require('url'),
    follow = require('follow'),
    couchr = require('couchr'),
    _ = require('highland');


var methods = [
    'get',
    'post',
    'head',
    'put',
    'del',
    'copy'
];

var exports = module.exports = function (base) {
    var api = ['changes'].concat(methods).reduce(function (api, name) {
        api[name] = function (loc /* args... */) {
            var args = Array.prototype.slice.call(arguments);
            args[0] = url.resolve(base, loc);
            return exports[name].apply(this, args);
        };
        return api;
    }, {});
    api.url = base;
    return api;
};

methods.forEach(function (name) {
    exports[name] = _.curry(function (loc, q) {
        return _(function (push, next) {
            console.log(['highland-couchr', name, loc, q]);
            couchr[name](loc, q, function (err, res, req) {
                if (err) {
                    console.log(['highland-couchr err', err]);
                    push(err);
                    push(null, _.nil);
                }
                else {
                    req.body = res;
                    push(null, req);
                    push(null, _.nil);
                }
            });
        });
    });
});

exports.changes = function (db, q) {
    q = q || {};
    if (!q.hasOwnProperty('since')) {
        q.since = 'now';
    }
    q.db = db;
    var feed = new follow.Feed(q);
    var s = _(function (push, next) {
        feed.on('change', function (change) {
            push(null, change);
        });
        feed.on('error', push);
        feed.follow();
    });
    s.stop = feed.stop.bind(feed);
    return s;
};
