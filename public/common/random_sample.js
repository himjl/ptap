function sample_with_replacement(choices, size){
    /* Sample n elements randomly, with replacement
    choices: Array
    size: number of elements to sample.
    */

    var sample = [];
    for (var i_sample = 0; i_sample < size; i_sample++){
        var i_index = Math.floor(Math.random() * choices.length);
        sample.push(choices[i_index])
    }
    return sample
}

function permute(array) {
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