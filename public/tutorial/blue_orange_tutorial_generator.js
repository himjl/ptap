// Generates tutorial
// Blue diamond == right (label = 1)
// Orange diamond == left (label = 0)


class Tutorial_Generator_Class {
    constructor() {
        this.max_trials = 60;
        this.min_trials_criterion = 10;
        this.pr_criterion = 0.9;

        this.image_buffer = new ImageBuffer();
        this.reward_history = [];


        this.blue_diamond_image = undefined;
        this.orange_diamond_image = undefined;

        // defaults
        this.presentation_dur_msec = 200;
        this.punish_dur_msec = 800;
        this.reward_dur_msec = 100;
        this.timeout_dur_msec = 5000;
    }

    async _cache_images(){

        if (this.blue_diamond_image === undefined){
            this.blue_diamond_image = await this.image_buffer.get_by_url('/image_assets/blue_orange/bluediamond.png');
        }
        if (this.orange_diamond_image === undefined){
            this.orange_diamond_image = await this.image_buffer.get_by_url('/image_assets/blue_orange/orangediamond.png');
        }
    }

    async get_next_trial(){
        // Load the next trial
        await this._cache_images();

        // Get label
        var label = Math.random() < 0.5;
        var sample_image = undefined;
        if (label === true){
            // Blue
            sample_image = this.blue_diamond_image;
        }
        else{
            sample_image = this.orange_diamond_image;
        }

        var trial_package = {};
        trial_package['sampleImage'] = sample_image;
        trial_package['stimulus_number'] = +label;
        trial_package['trial_number'] = this.reward_history.length;
        trial_package['label'] = +label;
        trial_package['presentation_dur_msec'] = this.presentation_dur_msec;
        trial_package['punish_dur_msec'] = this.punish_dur_msec;
        trial_package['reward_dur_msec'] = this.reward_dur_msec;
        trial_package['timeout_dur_msec'] = this.timeout_dur_msec;
        return trial_package
    }

    update_state(trial_outcome){
        var perf = trial_outcome['perf'];
        this.reward_history.push(perf);

        // Check if reached criterion
        var cur_criterion_perf = 0;
        if (this.reward_history.length >= this.min_trials_criterion){
            var window = this.reward_history.slice(-this.min_trials_criterion);
            cur_criterion_perf = vec_funcs.mean(window)
        }

        if (cur_criterion_perf >= this.pr_criterion){
            return 'done'
        }

        // Check if exceeded max # of trials
        if (this.reward_history.length >= this.max_trials){
            return 'failure'
        }

        return 'in_progress'

    }
}


class vec_funcs {
    static mean(arr) {
        var total = 0, i;
        for (i = 0; i < arr.length; i += 1) {
            total += arr[i];
        }
        return total / arr.length;
    }
}