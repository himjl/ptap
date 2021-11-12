from typing import Union, List
import os
import ptap_writer.utils as utils

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'same_different_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'same_different_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)

bool2jsbool = lambda b: 'true' if b else 'false'

INDENT_CHARACTER = '    '


INSTRUCTIONS_STRING = """  
    <ul>
        <li>Thank you for accepting this HIT! This is a task which will involve detecting whether two images are the same, or not. 
        <li>Two pictures will be shown to you very rapidly (one after the other).</li>
        <li><b>Your task</b> is to say whether the two pictures are <text style="color:green; font-style:oblique">EXACTLY</text> the same, or not. 
        <li>If there is <b>even a tiny change</b>, press "different". Otherwise, press "same". 
        <li>Consistently making accurate choices will <text style="color:green; font-style:oblique">increase your bonus payout</text>, but random guessing will lead to <text style="color:red; font-style:oblique">no bonus</text>.</li>
        <li>We may apply a "soft block" (using quals) for workers who choose not to follow these instructions. While this will not be reflected in your account's block rate, you may not be able to gain access to future HITs from our lab.</li>
        <li>If you encounter a bug (for example, the task freezing), please contact us and let us know. You will receive compensation for your time.
    </ul>"""


def generate_same_different_task(
        frame_info_sequence, # [{'stimulus_frame_url_sequence':[], 'stimulus_frame_duration_msec_sequence':[]}]
        ground_truth_is_same_sequence,  # [trials]: -1 (no correct choice), 0 (they are different), or 1 (they are the same)
        give_reinforcement_sequence,  # [trials]: bool (whether to provide reinforcement or not)
        reward_duration_msec, # () msec
        punish_duration_msec,
        choice_duration_msec,
        minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec,
        minimal_gt_performance_for_bonus,
        pseudo_usd_per_gt_correct,
):

    html_string = _generate_same_different_html(
        frame_info_sequence=frame_info_sequence,
        ground_truth_is_same_sequence=ground_truth_is_same_sequence,
        give_reinforcement_sequence = give_reinforcement_sequence,
        reward_duration_msec=reward_duration_msec,
        punish_duration_msec=punish_duration_msec,
        choice_duration_msec=choice_duration_msec,
        minimal_choice_duration_msec=minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec=post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec=intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec=inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec=pre_choice_lockout_delay_duration_msec,
        minimal_gt_performance_for_bonus=minimal_gt_performance_for_bonus,
        pseudo_usd_per_gt_correct=pseudo_usd_per_gt_correct,
    )
    return html_string

