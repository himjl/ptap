import json
import numpy as np
import xarray as xr
import turkr.mturk.manage_hit
import turkr.qualifications.qual_utils as qual_utils

DEFAULT_BONUS_USD_PER_REWARD = 0.0025

QUALIFICATION_IDS = {
    'IS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID':'3P3HAQ0W8GNHNPOIEDB8HR4LTP3I0P',
    'sandboxIS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID':'3X9YVAW8NUMPS8W7XHFYIZSXBXH4K5',
    'LOW_WARMUP_TASK':'3Y9OUGTYA7OC9QNI42VNEHLP09VJEP',
    'sandboxLOW_WARMUP_TASK': '3S62YK7QBY6O37DV3X0OHPYCNM2DQV',
}

def _get_bonus_amount_for_sequence(sequence_data:dict):
    errors = []

    """
    cur_subtask['max_bonus_usd'],
    cur_subtask['min_performance_for_bonus'],
    """
    coords = sequence_data['coords']
    max_bonus_usd = coords['max_bonus_usd']
    min_performance_for_bonus = coords['min_performance_for_bonus']

    data_vars = sequence_data['data_vars']
    perf_seq = data_vars['perf']


    average_perf = np.mean(perf_seq)

    bonus_amount_usd = max_bonus_usd / (1 - min_performance_for_bonus) * (average_perf - min_performance_for_bonus)
    bonus_amount_usd = np.max(bonus_amount_usd, 0)

    return bonus_amount_usd


def get_total_bonus(answer:dict):

    behavioral_data = answer['data']

    total_usd_reward = 0
    for i_sequence, sequence_data in enumerate(behavioral_data):

        cur_bonus = _get_bonus_amount_for_sequence(sequence_data=sequence_data)
        total_usd_reward += (cur_bonus)

    return total_usd_reward

def evaluate_warmup_behavior(answer:dict):
    """
    Ascertains whether the subject "goofed off" on the warmup task, defined as taking 60 trials to complete instead of exiting early from 9/10 rolling performance
    """

    errors = []
    if 'data' not in answer:
        errors.append('Could not find key "data" in answer; found only keys %s' % (str(answer.keys())))
        return False, errors

    behavioral_data = answer['data']
    # Validate answer data
    if not isinstance(behavioral_data, list):
        errors.append('Expected behavioral data to be a list, but is a %s'%(type(behavioral_data)))
        return False, errors

    if len(behavioral_data) == 0:
        errors.append('Did not find any behavioral data')
        behavioral_data = [{'data_vars':{'perf':[]}}]

    warmup_data = behavioral_data[0]
    if not isinstance(warmup_data, dict):
        errors.append('Warmup sequence data was expected to be a dict, but got%s'%(str(type(warmup_data))))
        perf = []

    if 'perf' not in warmup_data['data_vars']:
        errors.append('Could not find key "perf" in warmup_data["data_vars"]; found only %s. Defaulting to []' % (str(warmup_data['data_vars'].keys())))
        perf = []
    else:
        perf = warmup_data['data_vars']['perf']

        if not isinstance(perf, list):
            errors.append('Could not identify a list of performance outcomes; got %s of dtype %s' % (str(perf), type(perf)))
            perf = []
    ntrials_to_complete = len(perf)

    if (ntrials_to_complete) >= 60:
        print('Detected `goof off\' subject' )
        return True, errors

    return False, errors

def extract_answer(asn):
    parse_errors = []
    try:
        answer = asn['Answer']
        answer = answer.split('<FreeText>')[-1].split('</FreeText>')[0]
        answer = json.loads(answer)
    except Exception as e:
        parse_errors.append(str(e))
        answer = {}

    return answer, parse_errors


