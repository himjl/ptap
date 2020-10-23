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


class AllWayPool(object):
    """

    A pool of trials defined by a set of stimuli, and a set of tokens.
    Any given trial is given by a random stimulus choice, and 2 random tokens (selected without replacement).
    No reinforcement is given.
    """
    def __init__(
            self,
            ntrials:int,
            stimulus_urls: List[str],
            token_urls: List[str],
            name:str,
            usd_upon_block_completion:float,
            stimulus_duration_msec:int,
            reward_duration_msec:int,
            punish_duration_msec:int,
            choice_duration_msec:int,
            minimal_choice_duration_msec:int,
            intertrial_delay_duration_msec:int,
            post_stimulus_delay_duration_msec:int,
    ):

        stimulus_suffixes = [os.path.split(url)[-1] for url in stimulus_urls]
        token_suffixes = [os.path.split(url)[-1] for url in token_urls]

        self.info = dict(
            image_url_prefix=os.path.commonprefix(stimulus_urls + token_urls),
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
            continue_perf_criterion=0,
        )

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
        self.function_string = function_string
        return

    def get_string(self):

        javascript_expression = '{'
        for k in self.info:
            if isinstance(self.info[k], str):
                val = f'"{self.info[k]}"'
            elif isinstance(self.info[k], bool):
                val = bool2jsbool(self.info[k])
            else:
                val = self.info[k]
            javascript_expression+=f'"{k}":{val},\n'
        javascript_expression +=f'"trial_pool":{self.function_string},\n'
        javascript_expression +='}'

        return javascript_expression

if __name__ == '__main__':
    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'
    pool = AllWayPool(stimulus_urls=[blue, orange], token_urls=[blue, orange], name = 'test2', usd_upon_block_completion=0,)
    x = pool.get_string()

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