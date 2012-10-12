
var express = require('express');
var Resizer = require('./lib/resizer.js');

var server = express();
server.get('*', function (req, res, next) {

    var query = req.query;

    if (!query.u) {
        return badRequest('URL not specified. Use ?u= param to specify URL');
    }

    var height = parseInt(query.h, 10);
    var width = parseInt(query.w, 10);

    if (isNaN(height) || isNaN(width) || width <= 0 || height <= 0) {
        return badRequest('Wrong dimensions');
    }

    var resizer = new Resizer(query.u);
    resizer.resize({
        height: height,
        width: width,
        gravity: query.gravity
    }, function (err, data) {
        if (err) {
            console.log(err);
            res.send(500, 'Something went wrong during resizing');
        } else {
            res.set('Content-Type', 'image/' + data.type);
            res.end(data.image, 'binary');
        }
    });

    function badRequest(msg) {
        res.send(400, msg);
    }

});
server.listen(3000);

