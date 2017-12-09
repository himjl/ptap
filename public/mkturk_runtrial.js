async function runtrial(){

var trialPackage = await TaskStreamer.get_trial()

// ************ Prebuffer trial assets ***************

// Fixation
var fixationPlacement = trialPackage['fixationPlacement'] || [0.5, 0.2] 
var fixationScale = TRIAL['fixationScale'] || 0.3
await PY.bufferFixation(fixationPlacement, fixationScale)

// Stimulus sequence
var frameImages = trialPackage['frameImages']
var frameScales = trialPackage['frameScale']
var framePlacements = trialPackage['framePlacements']
var frameDurations = trialPackage['frameDurations']

await PlaySpace.bufferSequence(
    "stimulus_sequence", 
    frameImages, 
    frameScales, 
    framePlacements, 
    frameDurations)

// *************** Run trial *************************

// SHOW BLANK
await PlaySpace.displayBlank()

// FIXATION
ActionPoller.create_action_regions(fixationPlacement, fixationScale)


var t_fixationOn = await PlaySpace.displayFixation()
var action = await ActionPoller.Promise_wait_until_active_response()

if (trialPackage['fixationReward']>0){
    await R.deliver_reinforcement(trialPackage['fixationReward'], 
        trialPackage['fixationRewardSoundName'], 
        trialPackage['fixationRewardVisual'])
}

// STIMULUS_SCREEN
ActionPoller.create_action_regions(
    trialPackage['choiceCentroids'], 
    trialPackage['choiceScales'])
var t_SequenceTimestamps = await PlaySpace.displaySequence("stimulus_sequence")

if(trialPackage['choiceTimeLimit'] > 0){
    var actionPromise = Promise.race([
                        ActionPoller.Promise_wait_until_active_response(), 
                        timeOut(trialPackage['choiceTimeLimit'])]) 
}
else{
    var actionPromise = ActionPoller.Promise_wait_until_active_response()
}

var action = await actionPromise
var rewardAmount = trialPackage['choiceRewardAmounts'][action]

var t_ReinforcementTimestamps = await R.deliver_reinforcement(rewardAmount)
TS.update_state(rewardAmount)


// *************** Write down data *************************


// timestamps 


return 
}

