class Verifier{
    constructor(){
        this.verificationLog = {}
        this.verificationLog['verified'] = false 
        this.verificationLog['usingFailSafeHIT'] = false
        this.verificationLog['ENVIRONMENT_hash'] = undefined 
    }
    verify_session_package(sessionPackage){
        var verified = true
        var use_default_HIT = false
        
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
        this.verificationLog['GAME_PACKAGE_hash'] = JSON.stringify(sessionPackage['GAME_PACKAGE']).hashCode()
        return sessionPackage
    }
    
    on_verification_fail(){
        console.warn("Verification FAILED. Using failsafe game...")
        var sessionPackage = DEFAULT_HIT
        this.verificationLog['usingFailSafeHIT'] = true
        return sessionPackage
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
