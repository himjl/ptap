class BehaviorScribe{
    constructor(){

    }
    update_behavior_records(t, cto){
        t['return'].push(cto['Return'])
        t['action'].push(cto['Response_GridIndex'])
        t['responseX'].push(cto['ChoiceX'])
        t['responseY'].push(cto['ChoiceY'])
        t['fixationX'].push(cto['FixationX'])
        t['fixationY'].push(cto['FixationY'])
        //t['i_stimulusBag'].push(cto['TRIAL']['sampleBagName']) index
        //t['i_stimulusID'] cto['TRIAL']['sample_image_index']
        //t['i_choiceBags'] cto['TRIAL']['E['TestImageBagNames']']
        //t['i_choiceIDs'] cto['TRIAL']['test_image_indices']
        t['stageNumber'].push(this.state['current_stage'])
        t['timestampStart'].push(Math.round(cto['timestamp_FixationAcquired']))
        t['timestampStimulusOn'].push(Math.round(cto['frame_timestamps'][0]))
        t['timestampStimulusOff'].push(Math.round(cto['frame_timestamps'][1]))
        t['timestampChoiceOn'].push(Math.round(cto['frame_timestamps'][2]))
        t['timestampFixationOn'].push(Math.round(cto['timestamp_fixation_onset']))
        t['timestampFixationAcquired'].push(Math.round(cto['timestamp_FixationAcquired']))
        t['timestampReinforcementOn'].push(Math.round(cto['timestamp_reinforcement_on']))
        t['timestampReinforcementOff'].push(Math.round(cto['timestamp_reinforcement_off']))
        //t['trialNumberGame'] - infer from checkpoint
        t['trialNumberTask'].push(this.state['current_stage_trial_number'])
        t['trialNumberSession'].push(TRIAL_NUMBER_FROM_SESSION_START)
        t['reactionTime'].push(Math.round(cto['timestamp_Choice'] - cto['frame_timestamps'][2]))
        
        return t 
    }

    initialize_behavior_records(){
        var t = {}

        t['return'] = []
        t['action'] = []
        t['responseX'] = []
        t['responseY'] = []
        t['fixationX'] = []
        t['fixationY'] = []
        t['i_stimulusBag'] = []
        t['i_stimulusId'] = []
        t['i_testBag'] = []
        t['i_testId'] = []
        t['taskNumber'] = []
        t['timestampStart'] = []
        t['timestampStimulusOn'] = []
        t['timestampStimulusOff'] = []
        t['timestampChoiceOn'] = []
        t['timestampFixationOn'] = []
        t['timestampFixationAcquired'] = []
        t['timestampReinforcementOn'] = []
        t['timestampReinforcementOff'] = []
        t['trialNumberGame'] = []
        t['trialNumberTask'] = []
        t['trialNumberSession'] = []
        t['reactionTime'] = []
        
        return t
    }

    package_behavioral_data(){
        var dataobj = {}

        dataobj['SESSION'] = SESSION
        dataobj['PLAYSPACE'] = PLAYSPACE
        dataobj['TOUCH'] = TOUCHLOG
        dataobj['REWARDLOG'] = REWARDLOG
        dataobj['Game'] = this.Game
        dataobj['BEHAVIOR'] = this.trial_behavior
        
        // dataobj['IMAGEMETA'] = this.image_meta
        // dataobj["IMAGEBAGS"] = this.ImageBags # potentially HUGE 

        
        return dataobj
    }


}
class Checkpointer{
    constructor(DIO, agentID){
        this._agentID = agentID
        this.DIO = DIO

        this.taskstream_checkpoint_fname = this._checkpoint_namehash(agentID)
        this.taskstream_checkpoint_path = join([CHECKPOINT_DIRPATH, this.taskstream_checkpoint_fname])
        this._last_checkpoint_save = performance.now()
        this._checkpoint_save_timeout_period = CHECKPOINT_SAVE_TIMEOUT_PERIOD
        this._agentID = agentID
        this._debug_mode = true
        this._debug_taskstream_checkpoint_path = join([_debug_CHECKPOINT_DIRPATH, this.taskstream_checkpoint_fname])

    }
    async build(){
        if(this.use_checkpointing == true){
                // Try to load checkpoint from disk, if it exists      
                if(await this.DIO_checkpointing.exists(this.taskstream_checkpoint_path)){
                    var checkpoint = await this.DIO_checkpointing.read_textfile(this.taskstream_checkpoint_path)

                    checkpoint = JSON.parse(checkpoint)
                    if(checkpoint['EXPERIMENT_hash'] != this.EXPERIMENT_hash){
                        wdm('Checkpoint file on disk does not match current Game. Generating default state...')
                        this._generate_default_state() 
                        await this.save_ckpt()
                    }
                    else{
                        wdm('Successfully loaded valid checkpoint '+ this.taskstream_checkpoint_path)
                        this.state['current_stage'] = checkpoint["current_stage"]
                        this.state['current_stage_trial_number'] = checkpoint["current_stage"]
                        this.state['returns_in_stage'] = checkpoint['returns_in_stage']
                    }
                }
                else{
                    this._generate_default_state()
                    await this.save_ckpt
                }
            }
            else{
                this._generate_default_state()
                wdm('Not using checkpointing...generated default state')
            }
    }
    
    
    async save_ckpt(){
        var ckpt = {}
        ckpt['agentID'] = this._agentID
        ckpt['current_stage'] = this.state['current_stage']
        ckpt['current_stage_trial_number'] = this.state['current_stage_trial_number'] 
        ckpt['last_save_unix_timestamp'] = Math.round(performance.now() + SESSION.unixTimestampPageLoad)
        ckpt['returns_in_stage'] = this.state['returns_in_stage']
        ckpt['EXPERIMENT_hash'] = this.EXPERIMENT_hash
        var datastring = JSON.stringify(ckpt, null, 2)

        if(this._debug_mode == false){
            var savepath = this.taskstream_checkpoint_path
        }
        else{
            var savepath = this._debug_taskstream_checkpoint_path
        }

        await this.DIO.write_string(datastring, savepath)
        wdm('Wrote checkpoint file to '+savepath)
    }
    _checkpoint_namehash(agentID){
        return 'Checkpoint_'+agentID + '.ckpt'
    }

    // Write checkpoint to disk if it's been a while
    if(performance.now() - this._last_checkpoint_save > this._checkpoint_save_timeout_period){
        this.save_ckpt()
        this._last_checkpoint_save = performance.now()
        wdm('Checkpoint save called')
    }

}

function GameVerifier(GameJSON){
    if(averageReturnCriterion > 1){
        averageReturnCriterion = averageReturnCriterion / 100
        console.log('The user specified averageReturnCriterion > 1. Assuming it is a percentage...')
    }

    return GameJSONUpdated
}

class ResourceWrangler(){
    constructor(DIO){

    }

}

