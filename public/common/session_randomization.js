class RoundRobinSampler{
    /*
       Class which implements random "round robin" sampling, in which nentries indices are randomly sampled, nsamples at a time, until all entries have been covered.

       Once all entries have been sampled, the process repeats itself in another random order.

       nentries; Integer
       nsamples: Integer
       experiment_name: String
       worker_id: String
    */

    constructor(worker_id, sampler_id, nentries) {
        this.worker_id = worker_id;
        this.sampler_id = sampler_id;
        this.nentries = nentries;

        this.local_storage_key = worker_id.concat('_round_robin_sampler_', sampler_id, '_n', nentries.toString())
    }

    accept_samples(samples){
        // Encode chosen samples into LocalStorage

        // Get unique samples
        const distinct_samples = [... new Set(samples)];
        LocalStorageUtils.store_object_as_json(this.local_storage_key, distinct_samples);
    }

    propose_samples(nsamples){

        let worker_history = LocalStorageUtils.retrieve_json_object(this.local_storage_key);
        if (worker_history == null){
            worker_history = [];
        }

        if(Array.isArray(worker_history) === false){
            worker_history = [];
        }

        // Assemble sample space
        let full_sample_space = [];
        let fresh_sample_space = [];

        for (let i = 0; i < nentries; i++){
            full_sample_space.push(i);

            if(worker_history.includes(i) === false){
                fresh_sample_space.push(i);
            }
        }

        // Finish up any round-robin iterations "in progress":
        let samples = MathUtils.permute(fresh_sample_space);
        samples = samples.slice(0, nsamples);

        // Fill the remainder of any requested samples with more round-robin iterations
        const nremaining = nsamples - samples.length;

        let new_samps = [];
        let cur_generator = MathUtils.permute([... full_sample_space]);
        while(new_samps.length < nremaining){
            if(cur_generator.length === 1){
                cur_generator = MathUtils.permute([... full_sample_space]);
            }
            new_samps.push(cur_generator.shift());
        }

        samples = samples.concat(new_samps);

        return samples

    }
}

