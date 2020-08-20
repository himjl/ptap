import json
import numpy as np
import xarray as xr
import turkr.mturk.manage_hit

DEFAULT_BONUS_USD_PER_REWARD = 0.0025

QUALIFICATION_IDS = {
    'IS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID':'3P3HAQ0W8GNHNPOIEDB8HR4LTP3I0P',
    'sandboxIS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID':'3X9YVAW8NUMPS8W7XHFYIZSXBXH4K5',
}

def _get_bonus_amount_for_sequence(sequence_data:dict):
    errors = []

    # Infer USD per reward
    if 'coords' not in sequence_data:
        errors.append('Could not find key "coords" in behavioral_data; found only %s'%(str(sequence_data.keys())))
        usd_per_reward = DEFAULT_BONUS_USD_PER_REWARD
    else:
        if 'usd_per_reward' not in sequence_data['coords']:
            errors.append('Could not find key "usd_per_reward" in behavioral_data; found only %s. Defaulting to %f' % (str(sequence_data['coords'].keys()), DEFAULT_BONUS_USD_PER_REWARD))
            usd_per_reward = DEFAULT_BONUS_USD_PER_REWARD
        else:
            usd_per_reward = sequence_data['coords']

            if not isinstance(usd_per_reward, float):
                errors.append('Could not identify a float usd_per_reward; got %s of dtype %s'%(str(usd_per_reward), type(usd_per_reward)))
                usd_per_reward = DEFAULT_BONUS_USD_PER_REWARD

    # Infer number of corrects
    if 'data_vars' not in sequence_data:
        errors.append('Could not find key "data_vars" in behavioral_data; found only %s' % (str(sequence_data.keys())))
    else:
        if 'perf' not in sequence_data['data_vars']:
            errors.append('Could not find key "perf" in behavioral_data["data_vars"]; found only %s. Defaulting to []' % (str(sequence_data['data_vars'].keys())))
            perf = []
        else:
            perf = sequence_data['perf']

            if not isinstance(perf, list):
                errors.append('Could not identify a list of performance outcomes; got %s of dtype %s' % (str(perf), type(perf)))
                perf = []

    # Get bonus
    bonus = np.sum(perf) * usd_per_reward
    return bonus, errors


def get_total_bonus(answer:dict):

    errors = []
    if 'data' not in answer:
        return 0, errors.append('Could not find key "data" in answer; found only keys %s'%(str(answer.keys())))

    behavioral_data = answer['data']
    # Validate answer data
    if not isinstance(behavioral_data, list):
        errors.append('Expected behavioral data to be a list, but is a %s'%(type(behavioral_data)))
        return 0, errors

    total_usd_reward = 0
    for i_sequence, sequence_data in enumerate(behavioral_data):
        if not isinstance(sequence_data, dict):
            errors.append('Sequence %d was expected to be a dict, but got%s'%(i_sequence, str(type(sequence_data))))

        cur_bonus, parse_errors = _get_bonus_amount_for_sequence(sequence_data=sequence_data)
        errors.extend(parse_errors)
        total_usd_reward += (cur_bonus)

    return total_usd_reward, errors


def extract_behavioral_data(asn):
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

    # Approve the assignment
    turkr.mturk.manage_hit.approve_assignment(assignment_id=assignment_id, client=client)
    print('(workerId:%s, assignmentId:%s): approved' % (worker_id, assignment_id))

    # Grant a dicarlo lab "previous worker" qualification
    sandbox = 'sandbox' in client.meta.endpoint_url.lower()

    if sandbox:
        qual_id = QUALIFICATION_IDS['sandboxIS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID']
    else:
        qual_id = QUALIFICATION_IDS['IS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID']

    turkr.mturk.manage_hit.grant_qualification(qualification_type_id=qual_id, worker_id=worker_id, client=client)
    print('(workerId:%s, assignmentId:%s): Granted "previous worker" qualification' % (worker_id, assignment_id))

    # Extract answer string and convert to JSON
    answer, parse_errors = extract_behavioral_data(asn)
    errors.extend(parse_errors)

    # Attempt to extract bonus amount.
    bonus_usd, bonus_parse_errors = get_total_bonus(answer)
    errors.extend(bonus_parse_errors)

    # Pay worker if a bonus was earned
    if bonus_usd > 0:
        turkr.mturk.manage_hit.grant_bonus(worker_id=worker_id, assignment_id=assignment_id, bonus_usd = bonus_usd, client=client)
        print('(workerId:%s, assignmentId:%s): Bonus $%0.2f granted' % (worker_id, assignment_id, bonus_usd))

    # Print and return any errors
    if len(errors) == 0:
        return None
    else:
        for e in errors:
            print('(workerId:%s, assignmentId:%s):'%(worker_id, assignment_id), e)
        return errors


def to_dataset(answer):

    dlist = []
    for cur in answer:
        data_vars = cur['data_vars']
        coords = cur['coords']

        # Unpack URLs
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
    ds_all = xr.concat(dlist, 'subtask_position', coords = 'all')
    ds_all['subtask_position'] = np.arange(len(answer))
    return ds_all

if __name__ == '__main__':
    import turkr.utils.io as io

    fpath = '/home/umjl/PycharmProjects/turkr/examples/assignments/3YLTXLH3DFGSTOVAX3N7WV21J2AHPY/3DBQWDE4Y78IWUXW6OE8STQWGC5N5E.json'
    asn = io.load_json(fpath)


    # Approve assignment

    # Extract answer
