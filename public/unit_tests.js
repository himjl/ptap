async function overloadImageBuffer(){
    var batchSize = 20 // images at a time 
    var maxLoad = 500
    var imageNames = []

    for (var i in IMAGEBAGS){
        if (!IMAGEBAGS.hasOwnProperty(i)){
            continue
        }
        imageNames.push(...IMAGEBAGS[i])
    }

    console.log(imageNames.length) 

    var endIter = Math.min(maxLoad, imageNames.length)
    for(var i = 0; i<endIter; i = i+batchSize){
        console.log(i/endIter)
        var imageRequests = []
        for (var j = 0; j<batchSize; j++){
            imageRequests.push(imageNames[i+j])
            //promise_array.push(TaskStreamer.IB.get_by_name(imageNames[i+j]))

        }
        await TaskStreamer.IB.get_by_name(imageRequests)
        
    }
}

async function fillUpDataWriter(){
    DataWriter
}