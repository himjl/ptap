frameSeq = [frame, frame, frame]
frame = {'assets':[asset1, asset2, asset3,], 
        'locations':[loc1, loc2, loc3], # playspace units; w.r.t.  
        'durations':[dur1, dur2, dur3]}

loc = {
    'xCentroid':0,
    'xWidth':0, # playspace units
    'yCentroid':0, 
    'yWidth':0, # playspace units
}

actionRegionSeq = [regionSpec, regionSpec, regionSpec]

regionSpec = [region, region, region]
region = { # varied ways of specifying different off-the-shelf geometries
    'xCentroid':0, 
    'yCentroid':0, 
    'radius':0, 
    'xWidth':0, 
    'xHeight':0,
    'x':0,
    'y':0,
    'xEligible':[],
    'yEligible':[],
}

rewardFunc = lambda actionsTaken: 1 # Lookup table or pseudocode -> reward. Transpilation?

trialSchema = { # n distinct schemas in an n-AFC task; defined by rewardMap being independent
    'rewardFunc':rewardFuncArray, # independent sample; a1, a2, a3 ... aA -> r
    'eligibleActionRegionsSeq':actionRegionSeq, # independent sample
    'frameAssetGenerator': lambda: None # independent sample -> this sample itself can be (independent sample, dependent sample, dependent sample)
}

def frameAssetGenerator():
    # transpile
    frameSeq = []
    frame1 = fixationFrame
    frame2 = StimulusFrameSampler()
    frame3 = choiceFrameSampler(frame2) 

    return [frame1, frame2, frame3]

class environment(): 

    def __init__(trialSchemas):

        self.trialSchemas 
        return 



    def get_trialPackage(): 

        trialSchemaIdx = np.random.randint(low = 0, high = len(self.trialSchemas))
        trialSchema = self.trialSchemas[trialSchemaIdx]


        rewardFunc = trialSchema['rewardFunc']        
        eligibleActionRegionsSeq = trialSchema['eligibleActionRegionsSeq']


        framePackageSeq = []
        numSteps = len(trialSchema['framePackageSeq'])
        for step in range(numSteps): 

            for frame in trialSchema['framePackageSeq']: 
                frameAssets = []
                for assetBag in frame: 
                    asset = np.random.choice(assetBag)
                    frameAssets.append(asset)
                framePackageSeq.append(frameAssets)




        
        




def runTrial(framePackageSeq, eligibleActionRegionsSeq, rewardFunc): 

    numSteps = len(eligibleActionRegionsSeq)


    actionsTaken = []
    for i in range(numSteps): 
        # Display frames for this step
        screenDisplayer.display(framePackageSeq[i])
        
        # Receive input for this step
        actionIndex = actionPoller.poll_for(eligibleActionRegionsSeq[i]) # indexes eligibleActionRegionsSeq
        actionsTaken.append(actionIndex)

    # Calculate reward 
    reward = rewardFunc(actionsTaken)

    # Deliver reward to agent
    reinforcer.deliver_reward(reward)

    return