// Available globals: 
// Playspace 

class TaskClassTemplate{
    constructor(ImageBuffer, imageBags, taskParams, initialState){
        this.behavioral_data = {} 
    }

    can_transition(){
        return false
    }

    async deposit_step_outcome(stepOutcomePackage){
        // Update internal behavior
    }

    async get_step(){
        
        var frameData = {'canvasSequence':[], 'durationSequence':[]}
        var actionRegions = {'x':[], 'y':[], 'diameter':[],}
        var actionTimeoutMsec = 1000
        var reward = 0
        var soundData = {'soundData':'reward_sound'}

        var stepPackage = {
            'frameData':frameData, 
            'soundData':soundData,
            'actionRegions':actionRegions, 
            'actionTimeoutMsec':actionTimeoutMsec,
            'reward':reward, 
            }

        return stepPackage
    }

}