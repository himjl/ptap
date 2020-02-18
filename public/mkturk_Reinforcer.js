// Functions for delivering primary reinforcement

class MonetaryReinforcer {
    constructor(bonus_usd_per_correct) {
        this.bonus_total = 0;
        this.bonus_per_correct = bonus_usd_per_correct || 0.0007 // one extra dollar for every 1000 correct 
    }

    async deliver_reinforcement(nreward) {

        if (nreward >= 1) {
            this.bonus_total = this.bonus_total + this.bonus_per_correct;
            console.log('Running monetary bonus amount',
                Math.round(this.bonus_total * 1000) / 1000)
        }
    }
}

