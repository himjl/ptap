class DropboxCheckPointer{ 

constructor(DIO, agentID, game, taskSequence){
    this.DIO = DIO
    this.agentID = agentID
    this.game = game 
    this.taskSequence = taskSequence
    this.saveTimeoutMsec = 5000 
}

async build(){
    this.checkpointSavePath = join([INSTALL_SETTINGS.checkpointDirPath(), 'Checkpoint_'+this.agentID+'.ckpt'])

    var exists = await DIO.exists(this.checkpointSavePath)
    if(exists == true){
        try{
            var checkpoint = await DIO.read_textfile(this.checkpointSavePath) 
            var checkpoint = JSON.parse(checkpoint)
            var checkpoint = this.verify_checkpoint(checkpoint)
        }
        catch(error){
            console.log(error)
            var checkpoint = this.generate_default_checkpoint()
        }
    }
    else{
        console.log('Could not find checkpoint on disk. Creating default...')
        var checkpoint = this.generate_default_checkpoint()
    }

    this.checkpoint = checkpoint
    this.lastCheckpointSave = performance.now()
    

    this.save_checkpoint()

    // Start writing out periodically
}

verify_checkpoint(checkpoint){
    var verified = true 
    var checkpointTemplate = this.generate_default_checkpoint()

    for (var k in checkpointTemplate){
        if(!checkpointTemplate.hasOwnProperty(k)){
            continue
        }
        if (checkpoint[k] == undefined){
            verified = false
        }
    }
    if(checkpoint['gameHash'] != this.generate_hash()){
        verified = false
    }

    if(verified == false){
        console.log('Current game does not match checkpoint. Generating default... ')
        checkpoint = this.generate_default_checkpoint()
    }

    console.log(this.generate_hash())
    console.log(checkpoint['gameHash'])
    return checkpoint
}

generate_default_checkpoint(){
    var checkpoint = {}
    checkpoint['agentID'] = this.agentID
    checkpoint['gameHash'] = this.generate_hash()

    checkpoint['taskNumber'] = 0 
    checkpoint['trialNumberTask'] = 0
    checkpoint['taskReturnHistory'] = []
    checkpoint['taskActionHistory'] = []
    
    return checkpoint
}
generate_hash(){
    var hash = JSON.stringify(this.game) + JSON.stringify(this.taskSequence)
    hash = hash.hashCode()
    return hash
}

update(checkpointPackage){

    if (this.checkpoint['taskNumber'] != checkpointPackage['taskNumber']){
        this.checkpoint['taskReturnHistory'] = []
        this.checkpoint['taskActionHistory'] = []
        console.log('CheckPointer noted subject moved to new task, ', checkpointPackage['taskNumber'])
    }
    this.checkpoint['taskNumber'] = checkpointPackage['taskNumber']
    this.checkpoint['trialNumberTask'] = checkpointPackage['trialNumberTask']
    this.checkpoint['taskReturnHistory'].push(checkpointPackage['return'])
    this.checkpoint['taskActionHistory'].push(checkpointPackage['action'])
}

async save_checkpoint(){
    this.checkpoint['lastSaveUnixTimestamp'] = (window.performance.timing.navigationStart + performance.now())/1000
    var checkpointString = JSON.stringify(this.checkpoint, null, 2)
    console.log(this.checkpoint)
    await this.DIO.write_string(checkpointString, this.checkpointSavePath)
    console.log('Saved checkpoint of size', memorySizeOf(checkpointString, 1))
}

async request_checkpoint_save(){

    if(performance.now() - this.lastCheckpointSave <= this.saveTimeoutMsec){
        await this.save_checkpoint()
        this.lastCheckpointSave = performance.now()
    }

}



get_task_number(){
  return this.checkpoint['taskNumber']
}

get_trial_number_task(){
  return this.checkpoint['trialNumberTask']
}

get_task_return_history(){
  return this.checkpoint['taskReturnHistory']
}
get_task_action_history(){
  return this.checkpoint['taskActionHistory']
}
}



