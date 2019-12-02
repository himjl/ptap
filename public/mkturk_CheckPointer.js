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


class MechanicalTurkCheckPointer extends CheckPointerClass{ 

    constructor(gamePackage){
        super(gamePackage)

    }

    async build(){
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



