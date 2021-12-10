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


class BlockTemplate(object):
    def __init__(self, all_urls):
        self.all_urls = all_urls
        return

    def js_call(self, common_url_prefix):
        """
        Returns a string which, when evaluated in JavaScript, returns a
        """

        call_string = self._js_call_core(common_url_prefix)
        assert isinstance(call_string, str)
        return call_string

    def _js_call_core(self, common_url_prefix):
        raise NotImplementedError



class DeterministicBlock(BlockTemplate):
    def __init__(self,
                 url_seq: [str],
                 label_seq: [int]
                 ):
        super().__init__(all_urls = url_seq)
        self.url_seq = list(url_seq)
        self.label_seq = list(label_seq)

        labelset = set(label_seq)
        assert len({0, 1}.intersection(labelset)) == len(labelset), labelset
        assert len(self.url_seq) == len(self.label_seq), (len(self.url_seq), len(self.label_seq))

        return


    def m(
            self,
            url_sequence:[str],
            label_sequence:list,
    ):
        """
            const cur_image_url_prefix = cur_subtask['image_url_prefix'];
            const cur_image_url_suffix_sequence = cur_subtask['image_url_suffix_seq'];
            const cur_label_sequence = cur_subtask['label_seq'];
            const cur_label_to_action = cur_subtask['label_to_action'];
            const cur_stimulus_duration_msec = cur_subtask['stimulus_duration_msec'];
            const cur_reward_duration_msec = cur_subtask['reward_duration_msec'];
            const cur_punish_duration_msec = cur_subtask['punish_duration_msec'];
            const cur_choice_duration_msec = cur_subtask['choice_duration_msec'];
            const cur_post_stimulus_delay_duration_msec = cur_subtask['post_stimulus_delay_duration_msec'];
            const cur_intertrial_delay_period_msec = cur_subtask['intertrial_delay_period_msec']
            const usd_per_reward = cur_subtask['usd_per_reward'];
            const cur_sequence_name = cur_subtask['sequence_name'];
            const cur_early_exit_criteria = cur_subtask['early_exit_criteria'];
            const cur_session_end_criteria = cur_subtask['session_end_criteria'];
        """
        assert set(label_sequence)  == {-1, 1}


        block_info = dict(
            image_url_prefix = image_url_prefix,
            image_url_suffix_seq = image_url_suffix_seq,
            label_seq = label_seq,
            stimulus_duration_msec = 200,
            reward_duration_msec = 50,
            punish_duration_msec = 800,
            choice_duration_msec = 10000,
            post_stimulus_delay_duration_msec = 200,
            intertrial_delay_period_msec = 50,
            usd_per_reward = 0.0025,
            sequence_name = sequence_name,
        )
        pass

class Sequence(object):
    def __init__(
            self,
            block_seq:[BlockTemplate],
            name:str,
            usd_per_reward:float,
            shuffle_label_mapping:bool,
            min_trials_criterion=None,
            min_perf_criterion=None,
            rolling_criterion=None,
            max_trials_for_continue=None,
                 ):
        """
        max_trials_for_continue: If the subject exceeds this number, end the session
        """
        assert isinstance(name, str)
        assert isinstance(shuffle_label_mapping, bool)
        assert isinstance(usd_per_reward, (int, float))
        assert 0 <= usd_per_reward < 0.1, f'Specified bonus of ${usd_per_reward} per reward; are you sure?'

        if (min_trials_criterion is not None) or (min_perf_criterion is not None) or (rolling_criterion is not None):

            assert isinstance(min_trials_criterion, int)
            assert min_trials_criterion > 0
            assert isinstance(min_perf_criterion, (float, int))
            assert 0 <= min_perf_criterion <= 1
            assert isinstance(rolling_criterion, bool)
        else:
            min_trials_criterion = 'undefined'
            min_perf_criterion = 'undefined'
            rolling_criterion = False
        self.usd_per_reward = usd_per_reward
        self.min_trials_criterion = min_trials_criterion
        self.min_perf_criterion = min_perf_criterion
        self.rolling_criterion = rolling_criterion

        if (max_trials_for_continue is not None):
            assert isinstance(max_trials_for_continue, int)
            assert max_trials_for_continue > 1
        else:
            max_trials_for_continue = 'undefined'

        self.max_trials_for_continue = max_trials_for_continue

        self.block_seq = block_seq
        self.shuffle_label_mapping = shuffle_label_mapping
        self.name = name
        self.all_urls = [url for block in block_seq for url in block.all_urls]
        return

    def generate_javascript_string(self):

        # Get common prefix
        all_urls = []
        for block in self.block_seq:
            all_urls.extend(block.all_urls)
        all_urls = list(set(all_urls))

        common_url_prefix = os.path.commonprefix(all_urls)

        # Assemble a string which evaluates to a JavaScript Array
        block_sequence_string = '['
        for block in self.block_seq:
            js_string = block.js_call(common_url_prefix)
            block_sequence_string+=js_string
            block_sequence_string+=','
        block_sequence_string+=']'
        trial_sequence_string = f'SessionRandomization.assemble_trial_sequence('
        trial_sequence_string+=f'{block_sequence_string},'
        """
        max_trials_for_continue,
                min_perf_for_continue,
                """
        trial_sequence_string+=f'"{common_url_prefix}", ' \
                               f'{bool2jsbool(self.shuffle_label_mapping)}, ' \
                               f'"{self.name}", ' \
                               f'{self.usd_per_reward},' \
                               f'{self.min_trials_criterion},' \
                               f'{self.min_perf_criterion},' \
                               f'{bool2jsbool(self.rolling_criterion)},' \
                               f'{self.max_trials_for_continue}'
        trial_sequence_string+=')'
        return trial_sequence_string


