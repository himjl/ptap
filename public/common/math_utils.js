class MathUtils{
    constructor() {}

    static random_choice(choices){
        var i_index = Math.floor(Math.random() * choices.length);
        return choices[i_index];
    }

    static permute(array) {
        // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array/46161940
        var currentIndex = array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }

    static mean(array) {
        let i = 0, sum = 0, len = array.length;

        while (i < len) {
            sum = sum + array[i++];
        }

        return sum / len;
    }

    static multinomial(probs){
        /*
        probs: [nchoices] Array containing possibly unnormalized probabilities for each position. Assumes these values are all nonnegative.
        returns: () an index
         */
        const nchoices = probs.length;

        // Early exit, only one choice
        if(nchoices===1){
            return 0
        }

        // Normalize probabilities
        var total_mass = 0;
        for (let i = 0; i < nchoices; i++){
            total_mass = total_mass + probs[i]
        }
        var probs_normalized = [...probs];
        for (let i = 0; i < nchoices; i++){
            probs_normalized[i] = probs_normalized[i] / total_mass;
        }

        // Calculate the "right" edge of each bin in the range [0, 1]
        var cum_probs = [];
        var cur = 0;
        for (let i = 0; i < nchoices; i++){
            cum_probs.push(cur + probs_normalized[i]);
            cur = cur+probs_normalized[i]
        }
        const sample = Math.random();
        for (let i = 0; i < nchoices; i++){
            if (sample < cum_probs[i]){
                return i
            }
        }

        return (nchoices - 1)
    }
}


// Taken from https://github.com/jacobmenick/sampling
