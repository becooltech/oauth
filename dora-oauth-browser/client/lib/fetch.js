/**
 * Created on 2017/5/22.
 * @fileoverview 请填写简要的文件说明.
 * @author joc (Chen Wen)
 */
var _fetch = function (url, options) {
    options = options || {};

    return new Promise(function (resolve, reject) {
        var data = options.body;

        try {
            var xhr = new XMLHttpRequest();
        } catch (e) {
            console.error(e.stack || e);
        }

        xhr.onerror = function () {
            reject(new TypeError('Network request failed'));
        };

        xhr.ontimeout = function () {
            reject(new TypeError('Network request timeout'));
        };

        xhr.addEventListener('readystatechange', function () {
            if (this.readyState === 4) {
                var body = 'response' in xhr ? xhr.response : xhr.responseText;
                resolve({
                    json: function () {
                        return body;
                    }
                });
            }
        });

        xhr.open((options.method || 'GET').toUpperCase(), url);

        if (options.headers) {
            for (var i in options.headers) {
                if (options.headers.hasOwnProperty(i)) {
                    xhr.setRequestHeader(i, options.headers[i]);
                }
            }
        }

        xhr.send(data);
    });
};

module.exports = typeof fetch === 'undefined' ? _fetch : fetch;

module.exports.polyfill = _fetch;