class Session(object):
    def __init__(
            self,
            warmup_sequences:Union[List[Sequence], ],
            main_sequences:Union[List[Sequence], ],
            randomize_slot_order:bool,
    ):
        self.warmup_sequences = warmup_sequences
        self.main_sequences = main_sequences
        self.randomize_slot_order = randomize_slot_order
        return

    def generate_javascript_string(self):
        warmup_sequences_string = '['
        for warmup_seq in self.warmup_sequences:
            warmup_sequences_string+=warmup_seq.generate_javascript_string()
            warmup_sequences_string+=','
        warmup_sequences_string+=']'

        main_sequences_string = '['
        for main_seq in self.main_sequences:
            main_sequences_string += main_seq.generate_javascript_string()
            main_sequences_string += ','
        main_sequences_string += ']'

        session_sequence_string = f'SessionRandomization.generate_session({warmup_sequences_string}, {main_sequences_string}, {bool2jsbool(self.randomize_slot_order)})'
        return session_sequence_string

    def write_html(self, check_urls=True, url_checker = None):
        # Performs checks on validity
        if check_urls:
            if url_checker is None:
                url_checker = URLChecker()
            all_urls = [url for seq in (self.warmup_sequences + self.main_sequences) for url in seq.all_urls]
            url_checker.check(all_urls)

        # Load template
        html_string = utils.load_text(TEMPLATE_LOCATION)

        # Inject subtask pool
        html_string = html_string.replace('__INSERT_SESSION_SEQUENCES_HERE__', self.generate_javascript_string())

        # Load ptap/public/common/*.js files into a string
        javascript_common = utils.make_javascript_common_injection_string()

        # Load the task definition into a string
        javascript_task = utils.load_text(TASK_LOCATION)

        # Join the strings
        javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])
        html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)
        return html_string


class URLChecker(object):

    def __init__(self):
        self.urls_checked_cache = {}
        return

    def check(self, urls:[str]):
        for url in tqdm(urls, desc='checking images'):
            if url in self.urls_checked_cache:
                continue

            self.urls_checked_cache[url] = utils.check_url_has_image(url)


if __name__ == '__main__':

    blue_go_right = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/blue_choose_right.png'
    orange_go_left = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orange_choose_left.png'
    blue_only = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/blue_only.png'
    orange_only = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orange_only.png'

    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

    warmup_sequences = []
    main_sequences = [
        Sequence(block_seq = [RandomBlock(urls_0_pool=[blue], urls_1_pool=[orange], ntrials = 50, replace = True, balanced_categories=False, )],
                               name = 'test_seq', shuffle_label_mapping=True, min_trials_criterion=5, min_perf_criterion=1, rolling_criterion=True)]

    sess = Session(warmup_sequences=warmup_sequences, main_sequences=main_sequences, randomize_slot_order=True)
    html_string = sess.write_html(check_urls=True)
    utils.save_text(string=html_string, fpath = './orange_blue_example.html')