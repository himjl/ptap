class Verifier{
    constructor(){
        this.verificationLog = {}
        this.verificationLog['verified'] = false 
        this.verificationLog['usingFailSafeHIT'] = false
        this.verificationLog['IMAGEBAGS_hash'] = undefined 
        this.verificationLog['GAME_hash'] = undefined 
        this.verificationLog['ENVIRONMENT_hash'] = undefined 
        this.verificationLog['TASK_SEQUENCE_hash'] = undefined 
    }
    verify_session_package(sessionPackage){
        var verified = true
        var use_default_HIT = false
        
        verified = this.verify_game_package(sessionPackage['GAME_PACKAGE'])
        verified = this.verify_environment(sessionPackage['ENVIRONMENT'])

        if(verified == false){
            sessionPackage = this.on_verification_fail()
        }
        if(verified == true){
            console.log("sessionPackage PASSED all tests.")
        }

        // Log .check_session_package call
        this.verificationLog['verified'] = verified

        // Hash 
        this.verificationLog['ENVIRONMENT_hash'] = JSON.stringify(sessionPackage['ENVIRONMENT']).hashCode()
        this.verificationLog['GAME_hash'] = JSON.stringify(sessionPackage['GAME_PACKAGE']['GAME']).hashCode()
        this.verificationLog['IMAGEBAGS_hash'] = JSON.stringify(sessionPackage['GAME_PACKAGE']['IMAGEBAGS']).hashCode()
        this.verificationLog['TASK_SEQUENCE_hash'] = JSON.stringify(sessionPackage['GAME_PACKAGE']['TASK_SEQUENCE']).hashCode()
        return sessionPackage
    }
    
    on_verification_fail(){
        console.warn("Verification FAILED. Using failsafe game...")
        var sessionPackage = DEFAULT_HIT
        this.verificationLog['usingFailSafeHIT'] = true
        return sessionPackage
    }

    verify_game_package(gamePackage){
        // Checks top level key presence and type
        var verified = true

        var necessary_keys = [
            'IMAGEBAGS', 
            'GAME', 
            'TASK_SEQUENCE']

        var missing_keys = this.check_key_presence(gamePackage, necessary_keys)
        if(missing_keys.length > 0){
            return false
            // perhaps harsh because GAME could be sensibly replaced 
        }

        return verified

        // TODO
        if(gamePackage['TASK_SEQUENCE'].length == 0){
            return false
        }

        // Perform a cursory check of each task that they have the correct key names
        var necessary_keys = []
        for (var k in DEFAULT_HIT['TASK_SEQUENCE'][0]){
            if(!DEFAULT_HIT['TASK_SEQUENCE'].hasOwnProperty(k)){
                continue
            }
            if(k == 'choiceMap' || k == 'rewardMap'){
                console.log('Not checking for', k)
                continue
            }
            necessary_keys.push(k)
        }

        for (var taskNumber in gamePackage['TASK_SEQUENCE']){
            var tk = gamePackage['TASK_SEQUENCE'][taskNumber]
            
            var missing_keys = this.check_key_presence(tk, necessary_keys)
            if(missing_keys.length > 0){
                console.log('Task', taskNumber,'is missing ', missing_keys)
                return false
            }

            // Check that all samplebag keys referenced in task is in IMAGEBAGS
            var missing_sampleBagNames = this.check_key_presence(gamePackage['IMAGEBAGS'], tk['sampleBagNames'])
            if(missing_sampleBagNames.length > 0 ){
                    verified = false 
                    console.log('IMAGEBAGS is missing', missing_sampleBagNames)
                }

            if(tk['choiceMap'] != undefined && tk['taskType'] == 'MTS'){
                for (var sampleBag in tk['sampleBagNames']){
                    var missing_choiceBagNames = this.check_key_presence(gamePackage['IMAGEBAGS'], tk['choiceMap'][sampleBag])
                    if(missing_choiceBagNames.length > 0 ){
                        verified = false 
                        console.log('IMAGEBAGS is missing', missing_choiceBagNames)
                    }
                }
                
            }

        }


        return verified
    }


    check_key_presence(testObject, necessaryKeyList){
        if(necessaryKeyList.constructor != Array){
            necessaryKeyList = [necessaryKeyList]
        }
        // testObject: an object
        // necessaryKeys: a list
        var missingKeys = []

        for (var i in necessaryKeyList){
            var key = necessaryKeyList[i]

            if(!testObject.hasOwnProperty(key)){
                missingKeys.push(key)
            }
        }

        return missingKeys
    }


    verify_environment(environment){
        var verified = true 
        if(environment.constructor!=Object){
            verified = false
        }
        return verified
    }
    

    get_verification_log(){
        return this.verificationLog
    }
}
