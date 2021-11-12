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

def get_total_bonus(answer: dict):
    total_bonus_usd = 0
    error = ''
    try:
        data_vars = answer['data_vars']
        coords = answer['coords']
        minimal_gt_performance_for_bonus = coords['minimal_gt_performance_for_bonus']
        pseudo_usd_per_gt_correct = coords['pseudo_usd_per_gt_correct']
        gt_perf_seq = data_vars['ground_truth_perf']
        gt_perf_seq_has_answer = [v for v in gt_perf_seq if v in [0, 1]]
        gt_nobs = len(gt_perf_seq_has_answer)
        gt_nsuccesses = np.sum(gt_perf_seq_has_answer)

        subject_perf = gt_nsuccesses / gt_nobs
        if gt_nsuccesses / gt_nobs >= minimal_gt_performance_for_bonus:
            total_bonus_usd = pseudo_usd_per_gt_correct * (gt_nsuccesses) * (
                    subject_perf - minimal_gt_performance_for_bonus) / (1 - minimal_gt_performance_for_bonus)
        else:
            total_bonus_usd = 0
    except Exception as e:
        error = str(e)
    return total_bonus_usd, error


def _extract_answer(asn):
    parse_errors = []
    try:
        answer = asn['Answer']
        answer = answer.split('<FreeText>')[-1].split('</FreeText>')[0]
        answer = json.loads(answer)['data']
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
    bonus_usd, bonus_parse_error = get_total_bonus(answer)
    errors.append(bonus_parse_error)

    if bonus_usd >= 0.01:
        try:
            bonus_granted = turkr.mturk.manage_hit.grant_bonus(worker_id=worker_id, assignment_id=assignment_id,
                                                               bonus_usd=bonus_usd, client=client)
            if bonus_granted:
                qual_utils.grant_qualification(client=client, worker_id=worker_id, qualification_type_id=qual_id,
                                               value=ncompleted + 1)
                print('(workerId:%s, assignmentId:%s): Marked as having performed %d tasks' % (
                    worker_id, assignment_id, ncompleted + 1))

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
            print('(workerId:%s, assignmentId:%s):' % (worker_id, assignment_id), e)
        return errors


def to_dataset(assignment_json: dict):
    answer, errors = _extract_answer(assignment_json)

    if 'data_vars' not in answer:
        return None
    # Attach session coords
    data_vars = answer['data_vars']
    coords = answer['coords']
    if 'ntrials_requested' in coords:
        del coords['ntrials_requested']
    # Adjust timestamps to be in Unix time (seconds since epoch start)
    timestamp_session_start = float(coords['timestamp_session_start'])

    coords['timestamp_session_start'] = timestamp_session_start / 1000
    data_vars['timestamp_start'] = (timestamp_session_start + np.array(data_vars['rel_timestamp_start'])) / 1000
    data_vars['timestamp_stimulus_on'] = (timestamp_session_start + np.array(
        data_vars['rel_timestamp_stimulus_on'])) / 1000
    data_vars['timestamp_stimulus_off'] = (timestamp_session_start + np.array(
        data_vars['rel_timestamp_stimulus_off'])) / 1000
    data_vars['timestamp_choices_on'] = (timestamp_session_start + np.array(
        data_vars['rel_timestamp_choices_on'])) / 1000

    del data_vars['rel_timestamp_start']
    del data_vars['rel_timestamp_stimulus_on']
    del data_vars['rel_timestamp_stimulus_off']
    del data_vars['rel_timestamp_choices_on']

    # Unpack URLs
    image_url_prefix = coords['url_prefix']
    choice0_urls = [str(image_url_prefix + suffix) for suffix in data_vars['choice0_url_suffix']]
    choice1_urls = [str(image_url_prefix + suffix) for suffix in data_vars['choice1_url_suffix']]

    """
    Assemble stimulus ids
    """
    stimulus_ids_suffix_form = data_vars['stimulus_id_suffix_form']
    stimulus_ids = []
    for stim_id_suffix_form in stimulus_ids_suffix_form:
        frame_ids_cur = []
        frame_ids_suffix_form = stim_id_suffix_form.split(' | ')
        for f_id_suffix_form in frame_ids_suffix_form:
            frame_image_url_suffix, frame_duration_msec = f_id_suffix_form.split(' - ')
            frame_image_url = image_url_prefix + frame_image_url_suffix
            frame_duration_msec = float(frame_duration_msec)
            if np.mod(frame_duration_msec, 1) == 0:
                frame_duration_msec = int(frame_duration_msec)

            frame_ids_cur.append(frame_image_url + ' - ' + str(frame_duration_msec))
        stimulus_id_cur = ' | '.join(frame_ids_cur)
        stimulus_ids.append(stimulus_id_cur)


    del coords['url_prefix']
    del data_vars['stimulus_id_suffix_form']
    del data_vars['choice0_url_suffix']
    del data_vars['choice1_url_suffix']

    data_vars['sequence_id'] = stimulus_ids
    data_vars['choice0_url'] = choice0_urls
    data_vars['choice1_url'] = choice1_urls

    # Attach trial coordinate
    ntrials = None
    for k in data_vars:
        if ntrials is not None:
            assert ntrials == len(data_vars[k]), 'Key %s has length %d, but assumed to have length %d' % (
                k, len(data_vars[k]), ntrials)
        ntrials = len(data_vars[k])
        data_vars[k] = (['trial'], data_vars[k])

    coords['trial'] = np.arange(ntrials)

    ds = xr.Dataset(data_vars=data_vars, coords=coords, )
    ds = ds.assign_coords(
        worker_id=assignment_json['WorkerId'],
        assignment_id=assignment_json['AssignmentId'],
        hit_id=assignment_json['HITId'],
        timestamp_session_submit=assignment_json['SubmitTime']
    )
    ds['perf'] = ds['ground_truth_perf']
    ds = ds.assign_coords(session_duration_sec = (ds.timestamp_start.values.max() - ds.timestamp_start.values.min()))

    return ds

if __name__ == '__main__':

    example_path = '/Users/mjl/PycharmProjects/same_different_behavior/sd_mturk_experiments/pilot_10_images_season0/outputs/assignments/sandbox/3ZQX1VYFTDFHFDIGFZGMUI4CE1X8OK/3W2LOLRXLCP6TBAR6IZV32EOFQ6KRK.json'
    import utilz
    assignment_json = utilz.load_json(example_path)
    ds = to_dataset(assignment_json)

    bonus = get_total_bonus(_extract_answer(assignment_json)[0])