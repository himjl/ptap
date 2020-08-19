class ActionListenerClass {
    constructor(track_mouseclick, track_keypress, ) {
        /*
        track_mouseclick: bool
        track_keys: bool
        */

        this._resolveFunc;
        this._errFunc;

        var _this = this;

        this.listening_for_keypress = false;
        this.listening_for_mouse = false;

        this.actionCentroids = [];
        this.actionRadii = [];

        this.handleKeyPressEvent = function (event) {

            event.preventDefault();

            if (_this.listening_for_keypress !== true) {
                return
            }


            var actionIndex = _this.key2actionIndex[event.key];
            if (actionIndex === undefined) {
                // Invalid keypress
                return
            }

            _this.listening_for_keypress = false;
            _this._resolveFunc({
                'actionIndex': actionIndex,
                't': performance.now(),
            })
        };

        this.handleMouseEvent = function (event) {
            if (_this.listening_for_mouse === false){
                return
            }

            var x = event.pageX - _this.leftBound;
            var y = event.pageY - _this.topBound;
            var inside = false;

            for (var i = 0; i < _this.actionCentroids.length; i++) {
                inside = check_if_inside_circle(
                    x,
                    y,
                    _this.actionCentroids[i][0],
                    _this.actionCentroids[i][1],
                    _this.actionRadii[i]);
                if (inside === true) {
                    _this.listening_for_mouse = false;
                    _this._resolveFunc({
                        'actionIndex': i,
                        't': performance.now(),
                        'mouse_x': x,
                        'mouse_y': y
                    })
                }
            }
        };

        if (track_keypress === true){
            window.addEventListener('keypress', this.handleKeyPressEvent)
        }
        if (track_mouseclick === true){
            window.addEventListener('mouseup', this.handleMouseEvent)
        }
    }

    Promise_get_subject_mouseclick_response(xy_centroids, diameterPixels, timeout_msec, bounds) {

        this.leftBound = bounds['leftBound'];
        this.rightBound = bounds['rightBound'];
        this.topBound = bounds['topBound'];
        this.bottomBound = bounds['bottomBound'];


        this.actionRadii = [];
        this.actionCentroids = [];


        for (var i = 0; i < xy_centroids.length; i++) {
            this.actionCentroids.push([xy_centroids[i][0], xy_centroids[i][1]]);
            this.actionRadii.push(diameterPixels[i] / 2)
        }

        this.key2actionIndex = key2actionIndex;
        this.listening_for_mouse = true;
        var _this = this;
        var choice_promise = new Promise(function (resolve, reject) {
            _this._resolveFunc = resolve;
            _this._errFunc = reject
        });

        if (timeout_msec > 0){
            choice_promise = Promise.race([choice_promise, timeout(timeout_msec)])
        }

        return choice_promise
    }

    Promise_get_subject_keypress_response(key2actionIndex, timeout_msec) {

        this.key2actionIndex = key2actionIndex;
        var _this = this;
        this.listening_for_keypress = true;
        var choice_promise = new Promise(function (resolve, reject) {
            _this._resolveFunc = resolve;
            _this._errFunc = reject
        });

        if (timeout_msec > 0){
            choice_promise = Promise.race([choice_promise, timeout(timeout_msec)])
        }

        return choice_promise
    }


    close_listeners() {
        if (this.track_mouseclick === true){
            window.removeEventListener('mouseup', this.handleMouseEvent)
        }

        if (this.track_keypress === true){
            window.removeEventListener('keypress', this.handleKeyPressEvent)
        }
    }
}


function timeout(timeoutMsec) {
    return new Promise(
        function (resolve, reject) {
            var timer_return = function () {
                resolve({
                    "actionIndex": -1,
                    'timestamp': performance.now(),
                })
            };
            setTimeout(timer_return, timeoutMsec)
        })
}


function check_if_inside_circle(x, y, xc, yc, r) {
    var dxs = Math.pow(x - xc, 2);
    var dys = Math.pow(y - yc, 2);

    if ((dxs + dys) <= Math.pow(r, 2)) {
        return true
    } else {
        return false
    }
}
