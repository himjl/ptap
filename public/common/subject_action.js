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

            const actionIndex = _this.key2actionIndex[event.key];
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

            // Get coordinates of the mouse event with origins provided by this.leftBound and this.topBound
            const x = event.pageX - _this.leftBound;
            const y = event.pageY - _this.topBound;

            // Check if click in any of the active regions
            let inside = false;

            for (let i = 0; i < _this.actionCentroids.length; i++) {
                inside = check_if_inside_circle(
                    x,
                    y,
                    _this.actionCentroids[i]['xcenter_px'],
                    _this.actionCentroids[i]['ycenter_px'],
                    _this.actionCentroids[i]['radius_px']);
                if (inside === true) {
                    _this.listening_for_mouse = false;
                    _this._resolveFunc({
                        'actionIndex': _this.actionCentroids[i]['action_index'],
                        't': performance.now(),
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

    Promise_get_subject_mouseclick_response(regions_info, timeout_msec, left_bound_px, top_bound_px) {
        /*
        regions_info: list of Objects with keys: [{'xcenter_px': Integer, 'ycenter_px': Integer, 'radius_px': Integer, 'action_index':Integer}]

        left_bound_px: in pageX coordinates, the origin of the region
        top_bound_px: in pageY coordinates, the origin of the region
         */
        this.leftBound = left_bound_px;
        this.topBound = top_bound_px;

        this.actionCentroids = regions_info;

        this.listening_for_mouse = true;
        var _this = this;
        let choice_promise = new Promise(function (resolve, reject) {
            _this._resolveFunc = resolve;
            _this._errFunc = reject
        });

        if (timeout_msec > 0){
            choice_promise = Promise.race([choice_promise, timeout(timeout_msec)])
        }
        console.log(timeout_msec)
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
