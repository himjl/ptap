"""
Generates an HTML which allows any user to run the task.
"""
import numpy as np
from tqdm import tqdm
import ptap_writer.utils as utils
from typing import List
import os
from typing import Union

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sr_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sr_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)

bool2jsbool = lambda b: 'true' if b else 'false'


class URLChecker(object):

    def __init__(self):
        self.urls_checked_cache = {}
        return

    def check(self, urls:[str]):
        for url in tqdm(urls, desc='checking images'):
            if url in self.urls_checked_cache:
                continue

            self.urls_checked_cache[url] = utils.check_url_has_image(url)


def generate_block_info(
        urls: [str],
        labels: list,
        sequence_name: str,
        min_performance_for_bonus,
        max_bonus_usd,
        randomly_flip_labels:bool,
        randomly_sample_trials:bool,
        replace:bool,
        ntrials:int = None,
        catch_trial_info: dict = None,
):
    if np.mean(labels) != 0:
        print('Imbalanced labels', labels)

    if ntrials is None:
        ntrials = len(urls)

    assert ntrials > 0

    if catch_trial_info is None:
        """
        'catch_trial_info':{
            25:{
                'image_url':'test',
                'label':1,
                'flip_label_with_main_trials':false,
            },
        }
        """

        catch_trial_info = {}
    else:
        probe_trial_positions = list(catch_trial_info.keys())
        for k in probe_trial_positions:
            assert isinstance(k, int)
            info = catch_trial_info[k]
            assert 'image_url' in info
            assert 'label' in info
            assert 'flip_label_with_main_trials' in info
            assert info['label'] in {-1, 1}
            assert isinstance(info['image_url'], str)
            assert isinstance(info['flip_label_with_main_trials'], bool)

        assert np.max(probe_trial_positions) <= ntrials, probe_trial_positions
        assert 0 <= np.min(probe_trial_positions), probe_trial_positions

    assert set(labels) == {-1, 1}
    assert len(urls) == len(labels)

    SAFETY_MAX_USD_PER_TRIAL = 0.1
    usd_per_trial = max_bonus_usd / len(urls)
    if usd_per_trial > SAFETY_MAX_USD_PER_TRIAL:
        raise Exception('Are you sure? %0.2f bonus USD per trial'%(usd_per_trial))

    block_info = dict(
        randomly_flip_labels=randomly_flip_labels,
        randomly_sample_trials=randomly_sample_trials,
        image_urls=urls,
        labels=labels,
        replace=replace,
        ntrials=ntrials,
        catch_trial_info=catch_trial_info,
        stimulus_duration_msec=200,
        reward_duration_msec=50,
        punish_duration_msec=500,
        choice_duration_msec=10000,
        post_stimulus_delay_duration_msec=50,
        intertrial_delay_period_msec=50,
        max_bonus_usd=max_bonus_usd,
        min_performance_for_bonus=min_performance_for_bonus,
        sequence_name=sequence_name,
    )
    return block_info

from typing import Dict
def convert_object_to_javascript_string(object:Union[List, Dict]):
    bool2jsbool = lambda b:'true' if b else 'false'

    INDENT_CHARACTER = '    '

    if isinstance(object, list):
        javascript_expression = '[\n'
        for cur_val in object:
            if isinstance(cur_val, str):
                val = f'"{cur_val}"'
            elif isinstance(cur_val, bool):
                val = bool2jsbool(cur_val)
            elif isinstance(cur_val, (list, dict)):
                val = convert_object_to_javascript_string(cur_val)
            else:
                val = str(cur_val)

            javascript_expression += f'{INDENT_CHARACTER}{val},\n'
        javascript_expression += ']'
    elif isinstance(object, dict):
        javascript_expression = '{\n'
        for k in object:
            cur_val = object[k]
            if isinstance(cur_val, str):
                val = f'"{cur_val}"'
            elif isinstance(cur_val, bool):
                val = bool2jsbool(cur_val)
            elif isinstance(cur_val, (list, dict)):
                val = convert_object_to_javascript_string(cur_val)
            else:
                val = str(cur_val)


            if isinstance(k, str):
                key_string = f'\"{k}\"'
            else:
                key_string = str(k)
            javascript_expression+= f'{key_string}:{val},\n'
        javascript_expression += '}'
    else:
        raise Exception(str(object))

    return javascript_expression

def write_html(block_sequence, url_checker:URLChecker = None):
    # Performs checks on validity

    if url_checker is not None:
        all_urls = []
        for block in block_sequence:
            cur_urls = [block['image_url_prefix'] + u for u in block['image_url_suffix_seq']]
            all_urls.extend(cur_urls)
        url_checker.check(all_urls)

    javascript_block_sequence = convert_object_to_javascript_string(block_sequence)
    if False:

        bool2jsbool = lambda b:'true' if b else 'false'

        INDENT_CHARACTER = '    '

        javascript_block_sequence = '[\n'

        for block_info in block_sequence:
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
            javascript_expression +=3 * INDENT_CHARACTER + '},\n'
            javascript_block_sequence+=javascript_expression

        javascript_block_sequence += '\n]'

    # Load template
    html_string = utils.load_text(TEMPLATE_LOCATION)

    # Inject block sequence
    html_string = html_string.replace('__INSERT_BLOCK_INFO_SEQUENCE_HERE__', javascript_block_sequence)

    # Load ptap/public/common/*.js files into a string
    javascript_common = utils.make_javascript_common_injection_string()

    # Load the task definition into a string
    javascript_task = utils.load_text(TASK_LOCATION)

    # Join the strings
    javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])
    html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)
    return html_string


if __name__ == '__main__':

    blue_go_right = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/blue_choose_right.png'
    orange_go_left = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orange_choose_left.png'
    blue_only = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/blue_only.png'
    orange_only = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orange_only.png'

    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

    block_info = generate_block_info(
            urls= [blue_go_right, orange_go_left, blue_go_right, orange_go_left, blue_go_right, orange_go_left, blue_go_right, orange_go_left, blue_go_right, orange_go_left, ],
            labels= [1, -1,1, -1,1, -1,1, -1,1, -1, ],
            sequence_name = 'blue_orange_test',
            min_performance_for_bonus=0.5,
            max_bonus_usd = 0.01,
            randomly_flip_labels=True,
            randomly_sample_trials=False,
            replace=False,
            catch_trial_info=None,
            ntrials = None,
        )

    block_info = generate_block_info(
            urls= [blue_go_right, orange_go_left, blue_go_right, orange_go_left, blue_go_right, orange_go_left, blue_go_right, orange_go_left, blue_go_right, orange_go_left],
            labels= [1, -1,1, -1,1, -1,1, -1,1, -1, ],
            sequence_name = 'blue_orange_test',
            min_performance_for_bonus=0.5,
            max_bonus_usd = 0.01,
            randomly_flip_labels=False,
            randomly_sample_trials=True,
            replace=False,
            catch_trial_info=None,
            ntrials = 10,
        )


    block_sequence = [block_info]

    print(convert_object_to_javascript_string(block_info))


    html_string = write_html(
        block_sequence = block_sequence,
    )
    utils.save_text(string=html_string, fpath = './orange_blue_example.html')