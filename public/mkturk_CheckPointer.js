class CheckPointerClass{
    constructor(gamePackage){
        this.gamePackage = gamePackage

    }

    generate_hash(){
        var hash = JSON.stringify(this.gamePackage)
        hash = hash.hashCode()
        return hash
    }
}

class DropboxCheckPointer extends CheckPointerClass{ 

constructor(DIO, agentId, gamePackage){
    super(gamePackage)

    this.DIO = DIO
    this.agentId = agentId
    this.saveTimeoutMsec = 5000 
    this.debugMode = true
}

async build(){
    this.checkpointSavePath = join([INSTALL_SETTINGS.checkpointDirPath, 'Checkpoint_'+this.agentId+'.ckpt'])
    this.debugCheckpointSavePath = join([INSTALL_SETTINGS.debugCheckpointDirPath, 'debug_Checkpoint_'+this.agentId+'.ckpt'])

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
    this.checkpointOnLoad = JSON.parse(JSON.stringify(checkpoint))

    this.save_checkpoint()

    // Start writing out periodically
}

debug2record(){
    this.debugMode = false
    this.checkpoint = this.checkpointOnLoad
    console.log('debug2record: CheckPointer reverted to checkpoint on load.')
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

    return checkpoint
}

generate_default_checkpoint(){
    var checkpoint = {}
    checkpoint['agentId'] = this.agentId
    checkpoint['gameHash'] = this.generate_hash()
    checkpoint['taskNumber'] = 0 
    checkpoint['trialNumberTask'] = 0
    checkpoint['taskReturnHistory'] = []
    checkpoint['taskActionHistory'] = []
    checkpoint['taskBagHistory'] = []
    checkpoint['samplesSeen'] = {}
    
    return checkpoint
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
    this.checkpoint['taskBagHistory'].push(checkpointPackage['i_sampleBag'])

    if(this.checkpoint['samplesSeen'][checkpointPackage['sampleBag']] == undefined){
        this.checkpoint['samplesSeen'][checkpointPackage['sampleBag']] = []
    }
    
    this.checkpoint['samplesSeen'][checkpointPackage['sampleBag']].push(checkpointPackage['i_sampleId'])
}

async save_checkpoint(){
    this.checkpoint['lastSaveUnixTimestamp'] = (window.performance.timing.navigationStart + performance.now())/1000
    var checkpointString = JSON.stringify(this.checkpoint, null, 2)

    if(this.debugMode == true){
        var savePath = this.debugCheckpointSavePath
    }
    else{
        var savePath = this.checkpointSavePath
    }
    await this.DIO.write_string(checkpointString, savePath)
    console.log('Saved checkpoint at', savePath, 'of size', memorySizeOf(checkpointString, 1))
}

async request_checkpoint_save(){

    if(performance.now() - this.lastCheckpointSave >= this.saveTimeoutMsec){
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
get_task_bag_history(){
    return this.checkpoint['taskBagHistory']
}

get_samples_seen_history(){
    return this.checkpoint['samplesSeen']
}

}



class MechanicalTurkCheckPointer extends CheckPointerClass{ 

    constructor(gamePackage){
        super(gamePackage)

    }

    async build(){
        // Try loading checkpoint if it exists 
        //this.checkpoint = await LocalStorageIO.load_string('ptap_checkpoint')

    }

    debug2record(){
    }


    update(checkpointPackage){
    }


    async request_checkpoint_save(){
        return
    }


    get_task_number(){
      return 0
    }

    get_trial_number_task(){
      return 0
    }

    get_task_return_history(){
      return []
    }
    get_task_action_history(){
      return []
    }
    get_samples_seen_history(){
        return {}
    }

    get_task_bag_history(){
        return []
    }
}



