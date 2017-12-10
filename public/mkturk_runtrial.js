async function runtrial(trialPackage){


// ************ Prebuffer trial assets ***************

// Fixation
await PY.bufferFixation(
    trialPackage['fixationCentroid'] , 
    trialPackage['fixationRadius'] )

// Stimulus sequence
await PlaySpace.bufferStimulusSequence(
    trialPackage['sampleImage'], 
    trialPackage['sampleOn'], 
    trialPackage['sampleOff'], 
    trialPackage['sampleRadius'], 
    trialPackage['samplePlacement'], 
    trialPackage['testImage'], 
    trialPackage['testRadius'], 
    trialPackage['testPlacement'])

// *************** Run trial *************************

// SHOW BLANK
await PlaySpace.displayBlank()

// RUN FIXATION
ActionPoller.create_action_regions(
    trialPackage['fixationPlacement'], 
    trialPackage['fixationRadius'])

var t_fixationOn = await PlaySpace.displayFixation()
var fixationOutcome = await ActionPoller.Promise_wait_until_active_response()


// RUN STIMULUS SEQUENCE
var t_SequenceTimestamps = await PlaySpace.displayStimulusSequence()

ActionPoller.create_action_regions(
    trialPackage['choiceCentroids'], 
    trialPackage['choiceRadius'])

if(trialPackage['choiceTimeLimit'] > 0){
    var actionPromise = Promise.race([
                        ActionPoller.Promise_wait_until_active_response(), 
                        ActionPoller.timeout(trialPackage['choiceTimeLimit'])]) 
}
else{
    var actionPromise = ActionPoller.Promise_wait_until_active_response()
}

var actionOutcome = await actionPromise
var rewardAmount = trialPackage['choiceRewardAmounts'][actionOutcome['actionIndex']]

// Deliver reinforcement
var t_reinforcementOn = performance.now()
var p_sound = SP.play_sound('reward_sound')
var p_visual = PlaySpace.displayReward()
var p_primaryReinforcement = R.deliver_reinforcement(rewardAmount)
await Promise.all([p_primaryReinforcement, p_visual]) 
var t_reinforcementOff = performance.now()


// *************** Write down trial outcome *************************
var trialOutcome = {}
trialOutcome['return'] = rewardAmount 
trialOutcome['action'] = actionOutcome['actionIndex']
trialOutcome['responseX'] = actionOutcome['x']
trialOutcome['responseY'] = actionOutcome['y']
trialOutcome['fixationX'] = fixationOutcome['x']
trialOutcome['fixationY'] = fixationOutcome['y']
trialOutcome['i_fixationBag'] = trialPackage['i_fixationBag']
trialOutcome['i_fixationId'] = trialPackage['i_fixationId']
trialOutcome['i_sampleBag'] = trialPackage['i_sampleBag']
trialOutcome['i_sampleId'] = trialPackage['i_sampleId']
trialOutcome['i_testBag'] = trialPackage['i_testBag']
trialOutcome['i_testId'] = trialPackage['i_testId']
trialOutcome['taskNumber'] = TaskStreamer.taskNumber
trialOutcome['timestampStart'] = fixationOutcome['timestamp']
trialOutcome['timestampFixationOnset'] = 
trialOutcome['timestampFixationAcquired'] = fixationOutcome['timestamp']
trialOutcome['timestampResponse'] = actionOutcome['timestamp']
trialOutcome['timestampReinforcementOn'] = t_reinforcementOn
trialOutcome['timestampReinforcementOff'] = t_reinforcementOff
trialOutcome['trialNumberTask'] = TaskStreamer.trialNumberTask 
trialOutcome['trialNumberSession'] = TaskStreamer.trialNumberSession
trialOutcome['timestampStimulusOn'] = t_SequenceTimestamps[0]
trialOutcome['timestampStimulusOff'] = t_SequenceTimestamps[1]
trialOutcome['timestampChoiceOn'] = t_SequenceTimestamps.slice(-1)[0]
trialOutcome['reactionTime'] = Math.round(actionOutcome['timestamp'] - timestampChoiceOn)

return trialOutcome
}

