class TrialGeneratorClass{
    constructor(IB){
        this.IB = IB 

    }

    get_trial(kwargs){
        // returns a trialPackage on demand

        tP['sampleImage'] = images[0]
        tP['choiceImage'] = images.slice(1)
        
        tP['fixationXCentroid'] = kwargs['fixationXCentroid']
        tP['fixationYCentroid'] = kwargs['fixationYCentroid']
        tP['fixationDiameterDegrees'] = kwargs['fixationDiameterDegrees']
        tP['drawEyeFixationDot'] = kwargs['drawEyeFixationDot'] || false

        tP['i_sampleBag'] = sampleIdx['bag']
        tP['i_sampleId'] = sampleIdx['id']
        tP['sampleXCentroid'] = kwargs['sampleXCentroid']
        tP['sampleYCentroid'] = kwargs['sampleYCentroid'] 
        tP['sampleDiameterDegrees'] = kwargs['sampleDiameterDegrees']

        tP['i_choiceBag'] = choiceIdx['bag']
        tP['i_choiceId'] = choiceIdx['id']
        tP['choiceXCentroid'] = kwargs['choiceXCentroid']
        tP['choiceYCentroid'] = kwargs['choiceYCentroid']
        tP['choiceDiameterDegrees'] = kwargs['choiceDiameterDegrees']

        tP['actionXCentroid'] = kwargs['actionXCentroid']
        tP['actionYCentroid'] = kwargs['actionYCentroid']
        tP['actionDiameterDegrees'] = kwargs['actionDiameterDegrees']
        tP['choiceRewardMap'] = rewardMap
        tP['sampleOnMsec'] = kwargs['sampleOnMsec'] 
        tP['sampleOffMsec'] = kwargs['sampleOffMsec']
        tP['choiceTimeLimitMsec'] = kwargs['choiceTimeLimitMsec'] 
        tP['punishTimeOutMsec'] = punishTimeOutMsec
        tP['rewardTimeOutMsec'] = kwargs['rewardTimeOutMsec']


        return tP
    }

    buffer_trial(kwargs){

    }
}