from typing import Union, List
import os
import ptap_writer.utils as utils

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mts_deterministic_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mts_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)

bool2jsbool = lambda b: 'true' if b else 'false'

INDENT_CHARACTER = '    '


INSTRUCTIONS_STRING = """  
    <ul>
        <li>Thank you for accepting this HIT! This is a task which will involve making judgements of pictures. 
        <li>To start a trial, press the white button.
        <li>The first picture will be shown to you very briefly. Then, two choices will appear.</li>
        <li><b>Your task</b> is to say which choice is <b>more similar</b> to the first one.
        <li>Consistently making accurate choices will <text style="color:green; font-style:oblique">increase your bonus payout</text>, but random guessing will lead to <text style="color:red; font-style:oblique">no bonus</text>.</li>
        <li>We may apply a "soft block" (using quals) for workers who choose not to follow these instructions. While this will not be reflected in your account's block rate, you may not be able to gain access to future HITs from our lab.</li>
        <li>If you encounter a bug (for example, the task freezing), please contact us and let us know. You will receive compensation for your time.
    </ul>"""

def generate_binary_mts_task(
        experiment_name,
        give_feedback_sequence, # bool
        stimulus_image_url_sequence,
        choice0_image_url_sequence,
        choice1_image_url_sequence,
        i_correct_choice_sequence,  # [trials]: -1 (no correct choice), 0, or 1
        stimulus_duration_msec,  # () msec
        reward_duration_msec, # () msec
        punish_duration_msec,
        choice_duration_msec,
        minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec,
        min_gt_performance_for_bonus,
        max_bonus_usd,
        check_urls = False,
):

    if check_urls:
        raise NotImplementedError

    assert len(set(i_correct_choice_sequence).difference({-1, 0, 1})) == 0
    assert isinstance(experiment_name, str)


    html_string = _generate_deterministic_mts_trial_sequence_htmls(
        stimulus_image_url_sequence=stimulus_image_url_sequence,
        choice0_url_sequence=choice0_image_url_sequence,
        choice1_url_sequence=choice1_image_url_sequence,
        give_feedback_sequence=give_feedback_sequence,
        ground_truth_choice_sequence=i_correct_choice_sequence,
        stimulus_duration_msec=stimulus_duration_msec,
        reward_duration_msec=reward_duration_msec,
        punish_duration_msec=punish_duration_msec,
        choice_duration_msec=choice_duration_msec,
        minimal_choice_duration_msec=minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec=post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec=intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec=inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec=pre_choice_lockout_delay_duration_msec,
        min_gt_performance_for_bonus=min_gt_performance_for_bonus,
        max_bonus_usd=max_bonus_usd,
        block_name=experiment_name,
        query_string='Which is more similar to the first image?',
    )
    return html_string

