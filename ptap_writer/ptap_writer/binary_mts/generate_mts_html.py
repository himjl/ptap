"""
Generates an HTML which allows any user to run the task.
"""
import numpy as np
from tqdm import tqdm
import ptap_writer.utils as utils
from typing import List
import os
from typing import Union, Dict, List
import json

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mts_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mts_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)

bool2jsbool = lambda b: 'true' if b else 'false'


class TrialPool(object):
    def __init__(self, image_url_prefix, function_string:str):
        self.image_url_prefix = image_url_prefix
        self.function_string = function_string
        return


class AllWayPool(TrialPool):
    """
    Non-reinforced trials.

    A pool of trials defined by a set of stimuli, and a set of tokens.
    Any given trial is given by a random stimulus choice, and 2 random tokens (selected without replacement).
    No reinforcement is given.
    """
    def __init__(
            self,
            stimulus_urls: List[str],
            token_urls: List[str],
    ):
        image_url_prefix = os.path.commonprefix(stimulus_urls + token_urls)
        stimulus_suffixes = [url.split(image_url_prefix)[-1] for url in stimulus_urls]
        token_suffixes = [url.split(image_url_prefix)[-1] for url in token_urls]

        # Assemble trial_pool using a JavaScript call
        # Build iterator function
        stim_suffixes_string = json.dumps(stimulus_suffixes)
        token_suffixes = json.dumps(token_suffixes)
        function_string = '(function* trial_generator(){\n'
        function_string +='const stim_suffixes=%s;\n'%(stim_suffixes_string)
        function_string +='let token_suffixes=%s;\n'%(token_suffixes)
        function_string +='while(true){\n'
        function_string +='const cur_stim_suffix=stim_suffixes[Math.floor(Math.random() * stim_suffixes.length)];\n'
        function_string +='const choices=MathUtils.permute(token_suffixes);\n'
        function_string += 'const cur_c0_suffix = choices[0];\n'
        function_string += 'const cur_c1_suffix = choices[1];\n'
        function_string +="yield {'stimulus_url_suffix':cur_stim_suffix, 'choice0_url_suffix':cur_c0_suffix, 'choice1_url_suffix':cur_c1_suffix, 'rewarded_choice':-1}"
        function_string +='}})'
        super().__init__(image_url_prefix, function_string)
        return


class SessionBlock(object):
    def __init__(self,
                 ntrials: int,
                 name: str,
                 usd_upon_block_completion: float,
                 stimulus_duration_msec: int,
                 reward_duration_msec: int,
                 punish_duration_msec: int,
                 choice_duration_msec: int,
                 minimal_choice_duration_msec: int,
                 intertrial_delay_duration_msec: int,
                 post_stimulus_delay_duration_msec: int,
                 ):
        max_safety = 0.4
        assert ntrials > 0
        assert isinstance(name, str)
        assert 0 <= usd_upon_block_completion < max_safety
        assert 50 <= stimulus_duration_msec
        assert 0 <= reward_duration_msec <= 1000
        assert 0 <= punish_duration_msec <= 5000
        assert 500 <= choice_duration_msec <= 20000
        assert 0 <= minimal_choice_duration_msec <= choice_duration_msec
        assert 0 <= intertrial_delay_duration_msec <= 10000
        assert 0 <= post_stimulus_delay_duration_msec <= 10000

        self.info = dict(
            usd_upon_block_completion = usd_upon_block_completion,
            ntrials= ntrials,
            stimulus_duration_msec= stimulus_duration_msec,
            reward_duration_msec= reward_duration_msec,
            punish_duration_msec= punish_duration_msec,
            choice_duration_msec= choice_duration_msec,
            minimal_choice_duration_msec = minimal_choice_duration_msec,
            intertrial_delay_duration_msec = intertrial_delay_duration_msec,
            post_stimulus_delay_duration_msec= post_stimulus_delay_duration_msec,
            block_name=name,
        )

    def get_string(self, trial_pool:TrialPool, continue_perf_criterion):
        assert 0<= continue_perf_criterion <=1

        self.info['image_url_prefix'] = trial_pool.image_url_prefix
        self.info['continue_perf_criterion'] = continue_perf_criterion

        javascript_expression = '{'
        for k in self.info:
            if isinstance(self.info[k], str):
                val = f'"{self.info[k]}"'
            elif isinstance(self.info[k], bool):
                val = bool2jsbool(self.info[k])
            else:
                val = self.info[k]
            javascript_expression+=f'"{k}":{val},\n'
        javascript_expression +=f'"trial_pool":{trial_pool.function_string},\n'
        javascript_expression +='}'

        return javascript_expression

class StandardSessionBlock(SessionBlock):
    """
    My standard choices for experimental parameters
    """
    def __init__(self,
                 ntrials,
                 name,
                 ):
        usd_per_trial = 0.002
        usd_upon_block_completion = ntrials * usd_per_trial

        super().__init__(
                ntrials=ntrials,
                name=name,
                usd_upon_block_completion=usd_upon_block_completion,
                stimulus_duration_msec = 200,
                reward_duration_msec = 50,
                punish_duration_msec = 500,
                choice_duration_msec = 5000,
                minimal_choice_duration_msec=0,
                intertrial_delay_duration_msec=100,
                post_stimulus_delay_duration_msec=0,
            )
        return


if __name__ == '__main__':

    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'
    block = StandardSessionBlock(
        ntrials = 10,
        name = 'test_orange',
    )
    pool = AllWayPool(stimulus_urls=[blue, orange], token_urls=[blue, orange])
    x = block.get_string(trial_pool = pool, continue_perf_criterion=0)

    # Load template
    html_string = utils.load_text(TEMPLATE_LOCATION)
    html_string = html_string.replace("__TEST_INSERT__", x)
    # Load ptap/public/common/*.js files into a string
    javascript_common = utils.make_javascript_common_injection_string()

    # Load the task definition into a string
    javascript_task = utils.load_text(TASK_LOCATION)

    # Join the strings
    javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])
    html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)
    utils.save_text(string=html_string, fpath = './orange_blue_example.html')