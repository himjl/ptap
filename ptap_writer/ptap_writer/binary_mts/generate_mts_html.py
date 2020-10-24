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

INDENT_CHARACTER = '    '

class TrialPool(object):
    def __init__(self, image_url_prefix, function_string:str):
        self.image_url_prefix = image_url_prefix
        self.function_string = function_string
        return


class DirectTuplesPool(TrialPool):
    """
    Class which expresses a set of deterministic trials
    (stimulus_url, choice0_url, choice1_url, reinforced_choice)
    """
    def __init__(
            self,
            trials:List[Dict], # list of dictionaries {'stimulus_url':str, 'choice0_url':str, 'choice1_url':str, 'rewarded_choice'}
    ):
        """
        :param category_to_stimulus_urls: {category_name: [stimulus_urls]}
        :param category_to_token_urls: {category_name: [token_urls]} or None. If None, the stimulus urls serve as their own tokens.
        """

        all_urls = set()
        url_keys = [
            'stimulus_url',
            'choice0_url',
            'choice1_url',
        ]
        for trial in trials:
            assert isinstance(trial, dict)
            assert 'rewarded_choice' in trial
            assert trial['rewarded_choice'] in [-1, 0, 1]

            for k in url_keys:
                assert k in trial, trial.keys()
                all_urls.add(trial[k] for k in )

        all_urls = sorted(list(all_urls))
        image_url_prefix = os.path.commonprefix(all_urls)

        trials_suffix = []
        for trial in trials:
            cur = {}
            for k in url_keys:
                cur[k + '_suffix'] = trial[k].split(image_url_prefix)[-1]
            cur['rewarded_choice'] = trial['rewarded_choice']
            trials_suffix.append(cur)
        # Assemble trial_pool using a JavaScript call

        # Build iterator function

        function_string = '(function* trial_generator(){\n'
        function_string += 5*INDENT_CHARACTER + 'let possible_trials=%s\n' % (json.dumps(trials_suffix))
        function_string += 5*INDENT_CHARACTER + 'while(true){\n'
        function_string += 5*INDENT_CHARACTER + 'const cur_trial=MathUtils.random_choice(possible_trials);\n'
        function_string += 5*INDENT_CHARACTER + 'const stim_suffix=cur_trial["stimulus_url_suffix"];\n'
        function_string += 5*INDENT_CHARACTER + 'const choice0_suffix=cur_trial["choice0_url_suffix"];\n'
        function_string += 5*INDENT_CHARACTER + 'const choice1_suffix=cur_trial["choice1_url_suffix"];\n'
        function_string += 5*INDENT_CHARACTER + 'const choice1_suffix=cur_trial["choice1_url_suffix"];\n'
        function_string += 5*INDENT_CHARACTER + 'const rewarded_choice=cur_trial["rewarded_choice"];\n'
        function_string += 5*INDENT_CHARACTER + "yield {'stimulus_url_suffix':stim_suffix, 'choice0_url_suffix':choice0_suffix, 'choice1_url_suffix':choice1_suffix, 'rewarded_choice':rewarded_choice}"
        function_string +='}})'
        super().__init__(image_url_prefix, function_string)
        return


