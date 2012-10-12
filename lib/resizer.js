
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var im = require('imagemagick');
var request = require('request');

module.exports = Resizer;

if (!fs.existsSync(__dirname + '/../cache')) {
    fs.mkdirSync(__dirname + '/../cache');
}

/**
 * Resizer class
 *
 * @param url - source of image
 */
function Resizer(url) {
    this.url = url;
    this.file = path.join(__dirname, '/../cache/', hash(url));
}

/**
 * Perform resizing procedure
 *
 * @param {Object} params - set of input params (width, height, gravity)
 * @param {Function} done - callback(error, {type: 'png', image: Buffer})
 */
Resizer.prototype.resize = function (params, done) {
    var resizer = this;

    this.getCache(function (err, cached) {
        if (err) {
            return done(err);
        }
        if (cached) {
            resizer.convert(cached, params, done);
        } else {
            resizer.download(function (err) {
                if (err) {
                    done(err);
                } else {
                    resizer.resize(params, done);
                }
            });
        }
    });
};

/**
 * Do convertation using imagemagick in three steps:
 * - get information about current image size
 * - make decision, how to resize to avoid blank fields
 * - resize and (maybe) crop
 *
 * @api private
 */
Resizer.prototype.convert = function convert(data, params, done) {

    var resizer = this, type;

    getRealDimensions(function (err, width, height) {
        if (err) {
            return done(err);
        }

        // build resize cmd based on real size and dest size
        var resizeCmd = {  };

        // if we resize by width, height will be
        var estHeight = Math.round(height * params.width / width);

        // check how it fits
        if (estHeight >= params.height) {
            // then resize by width
            resizeCmd.width = params.width;
        } else {
            // otherwise resize by height
            resizeCmd.height = params.height;
        }

        console.log(width, height, params.height, resizeCmd);

        resizeCmd.srcData = data;

        var cropCmd = estHeight === params.height ? false : {
            width: params.width,
            height: params.height,
            gravity: params.gravity || 'North'
        };
        console.log(cropCmd);

        resizeAndCrop(resizeCmd, cropCmd);
    })

    function getRealDimensions(cb) {
        im.identify(['-format', '%m:%w:%h', resizer.file], function (err, info) {
            if (err) {
                return cb(err);
            }
            var inf = info.split(':');
            type = inf[0].toLowerCase();
            var width = parseInt(inf[1], 10);
            var height = parseInt(inf[2], 10);
            cb(null, width, height);
        });
    }

    function resizeAndCrop(resizeCmd, cropCmd) {

        im.resize(resizeCmd, function (err, stdout, stderr) {
            if (err) {
                return done(err);
            }

            // alread good size, cropping is not necessary
            if (!cropCmd) {
                return ok(err, stdout);
            }

            cropCmd.srcData = stdout;

            im.crop(cropCmd, function (err, stdout, stderr) {
                ok(err, stdout);
            });
        });

    }

    function ok(err, data) {
        done(err, {
            type: type,
            image: data
        });
    }

}

/**
 * Get cached image (if any)
 *
 * @param {Function} done - callback(err, fileContents)
 * @api private
 */
Resizer.prototype.getCache = function (done) {
    var file = this.file;
    fs.exists(file, function (exists) {
        if (exists) {
            fs.readFile(file, done);
        } else {
            done(null, null);
        }
    });
};

/**
 * Download image from web (this.url), and store to file (this.file).
 *
 * This method only download file once (when multiple files scheduled
 * simultaneously)
 *
 * It could be pretty often usecase, when someone need different sizes on
 * single image, and perform multiple requests in batch
 *
 * @param {Function} completed - callback(err)
 * @api private
 *
 */
Resizer.prototype.download = function download(completed) {
    var file = this.file;

    // we need pool for collecting callbacks awaiting download
    download.pool = download.pool || {};

    // if pool for current file is blank: schedule callback, begin downloading
    if (!download.pool[file]) {
        download.pool[file] = [completed];
        request.get({encoding: null, url: this.url}, function (err, res) {
            if (err || res.statusCode !== 200) {
                done(err || new Error('Server responds with status ' + res.statusCode));
            } else {
                fs.writeFile(file, res.body, done);
            }
        });
    }
    // otherwise, just schedule another callback (don't download twice)
    else {
        download.pool[file].push(completed);
    }

    function done(err) {
        download.pool[file].forEach(function (cb) {
            cb(err);
        });
        delete download.pool[file];
    }
};

/**
 * Calc sha256 hash on given string
 */
function hash(n) {
    return crypto.createHash('sha256').update(n.toString()).digest('hex');
};

