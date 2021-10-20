import json
import numpy as np
import xarray as xr
import turkr.mturk.manage_hit
import turkr.qualifications.qual_utils as qual_utils


QUALIFICATION_IDS = {
    'IS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID':'3P3HAQ0W8GNHNPOIEDB8HR4LTP3I0P',
    'sandboxIS_PREVIOUS_WORKER_TOKEN_QUALIFICATION_TYPEID':'3X9YVAW8NUMPS8W7XHFYIZSXBXH4K5',
    'EXCLUDE_FROM_FUTURE_MTS':'34W21CLR5RCKH3VTXIMWTPXO6JBZ4J',
    'sandboxEXCLUDE_FROM_FUTURE_MTS': '3OEFLTDVD7R2M54OLVDTPZ6I4KIG5M',
}


def get_total_bonus(answer:dict):
    total_bonus_usd = 0
    block_seq = answer['data']
    for block in block_seq:
        data_vars = block['data_vars']
        coords = block['coords']
        minimal_gt_performance_for_bonus = coords['minimal_gt_performance_for_bonus']
        pseudo_usd_per_gt_correct = coords['pseudo_usd_per_gt_correct']
        gt_perf_seq = data_vars['ground_truth_perf']
        gt_perf_seq_has_answer = [v for v in gt_perf_seq if v in [0, 1]]
        gt_nobs = len(gt_perf_seq_has_answer)
        gt_nsuccesses = np.sum(gt_perf_seq_has_answer)

        subject_perf = gt_nsuccesses / gt_nobs
        if gt_nsuccesses / gt_nobs >= minimal_gt_performance_for_bonus:
            bonus_amount = pseudo_usd_per_gt_correct * (gt_nsuccesses) * (subject_perf - minimal_gt_performance_for_bonus) / (1 - minimal_gt_performance_for_bonus)
        else:
            bonus_amount = 0
        #bonus_amount = usd_per_excess_gt_correct * (gt_nsuccesses - gt_nobs * minimal_gt_performance_for_bonus + 1)
        total_bonus_usd+=bonus_amount

    errors = []
    return total_bonus_usd, errors


def _extract_answer(asn):

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
        asn_json: dict,
):
    # This function does 5 things:
    # 1) Approves the assignment (if not already auto-approved)
    # 2) Grants the "previous worker" qualification in any case.
    # 2) If possible, identify a valid bonus amount, and pay the worker.
    # 3) Returns any JavaScript runtime errors the worker encountered.
    # 4) Returns a list of failures from attempting to extract the answer and extract the bonus. If there are no errors, returns None instead.

    errors = []

    assignment_id = asn_json['AssignmentId']
    worker_id = asn_json['WorkerId']


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
    answer, parse_errors = _extract_answer(asn_json)
    errors.extend(parse_errors)

    # Check to see whether to approve or reject the assignment
    if (asn_json['AssignmentStatus'] != 'Approved'):
        try:
            turkr.mturk.manage_hit.approve_assignment(assignment_id=assignment_id, client=client)
            print('(workerId:%s, assignmentId:%s): approved' % (worker_id, assignment_id))
        except:
            print('(workerId:%s, assignmentId:%s): auto-approval failed' % (worker_id, assignment_id))
            pass

    # Pay worker if conditions for a bonus are satisfied
    bonus_usd, bonus_parse_errors = get_total_bonus(answer)
    errors.extend(bonus_parse_errors)

    if bonus_usd >= 0.01:
        try:
            bonus_granted = turkr.mturk.manage_hit.grant_bonus(worker_id=worker_id, assignment_id=assignment_id, bonus_usd=bonus_usd, client=client)
            if bonus_granted:
                qual_utils.grant_qualification(client=client, worker_id=worker_id, qualification_type_id=qual_id, value=ncompleted + 1)
                print('(workerId:%s, assignmentId:%s): Marked as having performed %d tasks' % (worker_id, assignment_id, ncompleted + 1))

        except Exception as e:
            print('Failed to grant bonus: ')
            print(e)
    else:
        print('(workerId:%s, assignmentId:%s): no bonus earned' % (worker_id, assignment_id))

    # Print and return any errors
    if len(errors) == 0:
        return None
    else:
        for e in errors:
            print('(workerId:%s, assignmentId:%s):'%(worker_id, assignment_id), e)
        return errors

def to_dataset(assignment_json:dict):

    answer, errors = _extract_answer(assignment_json)
    answer = answer['data']

    # Attach session coords

    dlist = []
    for cur in answer:
        data_vars = cur['data_vars']
        coords = cur['coords']
        if 'ntrials_requested' in coords:
            del coords['ntrials_requested']
        # Adjust timestamps to be in Unix time (seconds since epoch start)
        timestamp_session_start = float(coords['timestamp_session_start'])
        if 'early_exit_ntrials_criterion' not in coords:
            coords['early_exit_ntrials_criterion'] = -1
        if 'early_exit_perf_criterion' not in coords:
            coords['early_exit_perf_criterion'] = - 1

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
        stimulus_url_prefix = coords['url_prefix']
        stimulus_urls = [str(stimulus_url_prefix + suffix) for suffix in data_vars['stimulus_url_suffix']]
        choice0_urls = [str(stimulus_url_prefix + suffix) for suffix in data_vars['choice0_url_suffix']]
        choice1_urls = [str(stimulus_url_prefix + suffix) for suffix in data_vars['choice1_url_suffix']]

        del coords['url_prefix']
        del data_vars['stimulus_url_suffix']
        del data_vars['choice0_url_suffix']
        del data_vars['choice1_url_suffix']

        data_vars['stimulus_url'] = stimulus_urls
        data_vars['choice0_url'] = choice0_urls
        data_vars['choice1_url'] = choice1_urls

        # Attach trial coordinate
        ntrials = None
        for k in data_vars:
            if ntrials is not None:
                assert ntrials == len(data_vars[k]), 'Key %s has length %d, but assumed to have length %d'%(k, len(data_vars[k]), ntrials)
            ntrials = len(data_vars[k])
            data_vars[k] = (['trial_block'], data_vars[k])

        coords['trial_block'] = np.arange(ntrials)

        ds = xr.Dataset(data_vars = cur['data_vars'], coords = cur['coords'], )

        dlist.append(ds)

    if len(dlist) == 0:
        return None

    ds_all = xr.concat(dlist, 'block', coords = 'all')
    ds_all['block'] = np.arange(len(answer))
    ds_all = ds_all.assign_coords(worker_id = assignment_json['WorkerId'])
    ds_all = ds_all.assign_coords(assignment_id=assignment_json['AssignmentId'])
    ds_all = ds_all.assign_coords(timestamp_session_submit=assignment_json['SubmitTime'])
    return ds_all

if __name__ == '__main__':
    import utilz
    asn_data = utilz.load_json('/home/umjl/PycharmProjects/LeeDiCarlo2020_JNeuro/behavioral_experiments/match_to_sample_2afc/pilot_experiment/data/pilot/assignments/38RHULDV9YPI9S3VF7MBBBSPKERIWR/30BXRYBRP57KZHQ5ZR9R0JNX85HHWC.json')
    answer, errors = _extract_answer(asn_data)
    ds = to_dataset(asn_data)


