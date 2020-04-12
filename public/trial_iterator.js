class Trial_Iterator_Class {
    constructor(task_def) {
        this.image_url_prefix = task_def['image_url_prefix'];
        this.image_url_suffixes = task_def['image_url_suffixes'];

        this.task_def = task_def;
        this.trial_sequence = this.task_def['trial_sequence'];
        this.image_buffer = new ImageBuffer();

        this.trial_number = 0;
        this.next_buffer_trial_number = 0;
        this.trial_queue = [];
        this._start_buffering_continuous();

        if (this.trial_sequence.length === 0){
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
        // Load the next trial
        if (this.trial_queue.length === 0){
            await this._buffer_trial(this.trial_number)
        }
        this.trial_number+=1;

        if (this.trial_number >= this.trial_sequence.length){
            // This was the last trial.
            this.terminal = true;
        }

        return this.trial_queue.shift()
    }

    async _buffer_trial(trial_number) {
        // trial_number: integer
        // Loads the trial defined at trial_number

        if (trial_number >= this.trial_sequence.length){
            return
        }

        var current_trial_dict = this.trial_sequence[trial_number];
        var stimulus_number = current_trial_dict['stimulus_number'];
        var stimulus_url = this._get_url(stimulus_number);
        var stimulus_image = await this.image_buffer.get_by_url(stimulus_url);

        var trial_package = {};
        trial_package['sampleImage'] = stimulus_image;
        trial_package['label'] = current_trial_dict['label'];
        trial_package['presentation_dur_msec'] = current_trial_dict['presentation_dur_msec'];
        trial_package['punish_dur_msec'] = current_trial_dict['punish_dur_msec'];
        trial_package['reward_dur_msec'] = current_trial_dict['reward_dur_msec'];
        trial_package['timeout_dur_msec'] = current_trial_dict['timeout_dur_msec'];

        this.trial_queue.push(trial_package)
        this.next_buffer_trial_number += 1;
    }

    async _start_buffering_continuous() {
        var _this = this;
        this.currently_buffering = false;
        this.max_buffered_trials = 100;

        var bufferTrials = async function () {

            if (_this.next_buffer_trial_number >= _this.trial_sequence.length){
                console.log('Buffered all trials. Returning')
                return
            }

            if (_this.currently_buffering === true) {
                console.log('Currently buffering.');
                return
            }

            var num_trials_in_buffer = _this.trial_queue.length;
            if (num_trials_in_buffer < _this.max_buffered_trials) {
                _this.currently_buffering = true;
                var trialRequests = [];
                var num_trials_to_buffer = 5;
                for (var i = 0; i < num_trials_to_buffer; i++) {
                    trialRequests.push(_this._buffer_trial(_this.next_buffer_trial_number));
                }
                console.log('Buffering', trialRequests.length, 'trials');
                await Promise.all(trialRequests);
                // Unlock
                _this.currently_buffering = false
            } else {
                console.log('Trial buffer is filled with ', num_trials_in_buffer, 'trials.')
            }
        };
        window.setInterval(bufferTrials, 10000)
    }
}
