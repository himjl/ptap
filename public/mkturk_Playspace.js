class PlaySpaceClass {
    constructor(bonus_USD_per_correct) {

        this.viewingDistanceInches = 12;
        this.playspaceSizeDegrees = 24;
        this.playspace_isFullScreen = undefined;
        this.virtualPixelsPerInch = 143.755902965;
        this.playspaceSizePixels = this.deg2pixels(this.playspaceSizeDegrees);

        var bounds = this.getPlayspaceBounds();
        this.ScreenDisplayer = new ScreenDisplayer(bounds);
        this.ActionPoller = new ActionPollerClass(["mouseup", "touchstart", "touchmove"], bounds);
        this.SoundPlayer = new SoundPlayerClass();

        // Async trackers 
        this.rewardLog = {'t': [], 'n': []}
    }

    async build() {
        this.attachWindowResizeMonitor();
        await this.SoundPlayer.build();
        await this.ScreenDisplayer.build()
    }

    async run_trial(trial_data) {

        // Default parameters
        var fixationXCentroid = 0.5;
        var fixationYCentroid = 0.8;
        var fixationDiameterDegrees = 4;
        var sampleXCentroid = 0.5;
        var sampleYCentroid = 0.5;
        var sampleDiameterDegrees = 8;
        var choiceXCentroid = [0.35, 0.65];
        var choiceYCentroid = [0.8, 0.8];
        var choiceDiameterDegrees = [4, 4];
        var sampleOffMsec = 0;

        // Default action
        var actionXCentroid = [0.35, 0.65];
        var actionYCentroid = [0.8, 0.8];
        var actionDiameterDegrees = [4, 4];


        // Buffer fixation
        var fixationXCentroidPixels = this.xprop2pixels(fixationXCentroid);
        var fixationYCentroidPixels = this.yprop2pixels(fixationYCentroid);
        var fixationDiameterPixels = this.deg2pixels(fixationDiameterDegrees);

        var sampleXCentroidPixels = this.xprop2pixels(sampleXCentroid);
        var sampleYCentroidPixels = this.yprop2pixels(sampleYCentroid);
        var sampleDiameterPixels = this.deg2pixels(sampleDiameterDegrees);

        await this.ScreenDisplayer.bufferFixation(
            {
                                'fixationXCentroidPixels': fixationXCentroidPixels,
                                'fixationYCentroidPixels': fixationYCentroidPixels,
                                'fixationDiameterPixels': fixationDiameterPixels,
                                'eyeFixationXCentroidPixels': sampleXCentroidPixels,
                                'eyeFixationYCentroidPixels': sampleYCentroidPixels,
                                'eyeFixationDiameterPixels': Math.max(this.deg2pixels(0.2), 4),
                                'drawEyeFixationDot': true,
                                'fixationSpacebarText': false,
            });

        // Stimulus sequence
        var choiceXCentroidPixels = this.xprop2pixels(choiceXCentroid);
        var choiceYCentroidPixels = this.yprop2pixels(choiceYCentroid);
        var choiceDiameterPixels = this.deg2pixels(choiceDiameterDegrees);

        var stimulusFramePackage = {
            'sampleImage': trial_data['sampleImage'],
            'sampleOn': trial_data['presentation_dur_msec'],
            'sampleOff': sampleOffMsec,
            'sampleDiameterPixels': sampleDiameterPixels,
            'sampleXCentroid': sampleXCentroidPixels,
            'sampleYCentroid': sampleYCentroidPixels,
            'choiceDiameterPixels': choiceDiameterPixels,
            'choiceXCentroid': choiceXCentroidPixels,
            'choiceYCentroid': choiceYCentroidPixels,
        };

        await this.ScreenDisplayer.bufferStimulusSequence(stimulusFramePackage);

        // *************** Run trial *************************

        // Blank screen
        await this.ScreenDisplayer.displayBlank();

        // Await fixation
        this.ActionPoller.create_action_regions(
            fixationXCentroidPixels,
            fixationYCentroidPixels,
            fixationDiameterPixels);

        this.ActionPoller.create_button_mappings({' ': 0});

        var t_fixationOn = await this.ScreenDisplayer.displayFixation();
        var fixationOutcome = await this.ActionPoller.Promise_wait_until_active_response();

        // Display stimulus
        var t_SequenceTimestamps = await this.ScreenDisplayer.displayStimulusSequence();

        var actionXCentroidPixels = this.xprop2pixels(actionXCentroid);
        var actionYCentroidPixels = this.yprop2pixels(actionYCentroid);
        var actionDiameterPixels = this.deg2pixels(actionDiameterDegrees);

        this.ActionPoller.create_action_regions(
            actionXCentroidPixels,
            actionYCentroidPixels,
            actionDiameterPixels);

        this.ActionPoller.create_button_mappings({'f': 0, 'j': 1});

        if (trial_data['timeout_dur_msec'] > 0) {
            var actionPromise = Promise.race([
                this.ActionPoller.Promise_wait_until_active_response(),
                this.ActionPoller.timeout(trial_data['timeout_dur_msec'])])
        } else {
            var actionPromise = this.ActionPoller.Promise_wait_until_active_response()
        }

        var actionOutcome = await actionPromise;
        var rewardAmount = trial_data['label'] === actionOutcome['actionIndex'];

        // Deliver reinforcement
        var t_reinforcementOn = Math.round(performance.now() * 1000) / 1000;
        if (rewardAmount > 0) {
            this.SoundPlayer.play_sound('reward_sound');
            await this.ScreenDisplayer.displayReward(trial_data['reward_dur_msec']);
        }
        else if (rewardAmount <= 0) {
            this.SoundPlayer.play_sound('punish_sound');
            await this.ScreenDisplayer.displayPunish(trial_data['punish_dur_msec'])
        }
        else {
            rewardAmount = 0;
        }
        var t_reinforcementOff = Math.round(performance.now() * 1000) / 1000

        this.rewardLog['t'].push(t_reinforcementOn);
        this.rewardLog['n'].push(rewardAmount);

        // *************** Write down trial outcome *************************
        var trialOutcome = {};
        trialOutcome['stimulus_number'] = trial_data['stimulus_number'];
        trialOutcome['trial_number'] = trial_data['trial_number'];
        trialOutcome['label'] = trial_data['label'];
        trialOutcome['presentation_dur_msec'] = trial_data['punish_dur_msec'];
        trialOutcome['punish_dur_msec'] = trial_data['punish_dur_msec'];
        trialOutcome['reward_dur_msec'] = trial_data['reward_dur_msec'];
        trialOutcome['timeout_dur_msec'] = trial_data['timeout_dur_msec'];

        trialOutcome['perf'] = rewardAmount;
        trialOutcome['action'] = actionOutcome['actionIndex'];
        trialOutcome['responseX'] = actionOutcome['x'];
        trialOutcome['responseY'] = actionOutcome['y'];
        trialOutcome['fixationX'] = fixationOutcome['x'];
        trialOutcome['fixationY'] = fixationOutcome['y'];
        trialOutcome['timestampStart'] = fixationOutcome['timestamp'];
        trialOutcome['timestampFixationOnset'] = t_fixationOn;
        trialOutcome['timestampFixationAcquired'] = fixationOutcome['timestamp'];
        trialOutcome['timestampResponse'] = actionOutcome['timestamp'];
        trialOutcome['timestampReinforcementOn'] = t_reinforcementOn;
        trialOutcome['timestampReinforcementOff'] = t_reinforcementOff;
        trialOutcome['timestampStimulusOn'] = t_SequenceTimestamps[0];
        trialOutcome['timestampStimulusOff'] = t_SequenceTimestamps[1];
        trialOutcome['timestampChoiceOn'] = t_SequenceTimestamps.slice(-1)[0];
        trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - t_SequenceTimestamps.slice(-1)[0]);

        return trialOutcome
    }

    start_action_tracking() {
        this.ActionPoller.start_action_tracking()
    }

    getPlayspaceBounds() {
        var bounds = {};
        var windowHeight = getWindowHeight();
        var windowWidth = getWindowWidth();

        if (this.playspace_isFullScreen === true) {

            bounds['height'] = windowHeight;
            bounds['width'] = windowWidth;
            bounds['leftBound'] = 0;//Math.floor((windowWidth - min_dimension)/2) // in units of window
            bounds['rightBound'] = windowWidth;//Math.floor(windowWidth-(windowWidth - min_dimension)/2)
            bounds['topBound'] = 0;//Math.floor((windowHeight - min_dimension)/2)
            bounds['bottomBound'] = windowHeight//Math.floor(windowHeight-(windowHeight - min_dimension)/2)
        } else {
            var screen_margin = 0.15;
            var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth)) * (1 - screen_margin);

            var min_dimension = Math.min(max_allowable_playspace_dimension, this.playspaceSizePixels);
            var min_dimension = Math.ceil(min_dimension);

            bounds['height'] = min_dimension;
            bounds['width'] = min_dimension;
            bounds['leftBound'] = Math.floor((windowWidth - min_dimension) / 2); // in units of window
            bounds['rightBound'] = Math.floor(windowWidth - (windowWidth - min_dimension) / 2);
            bounds['topBound'] = Math.floor((windowHeight - min_dimension) / 2);
            bounds['bottomBound'] = Math.floor(windowHeight - (windowHeight - min_dimension) / 2)
        }


        return bounds
    }

    updateWindowLog(bounds) {
        if (this.playspaceLog === undefined) {
            this.playspaceLog = {};

            for (var k in bounds) {
                if (!bounds.hasOwnProperty(k)) {
                    continue
                }
                this.playspaceLog[k] = []
            }
        }
        for (var k in bounds) {
            if (!bounds.hasOwnProperty(k)) {
                continue
            }
            if (!this.playspaceLog.hasOwnProperty(k)) {
                this.playspaceLog[k] = []
            }
            this.playspaceLog[k].push(bounds[k])
        }
    }

    attachWindowResizeMonitor() {

        var _this = this;

        function onWindowResize() {
            // on window resize
            var bounds = {};
            var windowHeight = getWindowHeight();
            var windowWidth = getWindowWidth();

            var screen_margin = 0.15;
            var max_allowable_playspace_dimension = Math.round(Math.min(windowHeight, windowWidth)) * (1 - screen_margin);

            var min_dimension = Math.min(max_allowable_playspace_dimension, _this.playspaceSizePixels);
            var min_dimension = Math.ceil(min_dimension);

            _this.height = min_dimension;
            _this.width = min_dimension;
            _this.leftBound = Math.floor((windowWidth - _this.width) / 2); // in units of window
            _this.rightBound = Math.floor(windowWidth - (windowWidth - _this.width) / 2);
            _this.topBound = Math.floor((windowHeight - _this.height) / 2);
            _this.bottomBound = Math.floor(windowHeight - (windowHeight - _this.height) / 2);

            bounds['height'] = _this.height;
            bounds['width'] = _this.width;
            bounds['leftBound'] = _this.leftBound;
            bounds['rightBound'] = _this.rightBound;
            bounds['topBound'] = _this.topBound;
            bounds['bottomBound'] = _this.bottomBound;
            bounds['windowWidth'] = windowWidth;
            bounds['windowHeight'] = windowHeight;
            bounds['t'] = Math.round(performance.now() * 1000) / 1000;

            _this.ScreenDisplayer.calibrateBounds(bounds);
            _this.ActionPoller.calibrateBounds(bounds);
            _this.updateWindowLog(bounds);

            console.log('onWindowResize():', bounds['leftBound'], bounds['topBound'])
        }

        onWindowResize();

        window.addEventListener('resize', onWindowResize);
        console.log('Attached window resize listener')
    }

    start_device_tracking() {
        // battery
        // resize events
        this.deviceLog = {};

        // ******** Window resize ****
        this.deviceLog['window'] = {};
        this.deviceLog['window']['height'] = [];
        this.deviceLog['window']['width'] = [];
        this.deviceLog['window']['timestamp'] = [];
        window.addEventListener('resize', function () {
            _this.deviceLog['window']['height'].push(getWindowHeight());
            _this.deviceLog['window']['width'].push(getWindowWidth());
            _this.deviceLog['window']['timestamp'].push(Math.round(performance.now() * 1000) / 1000)
        });

        // ******** Device and browser ****
        this.deviceLog.devicePixelRatio = window.devicePixelRatio || 1;
        this.deviceLog.navigator_appVersion = navigator.appVersion;
        this.deviceLog.navigator_platform = navigator.platform;
        this.deviceLog.navigator_userAgent = navigator.userAgent;
        this.deviceLog.navigator_vendor = navigator.vendor;
        this.deviceLog.navigator_language = navigator.language;
        this.deviceLog.unixTimestampPageLoad = window.performance.timing.navigationStart;
        this.deviceLog.currentDate = new Date;
        this.deviceLog.url = window.location.href
    }

    deg2inches(degrees) {

        // diameter degrees 
        // assume centered (center of diameter length at viewing normal to screen surface)
        if (degrees.constructor === Array) {
            var result = [];
            for (var i = 0; i < degrees.length; i++) {
                var rad = this.deg2rad(degrees[i] / 2);
                result.push(2 * this.viewingDistanceInches * Math.atan(rad))
            }
            return result
        }

        var rad = this.deg2rad(degrees / 2);
        return 2 * this.viewingDistanceInches * Math.atan(rad)
    }

    deg2pixels(degrees) {
        // Return virtual pixels 
        if (degrees.constructor === Array) {
            var result = [];
            for (var i = 0; i < degrees.length; i++) {
                var inches = this.deg2inches(degrees[i]);
                result.push(Math.round(inches * this.virtualPixelsPerInch))
            }
            return result
        }

        var inches = this.deg2inches(degrees);
        return Math.round(inches * this.virtualPixelsPerInch)
    }

    xprop2pixels(xproportion) {
        if (xproportion.constructor === Array) {
            var result = [];
            for (var i = 0; i < xproportion.length; i++) {
                result.push(Math.round(xproportion[i] * this.width))
            }
            return result
        }
        return Math.round(xproportion * this.width)
    }

    yprop2pixels(yproportion) {
        if (yproportion.constructor === Array) {
            var result = [];
            for (var i = 0; i < yproportion.length; i++) {
                result.push(Math.round(yproportion[i] * this.height))
            }
            return result
        }
        return Math.round(yproportion * this.height)
    }

    deg2rad(deg) {
        if (deg.constructor === Array) {
            var result = [];
            for (var i = 0; i < deg.length; i++) {
                result.push(deg[i] * Math.PI / 180)
            }
            return result
        }
        return deg * Math.PI / 180
    }


    async run_tutorial_trial(tutorial_image) {
        var fixationXCentroidPixels = this.xprop2pixels(0.5);
        var fixationYCentroidPixels = this.yprop2pixels(0.7);
        var fixationDiameterPixels = this.deg2pixels(3);

        // BUFFER FIXATION
        var fixationFramePackage = {
            'fixationXCentroidPixels': fixationXCentroidPixels,
            'fixationYCentroidPixels': fixationYCentroidPixels,
            'fixationDiameterPixels': fixationDiameterPixels,
        };
        await this.ScreenDisplayer.bufferFixation(fixationFramePackage);

        // BUFFER STIMULUS
        var stimulusXCentroidPixels = this.xprop2pixels(0.1 + 0.8 * Math.random());
        var stimulusYCentroidPixels = this.yprop2pixels(0.6 * Math.random());
        var stimulusDiameterPixels = this.deg2pixels(6);

        var stimulusCanvas = this.ScreenDisplayer.getSequenceCanvas('tutorial_sequence', 0);
        await this.ScreenDisplayer.renderBlank(stimulusCanvas);
        await this.ScreenDisplayer.drawImagesOnCanvas(tutorial_image, stimulusXCentroidPixels, stimulusYCentroidPixels, stimulusDiameterPixels, stimulusCanvas);

        // SHOW BLANK
        await this.ScreenDisplayer.displayBlank();

        // RUN FIXATION
        this.ActionPoller.create_action_regions(
            fixationXCentroidPixels,
            fixationYCentroidPixels,
            fixationDiameterPixels);

        await this.ScreenDisplayer.displayFixation();
        await this.ActionPoller.Promise_wait_until_active_response();

        // RUN STIMULUS SEQUENCE
        await this.ScreenDisplayer.displayScreenSequence(stimulusCanvas, 0);

        this.ActionPoller.create_action_regions(
            stimulusXCentroidPixels,
            stimulusYCentroidPixels,
            stimulusDiameterPixels);

        await this.ActionPoller.Promise_wait_until_active_response();
        this.SoundPlayer.play_sound('reward_sound')
    }
}
