class TaskStreamerClass{
    constructor(sessionPackage){
        this.sessionPackage = sessionPackage
        this.TERMINAL_STATE = false 
    }

    async build(){
        var sessionPackage = this.sessionPackage
        var taskSequence = sessionPackage['GAME_PACKAGE']['TASK_SEQUENCE']
        var image_table = sessionPackage['GAME_PACKAGE']['IMAGE_TABLE']

        this.ImageBuffer = new ImageBuffer(S3_IO)
        this.image_table = image_table
        this.taskSequence = taskSequence 
        this.behavioral_data = []
        var initialState = undefined

        this.tasks = []
        this.cachedTaskURLs = []

        for (var tkNumber = 0; tkNumber < this.taskSequence.length; tkNumber ++){
            var taskURL = this.taskSequence[tkNumber]['taskURL']
            var taskName = this.taskSequence[tkNumber]['taskName']
                        
            if (this.cachedTaskURLs.indexOf(taskURL) == -1){
                await download_script(taskURL)
                this.cachedTaskURLs.push(taskURL)
            }
            
            var constructor_string = 'new '+taskName+'(this.ImageBuffer, this.image_table, this.taskSequence[tkNumber], initialState)'

            this.tasks.push(eval(constructor_string)) 
        }

        // TaskStreamer state 
        this.taskNumber = 0
        this.stepNumber = 0
        this.maxSteps = sessionPackage['GAME_PACKAGE']['GAME']['minimumSteps']
    }

    async get_step(){
        var stepPackage = await this.tasks[this.taskNumber].get_step()
        return stepPackage
    }

    deposit_step_outcome(stepOutcomePackage){
        this.stepNumber+=1

        this.tasks[this.taskNumber].deposit_step_outcome(stepOutcomePackage)
        this.behavioral_data[this.taskNumber] = this.tasks[this.taskNumber].behavioral_data

        if(this.tasks[this.taskNumber].can_transition()){
            this.taskNumber+=1

            // If out of tasks, terminate.
            if(this.taskNumber >= this.taskSequence.length){
                this.TERMINAL_STATE = true
            }
        }

        // If user reached max amount of permissible steps, terminate
        if(this.stepNumber >= this.maxSteps){
            this.TERMINAL_STATE = true
        }

        // Update progressbar
        updateProgressbar(this.stepNumber/this.maxSteps*100, 'MechanicalTurk_TrialBar', '', 100, '')
    }
}




