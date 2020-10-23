"""
Generates an HTML which allows any user to run the task.
"""
import numpy as np
from tqdm import tqdm
import ptap_writer.utils as utils
from typing import List
import os
from typing import Union, Dict, List

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mts_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mts_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)

bool2jsbool = lambda b: 'true' if b else 'false'




class DeterministicBlock(object):

    def __init__(
            self,
            trial_pool: List[Dict],
            reward_duration_msec:int,
            punish_duration_msec:int,
            choice_duration_msec:int,
            minimal_choice_duration_msec:int,
            post_stimulus_delay_duration_msec:int,
            usd_per_reward:float,
            name:str,
    ):
        assert isinstance(trial_pool, list)

        all_urls = []

        for trial in trial_pool:
            assert isinstance(trial, dict)
            assert 'stimulus_url' in trial
            assert 'choice0_url' in trial
            assert 'choice1_url' in trial
            assert 'rewarded_choice' in trial
            all_urls.append(trial['stimulus_url'])
            all_urls.append(trial['choice0_url'])
            all_urls.append(trial['choice1_url'])
        url_prefix = os.path.commonprefix(all_urls)

        return

    def generate_javascript_string(self):
        return [
            {
                'image_url_prefix': 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/',
                'stimulus_image_url_suffix_sequence': ['bluediamond.png', 'orangediamond.png', 'bluediamond.png', 'orangediamond.png'],
                'choice0_url_suffix_sequence': ['bluediamond.png', 'bluediamond.png', 'orangediamond.png', 'orangediamond.png'],
                'choice1_url_suffix_sequence': ['orangediamond.png', 'bluediamond.png', 'bluediamond.png', 'bluediamond.png'],
                'rewarded_choice_sequence': [-1, -1, 1, 0],
                'stimulus_duration_msec': 500,
                'reward_duration_msec': 100,
                'punish_duration_msec': 500,
                'choice_duration_msec': 5000,
                'minimal_choice_duration_msec': 3000,
                'post_stimulus_delay_duration_msec': 0,
                'usd_per_reward': 0,
                'block_name': 'test_mil',
            },
        ]


if __name__ == '__main__':
    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

    # Load template
    html_string = utils.load_text(TEMPLATE_LOCATION)

    # Load ptap/public/common/*.js files into a string
    javascript_common = utils.make_javascript_common_injection_string()

    # Load the task definition into a string
    javascript_task = utils.load_text(TASK_LOCATION)

    # Join the strings
    javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])
    html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)
    utils.save_text(string=html_string, fpath = './orange_blue_example.html')