class AllWayPool(TrialPool):
    """
    A pool of trials defined by a set of stimuli, and a set of tokens.
    There are no "correct" choices.
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
        function_string += 5 * INDENT_CHARACTER + 'const stim_suffixes=%s;\n' % (stim_suffixes_string)
        function_string += 5 * INDENT_CHARACTER + 'let token_suffixes=%s;\n' % (token_suffixes)
        function_string += 5 * INDENT_CHARACTER + 'while(true){\n'
        function_string += 5 * INDENT_CHARACTER + 'const cur_stim_suffix=stim_suffixes[Math.floor(Math.random() * stim_suffixes.length)];\n'
        function_string += 5 * INDENT_CHARACTER + 'const choices=MathUtils.permute(token_suffixes);\n'
        function_string += 5 * INDENT_CHARACTER + 'const cur_c0_suffix = choices[0];\n'
        function_string += 5 * INDENT_CHARACTER + 'const cur_c1_suffix = choices[1];\n'
        function_string += 5 * INDENT_CHARACTER + "yield {'stimulus_url_suffix':cur_stim_suffix, 'choice0_url_suffix':cur_c0_suffix, 'choice1_url_suffix':cur_c1_suffix, 'rewarded_choice':-1}"
        function_string += '}})'
        super().__init__(image_url_prefix, function_string)
        return


class MatchRulePool(TrialPool):
    """
    """
    def __init__(
            self,
            category_to_stimulus_urls:dict,
            category_to_token_urls:Union[dict, type(None)],
    ):
        """
        :param category_to_stimulus_urls: {category_name: [stimulus_urls]}
        :param category_to_token_urls: {category_name: [token_urls]} or None. If None, the stimulus urls serve as their own tokens.
        """

        if category_to_token_urls is None:
            category_to_token_urls = category_to_stimulus_urls

        assert set(category_to_token_urls.keys()) == set(category_to_stimulus_urls.keys())
        categories = sorted(list(category_to_stimulus_urls.keys()))

        all_urls = set()
        for category in categories:
            assert isinstance(category, str)
            assert isinstance(category_to_stimulus_urls[category], list)
            assert isinstance(category_to_token_urls[category], list)

            for url in category_to_stimulus_urls[category] + category_to_token_urls[category]:
                all_urls.add(url)

        all_urls = sorted(list(all_urls))
        image_url_prefix = os.path.commonprefix(all_urls)
        category_to_stimulus_suffixes = {category:[url.split(image_url_prefix)[-1] for url in category_to_stimulus_urls[category]] for category in categories}
        category_to_token_suffixes = {category:[url.split(image_url_prefix)[-1] for url in category_to_token_urls[category]] for category in categories}

        # Assemble trial_pool using a JavaScript call
        # Build iterator function
        cat2stim_suffixes_string = json.dumps(category_to_stimulus_suffixes)
        cat2token_suffixes_string = json.dumps(category_to_token_suffixes)
        function_string = '(function* trial_generator(){\n'
        function_string += 5*INDENT_CHARACTER + 'let categories=%s\n' % categories
        function_string += 5*INDENT_CHARACTER + 'const cat2stim=%s;\n' % (cat2stim_suffixes_string)
        function_string += 5*INDENT_CHARACTER + 'const cat2token=%s;\n' % (cat2token_suffixes_string)
        function_string += 5*INDENT_CHARACTER + 'while(true){\n'
        function_string += 5*INDENT_CHARACTER + 'const cur_categories=MathUtils.permute(categories);\n'
        function_string += 5*INDENT_CHARACTER + 'const match_category=cur_categories[0];\n'
        function_string += 5*INDENT_CHARACTER + 'const distractor_category=cur_categories[1];\n'
        function_string += 5*INDENT_CHARACTER + 'const stim_suffix=MathUtils.random_choice(cat2stim[match_category]);\n'
        function_string += 5*INDENT_CHARACTER + 'const match_suffix=MathUtils.random_choice(cat2token[match_category]);\n'
        function_string += 5*INDENT_CHARACTER + 'const distractor_suffix=MathUtils.random_choice(cat2token[distractor_category]);\n'
        function_string += 5*INDENT_CHARACTER + "yield {'stimulus_url_suffix':stim_suffix, 'choice0_url_suffix':match_suffix, 'choice1_url_suffix':distractor_suffix, 'rewarded_choice':0}"
        function_string +='}})'
        super().__init__(image_url_prefix, function_string)
        return


class Block(object):
    def __init__(self,
                 trial_pool: TrialPool,
                 continue_perf_criterion:float,
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
                 early_exit_ntrials_criterion:Union[int, type(None)],
                 early_exit_perf_criterion:Union[float, type(None)],
                 query_string:Union[str, type(None)],
                 ):

        assert 0 <= continue_perf_criterion <= 1
        max_safety_usd = 0.4
        assert ntrials > 0
        assert isinstance(name, str)
        assert 0 <= usd_upon_block_completion < max_safety_usd
        assert 50 <= stimulus_duration_msec
        assert 0 <= reward_duration_msec <= 1000
        assert 0 <= punish_duration_msec <= 5000
        assert 500 <= choice_duration_msec <= 20000
        assert 0 <= minimal_choice_duration_msec <= choice_duration_msec
        assert 0 <= intertrial_delay_duration_msec <= 10000
        assert 0 <= post_stimulus_delay_duration_msec <= 10000

        if early_exit_ntrials_criterion is not None:
            assert 0 < early_exit_ntrials_criterion <= ntrials
            assert 0 <= early_exit_perf_criterion <= 1
        else:
            assert early_exit_perf_criterion is None
            early_exit_ntrials_criterion = ('raw', 'undefined')
            early_exit_perf_criterion = ('raw', 'undefined')
        if query_string is not None:
            assert isinstance(query_string, str)

        self.trial_pool = trial_pool
        self.info = dict(
            image_url_prefix = trial_pool.image_url_prefix,
            continue_perf_criterion = continue_perf_criterion,
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
            early_exit_ntrials_criterion = early_exit_ntrials_criterion,
            early_exit_perf_criterion = early_exit_perf_criterion,
            query_string = query_string,
        )

    def get_string(self):

        javascript_expression = 3 * INDENT_CHARACTER + '{\n'
        for k in self.info:
            if isinstance(self.info[k], str):
                val = f'"{self.info[k]}"'
            elif isinstance(self.info[k], bool):
                val = bool2jsbool(self.info[k])
            elif isinstance(self.info[k], tuple):
                tup = self.info[k]
                assert len(tup) == 2
                assert tup[0] == 'raw'
                val = self.info[k][1]
            else:
                val = self.info[k]
            javascript_expression+=(4 * INDENT_CHARACTER + f'"{k}":{val},\n')
        javascript_expression += (4*INDENT_CHARACTER + f'"trial_pool":{self.trial_pool.function_string},\n')
        javascript_expression +=3 * INDENT_CHARACTER + '}'

        return javascript_expression


class MyStandardExperimentalBlock(Block):

    """
    My standard choices for experimental parameters
    """
    def __init__(self,
                 trial_pool: TrialPool,
                 continue_perf_criterion: float,
                 early_exit_perf_criterion:Union[float, type(None)],
                 early_exit_ntrials_criterion: Union[int, type(None)],
                 ntrials,
                 name,
                 ):
        usd_per_trial = 0.002
        usd_upon_block_completion = ntrials * usd_per_trial

        super().__init__(
                trial_pool = trial_pool,
                continue_perf_criterion=continue_perf_criterion,
                ntrials=ntrials,
                name=name,
                usd_upon_block_completion=usd_upon_block_completion,
                stimulus_duration_msec=200,
                reward_duration_msec=200,
                punish_duration_msec=800,
                choice_duration_msec=5000,
                minimal_choice_duration_msec=0,
                intertrial_delay_duration_msec=100,
                post_stimulus_delay_duration_msec=100,
                early_exit_ntrials_criterion = early_exit_ntrials_criterion,
                early_exit_perf_criterion = early_exit_perf_criterion,
                query_string = '',
            )

        return


class AttentionCheckTrial(MyStandardExperimentalBlock):

    """
    A trial which asks the subject to match the stimulus to itself.
    If they are paying attention, this should be quite easy.
    """

    def __init__(self,
                 stimulus_image_url,
                 distractor_image_url,
                 ntrials,
                 name,
                 ):

        trial_pool = DirectTuplesPool(trials =
                                      [
                                          {
                                              'stimulus_url':stimulus_image_url,
                                              'choice0_url':stimulus_image_url,
                                              'choice1_url':distractor_image_url,
                                              'rewarded_choice':-1,
                                          }
                                      ]
        )

        super().__init__(
                    trial_pool = trial_pool,
                    continue_perf_criterion = 0,
                    early_exit_perf_criterion = None,
                    early_exit_ntrials_criterion = None,
                    ntrials = ntrials,
                    name = name,
        )

        return

class WarmupBlock(Block):
    """
    A set of warmup MTS trials involving two simple color stimuli.
    If the subject gets 5/5 correct, this block ends early.
    The subject has up to 30 trials to do this; otherwise, the session submits early.
    No bonus is given for completing this block.
    """
    def __init__(self):

        blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
        orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

        trial_pool=MatchRulePool(category_to_stimulus_urls={'blue': [blue], 'orange': [orange]}, category_to_token_urls=None)

        super().__init__(
            trial_pool = trial_pool,
            continue_perf_criterion = 0,
            early_exit_perf_criterion = 1,
            early_exit_ntrials_criterion = 5,
            ntrials=30,
            name='blue_orange_warmup_mts',
            usd_upon_block_completion = 0,
            stimulus_duration_msec = 200,
            reward_duration_msec = 200,
            punish_duration_msec = 1000,
            choice_duration_msec = 5000,
            minimal_choice_duration_msec = 0,
            intertrial_delay_duration_msec = 200,
            post_stimulus_delay_duration_msec = 100,
            query_string = 'Which is more similar to the first image?',
        )


class Session(object):
    def __init__(self,
                 block_sequence: List[Block],
                 ):
        assert len(block_sequence) > 0

        self.block_sequence = block_sequence

        return

    def generate_html_string(self):

        pool_sequence_string = '[\n'
        for block in self.block_sequence:
            block_string = block.get_string()
            pool_sequence_string += block_string
            pool_sequence_string += ',\n'
        pool_sequence_string += 2 * INDENT_CHARACTER + ']'

        # Load template
        html_string = utils.load_text(TEMPLATE_LOCATION)
        html_string = html_string.replace("__INSERT_POOL_SEQUENCE__", pool_sequence_string)

        # Load ptap/public/common/*.js files into a string
        javascript_common = utils.make_javascript_common_injection_string()

        # Load the task definition into a string
        javascript_task = utils.load_text(TASK_LOCATION)

        # Join the strings
        javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])
        html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)
        return html_string

if __name__ == '__main__':

    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

    warmup_block = WarmupBlock()

    block_allway = MyStandardExperimentalBlock(
        trial_pool=AllWayPool(stimulus_urls=[blue, orange], token_urls=[blue, orange]),
        continue_perf_criterion=0,
        ntrials=10,
        name='test_orange',
        early_exit_ntrials_criterion=None,
        early_exit_perf_criterion=None,
    )
    session = Session(block_sequence=[warmup_block, block_allway])
    html_string = session.generate_html_string()

    utils.save_text(string=html_string, fpath = './orange_blue_example.html')