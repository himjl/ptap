// Functions for delivering primary reinforcement

class MonetaryReinforcer{
    constructor(bonus_usd_per_correct){
        this.bonus_total = 0
        this.bonus_per_correct = bonus_usd_per_correct || 0.0007 // one extra dollar for every 1000 correct 
    }

    async deliver_reinforcement(nreward){

        if(nreward >=1){
            this.bonus_total = this.bonus_total + this.bonus_per_correct
            console.log('Running monetary bonus amount', Math.round(this.bonus_total*1000)/1000)
          }

        SESSION['bonus_usd'] = this.bonus_total 
    }
       
}



class JuiceReinforcer{
    constructor(){

    }

    async deliver_reinforcement(nreward){

        if(nreward >=1){

            var RewardDuration = nreward * this.setJuicerRewardDuration();

            if(ble.connected == false){
              return p1
            }
            else if (ble.connected == true){
                var p2 = writepumpdurationtoBLE(Math.round(RewardDuration*1000))
                return Promise.all([p1, p2])
            }
        }
      
        console.log('Delivered ', nreward, 'rewards')
    }

    setJuicerRewardDuration(){
      var m = 0;
      var b = 0;
      if (SESSION['Pump'] == 1){
        // m = 1.13; b = 15.04;
        m = 0.99; b = 14.78;
      } //peristaltic (adafruit)
      else if (SESSION['Pump'] == 2){
        // m = 3.20; b = -15.47;
        m = 1.40; b = -58.77;
      } //submersible (tcs)
      else if (SESSION['Pump'] == 3){
        // m = 0.80; b = -3.00;
        m=0.91; b = -15;
      } //diaphragm (tcs)
      else if (SESSION['Pump'] == 4){
        m = 0.0531; b=-1.2594;
      } //piezoelectric (takasago)
      else if (SESSION['Pump'] == 5){
        m = 2.4463; b=53.6418;
      } //new diaphragm (tcs)
      else if (SESSION['Pump'] == 6){
        if (SESSION['Liquid']==1 || SESSION['Liquid']==3){
          m=0.1251; b=-0.0833; //1=water 2=water-condensed milk 3=marshmallow slurry (4/30mL)
        }
        else if (SESSION['Liquid']==2){
          m=0.0550; b=0.6951; //water-condensed milk (50/50)
        }
      } //piezoelectric 7mL/min (takasago)
      return (SESSION['RewardPer1000Trials'] - b)/m/1000;
      
    }
}