def _generate_deterministic_mts_trial_sequence_htmls(
        stimulus_image_url_sequence,
        choice0_url_sequence,
        choice1_url_sequence,
        give_feedback_sequence,
        ground_truth_choice_sequence,
        stimulus_duration_msec,
        reward_duration_msec,
        punish_duration_msec,
        choice_duration_msec,
        minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec,
        min_gt_performance_for_bonus,
        max_bonus_usd,
        block_name,
        query_string,
):


    """
    Core function for getting behavioral data on a series of 2AFC trials from a human subject.

    image_url_prefix, String
    image_url_suffix_sequence, [t]
    choice0_url_suffix_sequence,  [t]
    choice1_url_suffix_sequence,  [t]
    rewarded_choice_sequence, [t]. If an entry is -1, no choice is given a reward.
    ground_truth_choice_sequence, [t]. If an entry is -1, the choice does not affect the hidden performance tracker.
    stimulus_duration_msec, [t]
    reward_duration_msec, [t]. If an entry is zero, no reward feedback is given.
    punish_duration_msec, [t]. If an entry is zero, no punish feedback is given.
    choice_duration_msec, [t]. Max choice time
    minimal_choice_duration_msec, [t]. Imposes a delay until this much time has elapsed. Triggers a GUI element showing the remaining time a choice is made.
    post_stimulus_delay_duration_msec, [t]. The amount of time before the choices pop up.
    usd_upon_block_completion, Float
    size, () in pixels
    block_name, String
    checkpoint_key: String which is used as a key for LocalStorage

    Returns {'coords':coords, 'data_vars':data_vars, 'meta':meta}

    """
    sequence_vars = [
        stimulus_image_url_sequence,
        choice0_url_sequence,
        choice1_url_sequence,
        give_feedback_sequence,
        ground_truth_choice_sequence,
    ]

    lengths = [len(var) for var in sequence_vars]
    assert len(set(lengths)) == 1, lengths
    ntrials = lengths[0]
    assert ntrials > 0

    positive_msec_scalars = [
        stimulus_duration_msec,
        reward_duration_msec,
        punish_duration_msec,
        choice_duration_msec,
        minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec,
    ]

    assert stimulus_duration_msec > 1/60 * 1000

    for scalar in positive_msec_scalars:
        assert scalar >= 0


    max_safety = 0.8
    assert 0 <= min_gt_performance_for_bonus < 1
    assert 0 <= max_bonus_usd < max_safety, max_bonus_usd
    assert isinstance(max_bonus_usd, float)
    assert isinstance(block_name, str)
    assert isinstance(block_name, str)
    assert isinstance(query_string, str)


    block_info = dict(
        stimulus_url_sequence = stimulus_image_url_sequence,
        choice0_url_sequence = choice0_url_sequence,
        choice1_url_sequence = choice1_url_sequence,
        give_feedback_sequence = [bool2jsbool(v) for v in give_feedback_sequence],
        ground_truth_choice_sequence = ground_truth_choice_sequence,
        stimulus_duration_msec = stimulus_duration_msec,
        reward_duration_msec = reward_duration_msec,
        punish_duration_msec = punish_duration_msec,
        choice_duration_msec = choice_duration_msec,
        minimal_choice_duration_msec = minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec = post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec = intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec = inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec = pre_choice_lockout_delay_duration_msec,
        min_gt_performance_for_bonus = min_gt_performance_for_bonus,
        max_bonus_usd = max_bonus_usd,
        block_name = block_name,
        query_string = query_string,
    )

    """
    Generate HTML
    """

    javascript_expression = 3 * INDENT_CHARACTER + '{\n'
    for k in block_info:
        cur_val = block_info[k]
        if isinstance(cur_val, str):
            val = f'"{cur_val}"'
        elif isinstance(cur_val, bool):
            val = bool2jsbool(cur_val)
        elif isinstance(cur_val, tuple):
            tup = cur_val
            assert len(tup) == 2
            assert tup[0] == 'raw'
            val = cur_val
        else:
            val = cur_val
        javascript_expression+=(4 * INDENT_CHARACTER + f'"{k}":{val},\n')
    #javascript_expression += (4*INDENT_CHARACTER + f'"trial_pool":{self.trial_pool.function_string},\n')
    javascript_expression +=3 * INDENT_CHARACTER + '}'

    # Load template
    html_string = utils.load_text(TEMPLATE_LOCATION)
    html_string = html_string.replace("__INSERT_BLOCK_SEQUENCE_HERE__", '[' + javascript_expression + ']')

    # Inject instructions HTML
    html_string = html_string.replace("__INSERT_INSTRUCTIONS_HTML__", INSTRUCTIONS_STRING)

    # Load ptap/public/common/*.js files into a string
    javascript_common = utils.make_javascript_common_injection_string()

    # Load the task definition into a string
    javascript_task = utils.load_text(TASK_LOCATION)

    # Join the strings
    javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])
    html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)

    return html_string

if __name__ == '__main__':
    pass