def _generate_same_different_html(
        frame_info_sequence,
        ground_truth_is_same_sequence,
        give_reinforcement_sequence,
        reward_duration_msec,
        punish_duration_msec,
        choice_duration_msec,
        minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec,
        minimal_gt_performance_for_bonus,
        pseudo_usd_per_gt_correct,
):
    """
    frame_info_sequence, // [{'stimulus_frame_url_sequence':[], 'stimulus_frame_duration_msec_sequence':[]}]
    """

    is_different_url = 'https://s3.amazonaws.com/samedifferentbehavior/task_assets/is_different_choice_image.png'
    is_same_url = 'https://s3.amazonaws.com/samedifferentbehavior/task_assets/is_same_choice_image.png'

    """
    Left choice is always "same"
    Right choice is always "different"
    """
    choice0_image_url_sequence = [is_same_url for _ in frame_info_sequence]
    choice1_image_url_sequence = [is_different_url for _ in frame_info_sequence]

    assert len(set(ground_truth_is_same_sequence).difference({-1, 0, 1})) == 0

    rewarded_choice_sequence = []
    ground_truth_correct_choice_sequence = []
    for i, apply_reward in enumerate(give_reinforcement_sequence):
        if apply_reward:
            assert ground_truth_is_same_sequence[i] != -1
            if ground_truth_is_same_sequence[i] == True:
                rewarded_choice_sequence.append(0)
                ground_truth_correct_choice_sequence.append(0)
            elif ground_truth_is_same_sequence[i] == False:
                rewarded_choice_sequence.append(1)
                ground_truth_correct_choice_sequence.append(1)
            else:
                raise Exception
        else:
            rewarded_choice_sequence.append(-1)

    query_string = ''

    all_urls = set()
    for frame_info in frame_info_sequence:
        frame_urls = frame_info['stimulus_frame_url_sequence']
        [all_urls.add(url) for url in frame_urls]

    for c_url in choice0_image_url_sequence + choice1_image_url_sequence:
        all_urls.add(c_url)
    all_urls = list(all_urls)

    image_url_prefix = os.path.commonprefix(all_urls)

    frame_info_sequence_suffix_form = []
    for i_trial, trial_frame_info in enumerate(frame_info_sequence):
        frame_urls = trial_frame_info['stimulus_frame_url_sequence']
        frame_durations = trial_frame_info['stimulus_frame_duration_msec_sequence']

        assert len(frame_urls) == len(frame_durations)
        for d in frame_durations:
            assert d > (1 / 60 * 1000)

        cur_frame_info_suffix_form = {
            'stimulus_frame_url_suffix_sequence': [url.split(image_url_prefix)[-1] for url in frame_urls],
            'stimulus_frame_duration_msec_sequence':list(frame_durations),
        }
        frame_info_sequence_suffix_form.append(dict(cur_frame_info_suffix_form))

    choice0_url_suffix_sequence = [url.split(image_url_prefix)[-1] for url in choice0_image_url_sequence]
    choice1_url_suffix_sequence = [url.split(image_url_prefix)[-1] for url in choice1_image_url_sequence]

    assert isinstance(image_url_prefix, str)
    sequence_vars = [
        frame_info_sequence_suffix_form,
        choice0_url_suffix_sequence,
        choice1_url_suffix_sequence,
        rewarded_choice_sequence,
        ground_truth_correct_choice_sequence,
    ]

    lengths = [len(var) for var in sequence_vars]
    assert len(set(lengths)) == 1, lengths
    ntrials = lengths[0]
    assert ntrials > 0

    positive_msec_scalars = [
        reward_duration_msec,
        punish_duration_msec,
        choice_duration_msec,
        minimal_choice_duration_msec,
        post_stimulus_delay_duration_msec,
        intertrial_delay_duration_msec,
        inter_choice_presentation_delay_msec,
        pre_choice_lockout_delay_duration_msec,
    ]

    for scalar in positive_msec_scalars:
        assert scalar >= 0


    max_safety = 0.02
    assert 0 <= minimal_gt_performance_for_bonus < 1
    assert 0 <= pseudo_usd_per_gt_correct < max_safety
    assert isinstance(pseudo_usd_per_gt_correct, float)
    assert isinstance(query_string, str)

    trial_info = dict(
                image_url_prefix=image_url_prefix,
                frame_info_sequence=frame_info_sequence_suffix_form,
                ground_truth_correct_choice_sequence=ground_truth_correct_choice_sequence,
                choice0_url_suffix_sequence=choice0_url_suffix_sequence,
                choice1_url_suffix_sequence=choice1_url_suffix_sequence,
                rewarded_choice_sequence=rewarded_choice_sequence,
                reward_duration_msec=reward_duration_msec,
                punish_duration_msec=punish_duration_msec,
                choice_duration_msec=choice_duration_msec,
                minimal_choice_duration_msec=minimal_choice_duration_msec,
                post_stimulus_delay_duration_msec=post_stimulus_delay_duration_msec,
                intertrial_delay_duration_msec=intertrial_delay_duration_msec,
                inter_choice_presentation_delay_msec=inter_choice_presentation_delay_msec,
                pre_choice_lockout_delay_duration_msec=pre_choice_lockout_delay_duration_msec,
                minimal_gt_performance_for_bonus=minimal_gt_performance_for_bonus,
                pseudo_usd_per_gt_correct=pseudo_usd_per_gt_correct,
                query_string=query_string,
    )

    """
    Generate HTML
    """

    javascript_expression = 3 * INDENT_CHARACTER + '{\n'
    for k in trial_info:
        cur_val = trial_info[k]
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
    html_string = html_string.replace("__INSERT_TRIAL_SEQUENCE_HERE__", javascript_expression )

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