def assignment_post_process_function(
        client,
        asn: dict,
):
    # This function does 5 things:
    # 1) Approves the assignment in any case.
    # 2) Grants the "previous worker" qualification in any case.
    # 2) If possible, identify a valid bonus amount, and pay the worker.
    # 3) Returns any JavaScript runtime errors the worker encountered.
    # 4) Returns a list of failures from attempting to extract the answer and extract the bonus. If there are no errors, returns None instead.

    errors = []

    assignment_id = asn['AssignmentId']
    worker_id = asn['WorkerId']

    # Approve the assignment, if not already approved
    if(asn['AssignmentStatus'] != 'Approved'):
        try:
            turkr.mturk.manage_hit.approve_assignment(assignment_id=assignment_id, client=client)
            print('(workerId:%s, assignmentId:%s): approved' % (worker_id, assignment_id))
        except:
            pass

    # Grant a dicarlo lab "previous worker" qualification
    sandbox = 'sandbox' in client.meta.endpoint_url.lower()

    if sandbox:
        qual_id = QUALIFICATION_IDS['sandboxIS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID']
    else:
        qual_id = QUALIFICATION_IDS['IS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID']

    ncompleted = qual_utils.get_current_qual_value(client=client, worker_id=worker_id, qualification_type_id=qual_id)
    if ncompleted is None:
        ncompleted = 0

    # Extract answer string and convert to JSON
    answer, parse_errors = extract_answer(asn)
    errors.extend(parse_errors)

    # Attempt to extract bonus amount.
    bonus_usd = get_total_bonus(answer)

    # Pay worker if a bonus was earned
    if bonus_usd > 0:
        try:
            if turkr.mturk.manage_hit.grant_bonus(worker_id=worker_id, assignment_id=assignment_id, bonus_usd=bonus_usd, client=client):
                qual_utils.grant_qualification(client=client, worker_id=worker_id, qualification_type_id=qual_id, value=ncompleted + 1)
                print('(workerId:%s, assignmentId:%s): Marked as having performed %d tasks' % (worker_id, assignment_id, ncompleted + 1))
        except Exception as e:
            print('Failed to grant bonus: ')
            print(e)
    # Print and return any errors
    if len(errors) == 0:
        return None
    else:
        for e in errors:
            print('(workerId:%s, assignmentId:%s):'%(worker_id, assignment_id), e)
        return errors


def to_dataset(assignment_json:dict):

    answer, errors = extract_answer(assignment_json)
    answer = answer['data']

    # Attach session coords

    dlist = []
    for cur in answer:
        data_vars = cur['data_vars']
        coords = cur['coords']

        # Adjust timestamps to be in Unix time (seconds since epoch start)
        timestamp_session_start = float(coords['timestamp_session_start'])

        coords['timestamp_session_start'] = timestamp_session_start/1000
        data_vars['timestamp_start'] = (timestamp_session_start + np.array(data_vars['rel_timestamp_start']))/1000
        data_vars['timestamp_stimulus_on'] = (timestamp_session_start + np.array(data_vars['rel_timestamp_stimulus_on']))/1000
        data_vars['timestamp_stimulus_off'] = (timestamp_session_start + np.array(data_vars['rel_timestamp_stimulus_off']))/1000
        data_vars['timestamp_choices_on'] = (timestamp_session_start + np.array(data_vars['rel_timestamp_choices_on']))/1000

        del data_vars['rel_timestamp_start']
        del data_vars['rel_timestamp_stimulus_on']
        del data_vars['rel_timestamp_stimulus_off']
        del data_vars['rel_timestamp_choices_on']

        # Unpack URLs
        if 'stimulus_url_prefix' in coords:
            stimulus_url_prefix = coords['stimulus_url_prefix']
            stimulus_urls = [stimulus_url_prefix + suffix for suffix in data_vars['stimulus_url_suffix']]
            del coords['stimulus_url_prefix']
            del data_vars['stimulus_url_suffix']
            data_vars['stimulus_url'] = stimulus_urls

        # Attach trial coordinate
        ntrials = None
        for k in data_vars:
            if ntrials is not None:
                assert ntrials == len(data_vars[k]), 'Key %s has length %d, but assumed to have length %d'%(k, len(data_vars[k]), ntrials)
            ntrials = len(data_vars[k])
            data_vars[k] = (['trial_sequence'], data_vars[k])

        coords['trial_sequence'] = np.arange(ntrials)

        ds = xr.Dataset(data_vars = cur['data_vars'], coords = cur['coords'], )

        dlist.append(ds)

    if len(dlist) == 0:
        return None
    ds_all = xr.concat(dlist, 'slot', coords = 'all')
    ds_all['slot'] = np.arange(len(answer))
    ds_all = ds_all.assign_coords(worker_id = assignment_json['WorkerId'])
    ds_all = ds_all.assign_coords(assignment_id=assignment_json['AssignmentId'])
    ds_all = ds_all.assign_coords(timestamp_session_submit=assignment_json['SubmitTime'])

    session_duration_sec = (ds_all.timestamp_start.max() - ds_all.timestamp_start.min())
    ds_all = ds_all.assign_coords(session_duration_sec = session_duration_sec)

    ds_all = ds_all.rename({'trial_sequence':'trial'})

    return ds_all
