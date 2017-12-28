import json 
import pandas as pd 
import numpy as np 
import os 
import urllib2

DROPBOX_ROOT = '/Users/michaellee/Dropbox (MIT)'

def uB(blurb):
    print blurb+'\nPress enter to continue.'
    raw_input()
def compile_data(behaviorDirectoryPath): 
    # Saves behavior as a pandas dataframe
    # Save gamePackage table
    filePaths = os.listdir(behaviorDirectoryPath)
    filePaths = filter(lambda s: not s.startswith('.') and (s.endswith('.txt') or s.endswith('.json')), filePaths)
    filePaths = map(lambda s: os.path.join(behaviorDirectoryPath, s), filePaths)

    #uB('Found %d files in %s.'%(len(filePaths), behaviorDirectoryPath))
    blist = []
    slist = []
    for f in filePaths: 
        with open(f) as fb: 
            d = json.load(fb)
            dfb = pd.DataFrame(d['BEHAVIOR'])
            # Unpack imagebags_mapping 
            imagebags_mapping = {} 
            
            for k in d['IMAGEBAGS_MAPPING']: 
                imagebags_mapping[int(k)] = d['IMAGEBAGS_MAPPING'][k]
                
            # Translate i_sampleBag
            dfb['sampleBag'] = [imagebags_mapping[i_s] for i_s in dfb['i_sampleBag']]
            
            # Translate i_choiceBag
            dfb['choiceBag'] = translate_ichoice_bag(dfb['i_choiceBag'], imagebags_mapping)
            
            # Translate i_id to actual id 
            loadMethod = d['BOOTSTRAP_LOG']['IMAGEBAGS']['loadMethod']
            
            
            if loadMethod == 'dropbox' or loadMethod == 'url':
                print loadMethod
                imagebagsConstructor = d['BOOTSTRAP_LOG']['IMAGEBAGS']['constructor']
                imagebags = download_imagebags(loadMethod, imagebagsConstructor)

                dfb['sampleId'] = translate_image_id(dfb['sampleBag'], dfb['i_sampleId'], imagebags)
                dfb['choiceId'] = translate_image_id(dfb['choiceBag'], dfb['i_choiceId'], imagebags)
            
            
            # Create references to gamePackage row 
            sessionID = d['SESSION'][u'unixTimestampPageLoad']
            dfb['sessionID'] = sessionID
            dfb['taskID'] = [d['GAME']['gameID']+'_stage'+str(tn) for tn in dfb['taskNumber']]
            dfb['gameID'] = d['GAME']['gameID']
            dfb['agentID'] = d['SESSION']['agentID']
            dfb['gameHash'] = d['VERIFICATION_LOG']['GAME_hash']
            dfb['imagebagsHash'] = d['VERIFICATION_LOG']['IMAGEBAGS_hash']
            dfb['taskSequenceHash'] = d['VERIFICATION_LOG']['TASK_SEQUENCE_hash']
            dfb['environmentHash'] = d['VERIFICATION_LOG']['ENVIRONMENT_hash']
            
            # Translate columns from units of (msec deltas from pageload) to unix timestamps (sec)
            timestampColumnNames = ['timestampChoiceOn',
             u'timestampFixationAcquired',
             u'timestampFixationOnset',
             u'timestampReinforcementOff',
             u'timestampReinforcementOn',
             u'timestampResponse',
             u'timestampStart',
             u'timestampStimulusOff',
             u'timestampStimulusOn',
             u'trialNumberSession',
             u'trialNumberTask']
            
            unixTimestampLoad = np.true_divide(d['SESSION']['unixTimestampPageLoad'], 1000)
            
            for tname in timestampColumnNames: 
                dfb[tname] = dfb[tname].apply(lambda t: np.true_divide(t, 1000)) + unixTimestampLoad
            
            blist.append(dfb)
            
            # Create session dataframe 
            dsession = {}
            for k in d: 
                if k == 'BEHAVIOR':
                    continue
                dsession[k] = d[k]
            slist.append(pd.DataFrame({sessionID: dsession}).transpose())
            
    df_behavior = pd.concat(blist)
    df_session = pd.concat(slist)
    return {'behavior':df_behavior, 'session':df_session}

def download_imagebags(loadMethod, imagebagsConstructor):
    # TODO: except in cases where imagebags are supplied literally to the landing page, 
    # grab the imagebag from dropbox or from the web
    
    if(loadMethod not in ['dropbox', 'url']): 
        print 'Cannot download imagebags with loadMethod of ', loadMethod
        raise NotImplementedError
    
    if loadMethod == 'dropbox':
        if(imagebagsConstructor[0] == '/'): 
            imagebagsConstructor = imagebagsConstructor[1:]
        location = os.path.join(DROPBOX_ROOT, imagebagsConstructor)
        print location
        assert os.path.exists(location)
        with open(location) as f: 
            imagebags = json.load(f)

        return imagebags 
    if loadMethod == 'url': 
        # todo: verify
        data = urllib2.urlopen(imagebagsConstructor)
        imagebags = json.load(data)
        return imagebags
    
    return
    
def translate_image_id(bag, i_id, imagebags):

    assert len(bag) == len(i_id)
    
    translated_ids = []
    for i in range(len(bag)):
        entry_bag = bag.iloc[i]
        entry_idx = i_id.iloc[i]
            
        if(type(entry_bag) != list): 
            entry_bag = [entry_bag]
        if(type(entry_idx) != list): 
            entry_idx = [entry_idx]
        
        translated_entry = []
        sorted_bags = {}
        
        for e_bag, e_idx in zip(entry_bag, entry_idx):
            if e_bag is None: 
                translated_entry.append(None)
                continue
            if e_bag not in sorted_bags: 
                sorted_bags[e_bag] = sorted(imagebags[e_bag])
            target_bag = sorted_bags[e_bag]
            translated_entry.append(target_bag[e_idx])
        
        if(len(translated_entry) == 1): 
            translated_entry = translated_entry[0]
        translated_ids.append(translated_entry)
    return translated_ids


def translate_ichoice_bag(i_choiceBag, imagebags_mapping): 
    
    choiceBag = []
    for i in i_choiceBag: 
        translated_choice = []
        if type(i) != list: 
            i = [i]
        for j in i: 
            if(j == None): 
                translated_choice.append(None)
            else: 
                translated_choice.append(imagebags_mapping[j])
        choiceBag.append(translated_choice)
    return choiceBag