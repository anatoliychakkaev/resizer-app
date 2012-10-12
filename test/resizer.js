require('./helper')(exports);

var fs = require('fs');
var request = require('request');

context('Resizer', function () {

    var imageUrl = 'http://www.google.com/images/srpr/logo3w.png';

    it('should download image', function (test) {
        var r = new Resizer(imageUrl);
        removeCache(r.file);
        r.resize({width: 30, height: 30}, function (err, data) {
            test.ok(!err);
            test.equal(data.type, 'png');
            test.ok(data.image.length);
            test.done();
        });
    });

    it('should resize image to multiple sizes but download once', function (test) {
        var r = new Resizer(imageUrl);
        var prev = 0;
        var requestsDone = 0;
        request.get = function () {
            requestsDone += 1;
            return request.apply(this, [].slice.call(arguments));
        };
        removeCache(r.file);
        var sizes = [[100, 100], [300, 300], [800, 600]];
        sizes.forEach(function (s) {
            r.resize({width: s.shift(), height: s.shift()}, ok);
        });

        var wait = sizes.length;

        function ok(err, data) {
            test.ok(prev < data.image.length);
            prev = data.image.length;
            if (--wait === 0) {
                test.equal(requestsDone, 1, 'Only one request done');
                test.done();
            }
        }
    });
});

function removeCache(file) {
    // remove cache
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
}

