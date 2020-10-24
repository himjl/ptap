
class PerformanceBuffer{
    constructor(
        mintrials_criterion,
        minperf_criterion,
        rolling,
    ) {

        /*
        Class for tracking the performance of a subject
        mintrials_criterion: Integer
        minperf_criterion: Float between 0 and 1 (inclusive)
        rolling: Boolean. If true, always looks at the past mintrials_criterion entries in the buffer. Otherwise, considers independent blocks of trials.
         */
        this.mintrials_criterion = mintrials_criterion;
        this.minperf_criterion = minperf_criterion;
        this.rolling = rolling;
        this.perf_buffer = []
    }

    check_satisfied(perf) {
        /*
        perf: 0 or 1
         */

        let criterion_met = false;
        // Add new observation
        this.perf_buffer.push(perf);
        console.log('perf_buffer', this.perf_buffer);

        // Not enough observations to test for criterion:
        if (this.perf_buffer.length < this.mintrials_criterion) {
            return false
        } else if (this.perf_buffer.length > this.mintrials_criterion) {
            // Buffer is overflowing
            const nobs = this.perf_buffer.length;
            if (this.rolling === true) {
                // Shave off only the excess
                this.perf_buffer = this.perf_buffer.slice(nobs - this.mintrials_criterion, nobs);
            } else {
                // Shave off a window of size this.mintrials_criterion to ensure an independent estimate
                this.perf_buffer = this.perf_buffer.slice(this.mintrials_criterion, nobs)
            }
        }

        let current_performance = 0;
        if (this.perf_buffer.length === this.mintrials_criterion) {
            current_performance = MathUtils.mean(this.perf_buffer);
        }

        if (current_performance >= this.minperf_criterion){
            return true
        }
        return false
    }

}