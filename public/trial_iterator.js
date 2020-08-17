class Trial_Iterator_Class {
    constructor(task_def) {
        this.image_url_prefix = task_def['image_url_prefix'];
        this.image_url_suffixes = task_def['image_url_suffixes'];

        this.task_def = task_def;
        this.trial_sequence = this.task_def['trial_sequence'];
        this.ntrials = this.trial_sequence['stimulus_number'].length;

        this.image_buffer = new ImageBuffer();

        this.trial_number = 0;
        this.next_buffer_trial_number = 0;
        this.trial_pool = {};

        this.new_task_screen_trials = this.trial_sequence['new_task_screen_trials'];
        console.log(this.task_def);

        if (this.new_task_screen_trials !== undefined){
            this.next_new_task_trial = this.new_task_screen_trials.shift()
        }

        this._start_buffering_continuous();

        if (this.ntrials === 0){
            this.terminal = true; // No trials were requested
        }
        else {
            this.terminal = false;
        }
    }

    _get_url(stimulus_number){
        var current_suffix = this.image_url_suffixes[stimulus_number];
        return this.image_url_prefix.concat(current_suffix)
    }
    async get_next_trial(){
        // Check if a "new task" splash screen is to be shown here
        if (this.trial_number === this.next_new_task_trial){
            console.log('New task splash screen, next trial = ', this.trial_number);
            var trial_package = {};
            trial_package['show_next_task_splash'] = true;
            this.next_new_task_trial = this.new_task_screen_trials.shift();
            return trial_package
        }
        // Otherwise
        console.log('trial', this.trial_number);
        // Load the next trial
        if (this.trial_pool[this.trial_number] === undefined){
            await this._buffer_trial(this.trial_number)
        }

        // Pop trial data
        var trial_data = this.trial_pool[this.trial_number];
        delete this.trial_pool[this.trial_number];

        this.trial_number+=1;
        if (this.trial_number >= this.ntrials){
            // This was the last trial.
            this.terminal = true;
        }

        return trial_data
    }

    async _buffer_trial(trial_number) {
        // trial_number: integer
        // Loads the trial defined at trial_number

        if (trial_number >= this.ntrials){
            return
        }

        var stimulus_number = this.trial_sequence['stimulus_number'][trial_number];
        var label = this.trial_sequence['label'][trial_number];
        var presentation_dur_msec = this.trial_sequence['presentation_dur_msec'][trial_number];
        var punish_dur_msec = this.trial_sequence['punish_dur_msec'][trial_number];
        var reward_dur_msec = this.trial_sequence['reward_dur_msec'][trial_number];
        var timeout_dur_msec = this.trial_sequence['timeout_dur_msec'][trial_number];

        var stimulus_url = this._get_url(stimulus_number);
        var stimulus_image = await this.image_buffer.get_by_url(stimulus_url);

        var trial_package = {};
        trial_package['trial_number'] = trial_number;
        trial_package['sampleImage'] = stimulus_image;
        trial_package['stimulus_number'] = stimulus_number;
        trial_package['label'] = label;
        trial_package['presentation_dur_msec'] = presentation_dur_msec;
        trial_package['punish_dur_msec'] = punish_dur_msec;
        trial_package['reward_dur_msec'] = reward_dur_msec;
        trial_package['timeout_dur_msec'] = timeout_dur_msec;

        this.trial_pool[trial_number] = trial_package;
    }

    async _start_buffering_continuous() {
        // Buffer trials in the background

        var _this = this;
        this.currently_buffering = false;
        this.max_buffered_trials = 100;

        var bufferTrials = async function () {

            if (_this.next_buffer_trial_number >= _this.ntrials){
                console.log('Buffered all trials. Returning');
                return
            }

            if (_this.currently_buffering === true) {
                console.log('Currently buffering.');
                return
            }

            var num_trials_in_pool = Object.keys(_this.trial_pool).length;
            if (num_trials_in_pool < _this.max_buffered_trials) {
                _this.currently_buffering = true;
                var trialRequests = [];
                var num_trials_to_buffer = 5;
                for (var i = 0; i < num_trials_to_buffer; i++) {
                    trialRequests.push(_this._buffer_trial(_this.next_buffer_trial_number));
                    _this.next_buffer_trial_number += 1;
                }
                console.log('Buffering', trialRequests.length, 'trials');
                await Promise.all(trialRequests);
                // Unlock
                _this.currently_buffering = false
            } else {
                console.log('Trial buffer is filled with ', num_trials_in_pool, 'trials.')
            }
        };
        bufferTrials();
        window.setInterval(bufferTrials, 10000)
    }
}
