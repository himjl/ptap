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
        self.url_seq = url_seq
        self.label_seq = label_seq

        labelset = set(label_seq)
        assert len({0, 1}.intersection(labelset)) == len(labelset), labelset
        assert len(self.url_seq) == len(self.label_seq), (len(self.url_seq), len(self.label_seq))

        return

    def _js_call_core(self, common_url_prefix):
        url_suffix_seq = [s.split(common_url_prefix)[-1] for s in self.url_seq]

        block_string = f'SessionRandomization.instantiate_deterministic_block({url_suffix_seq}, {self.label_seq},)'
        return block_string


class RandomBlock(BlockTemplate):
    def __init__(self,
                 urls_0_pool: list,
                 urls_1_pool: list,
                 ntrials: int,
                 replace: bool,
                 balanced_categories: bool):

        self.urls_0_pool = urls_0_pool
        self.urls_1_pool = urls_1_pool
        self.ntrials = ntrials
        self.replace = replace
        self.balanced_categories = balanced_categories

        assert isinstance(replace, bool)
        assert isinstance(balanced_categories, bool)
        assert isinstance(ntrials, int)
        assert np.mod(ntrials, 2) == 0, ntrials

        if not replace:
            if not balanced_categories:
                # One class might potentially be sampled ntrials times, and if we are not replacing, there must be a sufficient # of urls
                assert len(self.urls_0_pool) >= self.ntrials
                assert len(self.urls_1_pool) >= self.ntrials
            else:
                assert len(self.urls_0_pool) >= (self.ntrials//2)
                assert len(self.urls_1_pool) >= (self.ntrials//2)

        super().__init__(all_urls = self.urls_0_pool + self.urls_1_pool)
        return

    def _js_call_core(self, common_url_prefix):
        pool_0_url_suffixes = [s.split(common_url_prefix)[-1] for s in self.urls_0_pool]
        pool_1_url_suffixes = [s.split(common_url_prefix)[-1] for s in self.urls_1_pool]

        block_string = f'SessionRandomization.instantiate_random_block({pool_0_url_suffixes}, {pool_1_url_suffixes}, {self.ntrials}, {bool2jsbool(self.replace)}, {bool2jsbool(self.balanced_categories)})'
        return block_string


class Sequence(object):
    def __init__(
            self,
            block_seq:[BlockTemplate],
            name:str,
            shuffle_label_mapping:bool,
            min_trials_criterion=None,
            min_perf_criterion=None,
            rolling_criterion=None,
                 ):
        assert isinstance(name, str)
        assert isinstance(shuffle_label_mapping, bool)

        if (min_trials_criterion is not None) or (min_perf_criterion is not None) or (rolling_criterion is not None):

            assert isinstance(min_trials_criterion, int)
            assert min_trials_criterion > 0
            assert isinstance(min_perf_criterion, (float, int))
            assert min_perf_criterion >= 0 and min_perf_criterion <=1
            assert isinstance(rolling_criterion, bool)
        else:
            min_trials_criterion = 'undefined'
            min_perf_criterion = 'undefined'
            rolling_criterion = False

        self.min_trials_criterion = min_trials_criterion
        self.min_perf_criterion = min_perf_criterion
        self.rolling_criterion = rolling_criterion

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
        trial_sequence_string = f'SessionRandomization.assemble_trial_sequence({block_sequence_string}, "{common_url_prefix}", {bool2jsbool(self.shuffle_label_mapping)}, "{self.name}", {self.min_trials_criterion}, {self.min_perf_criterion}, {bool2jsbool(self.rolling_criterion)})'

        return trial_sequence_string


class RandomlyAssignedSequence(object):
    def __init__(self,
                 possible_sequences:[Sequence],
                 ):

        self.possible_sequences = possible_sequences
        self.all_urls = [url for seq in possible_sequences for block in seq for url in block.all_urls]

    def generate_javascript_string(self):
        chosen_trial_sequence_string = f'SessionRandomization.choose_trial_sequence('
        for sequence in self.possible_sequences:
            chosen_trial_sequence_string+=sequence.generate_javascript_string()
            chosen_trial_sequence_string+=','
        chosen_trial_sequence_string+=')'

        return chosen_trial_sequence_string


class Session(object):
    def __init__(
            self,
            warmup_sequences:Union[List[Sequence], List[RandomlyAssignedSequence]],
            main_sequences:Union[List[Sequence], List[RandomlyAssignedSequence]],
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
    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

    warmup_sequences = []
    main_sequences = [
        Sequence(block_seq = [RandomBlock(urls_0_pool=[blue], urls_1_pool=[orange], ntrials = 50, replace = True, balanced_categories=False, )],
                               name = 'test_seq', shuffle_label_mapping=True, min_trials_criterion=5, min_perf_criterion=1, rolling_criterion=True)]

    sess = Session(warmup_sequences=warmup_sequences, main_sequences=main_sequences, randomize_slot_order=True)
    html_string = sess.write_html(check_urls=True)
    utils.save_text(string=html_string, fpath = './orange_blue_example.html')