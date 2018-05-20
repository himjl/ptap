class TaskStreamerClass{
    constructor(sessionPackage){
        this.sessionPackage = sessionPackage
        this.TERMINAL_STATE = false 
        

    }

    async build(){
        var sessionPackage = this.sessionPackage
        var taskSequence = sessionPackage['GAME_PACKAGE']['TASK_SEQUENCE']
        var imageBags = sessionPackage['GAME_PACKAGE']['IMAGEBAGS']

        this.IB = new ImageBuffer(S3_IO)
        this.imageBags = imageBags
        this.taskSequence = taskSequence 
        this.behavioral_data = []
        var initialState = undefined
        // Viewing information (for rendering canvases of appropriate size)
        this.TERMINAL_STATE = false 

        this.tasks = []

        this.cachedTaskURLs = []

        for (var tkNumber = 0; tkNumber < this.taskSequence.length; tkNumber ++){
            var taskURL = this.taskSequence[tkNumber]['taskURL']
            var taskName = this.taskSequence[tkNumber]['taskName']
                        
            if (this.cachedTaskURLs.indexOf(taskURL) == -1){
                await download_script(taskURL)
                this.cachedTaskURLs.push(taskURL)
            }
            

            var constructor_string = 'new '+taskName+'(this.IB, this.imageBags, this.taskSequence[tkNumber], initialState)'

            this.tasks.push(eval(constructor_string)) 
        }

        // TaskStreamer state 
        this.taskNumber = 0
        this.stepNumber = 0
        this.totalSteps = sessionPackage['GAME_PACKAGE']['GAME']['minimumSteps']
        // assumes one step to each 'trial' - todo: change
    }

    async get_step(){
        var stepPackage = await this.tasks[this.taskNumber].get_step()
        this.lastStepPackage = stepPackage 

        this.lastReward = stepPackage['reward']
        this.lastStateHash = stepPackage['stateHash']
        this.lastStepNumber = stepPackage['stepNumber']
        return stepPackage
    }



    deposit_step_outcome(stepOutcomePackage){

        this.tasks[this.taskNumber].deposit_step_outcome(stepOutcomePackage)
        this.behavioral_data[this.taskNumber] = this.tasks[this.taskNumber].behavioral_data
        // Check if current generator determined that the transition criterion was met
        this.stepNumber+=1
        if(this.tasks[this.taskNumber].can_transition()){
            this.taskNumber+=1

            // Check terminal state
            console.log(this.taskNumber)
            console.log(this.taskSequence.length)
            if(this.taskNumber >= this.taskSequence.length){
                this.TERMINAL_STATE = true
            }
        }
        else if(this.stepNumber >= this.totalSteps){
            this.TERMINAL_STATE = true
        }

        updateProgressbar(this.stepNumber/this.totalSteps*100, 'MechanicalTurk_TrialBar', '', 100, '')

    }
}




