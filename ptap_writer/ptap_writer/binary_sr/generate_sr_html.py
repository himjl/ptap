"""
Generates an HTML which allows any user to run the task.
"""
import numpy as np
from tqdm import tqdm
import ptap_writer.utils as utils
from typing import List
import os

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sr_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sr_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)


class Sequence(object):
    def __init__(self,
                 train_url_seq: list,
                 train_label_seq: list,
                 test_url_pool_0: list,
                 test_url_pool_1: list,
                 ntest_trials: int,
                 name,
                 ):
        """
        Class which checks the validity of the specified subtask arguments, and stores the arguments.

        :param train_url_seq:
        :type train_url_seq:
        :param train_label_seq:
        :type train_label_seq:
        :param test_url_pool_0:
        :type test_url_pool_0:
        :param test_url_pool_1:
        :type test_url_pool_1:
        :param ntest_trials:
        :type ntest_trials:
        """

        self._check_sequence_arg_validity(
            train_url_sequence=train_url_seq,
            train_label_sequence=train_label_seq,
            ntest_trials=ntest_trials,
            test_urls_0=test_url_pool_0,
            test_urls_1=test_url_pool_1,
            name=name,
        )

        self.train_url_seq = train_url_seq
        self.train_label_seq = train_label_seq
        self.ntest_trials = ntest_trials
        self.test_url_pool_0 = test_url_pool_0
        self.test_url_pool_1 = test_url_pool_1
        self.name = name

        return

    @staticmethod
    def _check_sequence_arg_validity(
            train_url_sequence: list,
            train_label_sequence: list,
            ntest_trials: int,
            test_urls_0: list,
            test_urls_1: list,
            name:str,
    ):
        """
        Checks input arguments for validity
        """

        assert isinstance(train_url_sequence, list)
        assert isinstance(train_label_sequence, list)
        assert isinstance(ntest_trials, int)
        assert isinstance(test_urls_0, list)
        assert isinstance(test_urls_1, list)
        assert np.mod(ntest_trials,2) == 0, f'Gave odd number of test trials (n = {ntest_trials}); requires even number'
        assert len(train_url_sequence) == len(train_label_sequence), f'Mismatch between urls (n = {len(train_url_sequence)}) and labels (n = {len(train_label_sequence)})'

        assert len(test_urls_0) >= ntest_trials / 2, f'Insufficient number of test urls 0 provided (need {ntest_trials / 2}; gave {len(test_urls_0)}'
        assert len(test_urls_1) >= ntest_trials / 2, f'Insufficient number of test urls 1 provided (need {ntest_trials / 2}; gave {len(test_urls_1)}'

        assert len(train_url_sequence) + len(test_urls_0) + len(test_urls_1) > 0, 'No trials provided?'
        assert len(set(train_label_sequence).difference({0, 1}))==0, 'Invalid labels found: %s' % (str(set(train_label_sequence)))
        assert isinstance(name, str), 'Name should be of type str; gave %s'%(type(name))

        return


def write_html(
        requested_sequence_pools: List[List[Sequence]],
        check_urls = True,
):
    """
    Generate an HTML string which, when loaded in a web browser, runs a series of 2-way, AFC image-to-button trial "sequences".

    Each sequence begins with 'train trials' (n>=0) which are given in predetermined order, followed by 'test trials' (n>=0)
    which are presented in random order.

    This function takes a list as an input. Each entry is itself a list containing some number of possible Sequences.
    For each entry in the input argument, the subject will be given one Sequence, sampled randomly among them.

    Example:

        subtask_pool = [[SequenceA, SequenceB], [Sequence1, Sequence2, Sequence3]]

    A subject will perform one of SequenceA or SequenceB, and one of Sequences[1-3].

    When a subject loads the HTML, four randomizations occur via client-side JavaScript:
        1) For each provided entry in sequence_pool, a sequence is sampled randomly, with equal probability amongst all sequences.
        2) For each sequence, the "test" trials are selected without replacement and presented in a random order.
           An equal number of trials from both categories is sampled.
        3) The order in which sequences are given to the subject are permuted.
        4) For each sequence, the mapping of the two possible labels (0 and 1) to buttons ("f" and "j" on the keyboard) is randomized.
        
    :param requested_sequence_pools: list of list of Sequences
    :return: HTML string
    """

    assert len(requested_sequence_pools) > 0

    # Perform type checks, and collect image urls
    url_pool = set()
    for entry in requested_sequence_pools:
        assert len(entry) > 0

        for seq in entry:
            assert isinstance(seq, Sequence)
            [url_pool.add(url) for url in seq.train_url_seq]
            [url_pool.add(url) for url in seq.test_url_pool_0]
            [url_pool.add(url) for url in seq.test_url_pool_1]

    # Check all URLs exist
    if check_urls:
        _check_urls_have_image(list(url_pool))

    # Assemble HTML
    js_strings = []
    for sequence_pool in requested_sequence_pools:
        sequence_pool_strings = []
        for sequence in sequence_pool:
            js_string = _generate_subtask_call_string(
                train_url_sequence=sequence.train_url_seq,
                train_label_sequence=sequence.train_label_seq,
                ntest_trials=sequence.ntest_trials,
                test_urls_0=sequence.test_url_pool_0,
                test_urls_1=sequence.test_url_pool_1,
                name=sequence.name,
            )
            sequence_pool_strings.append(js_string)

        # Randomize the order of the sequence pool expression here, in addition to the JavaScript permute function
        sequence_pool_strings = list(np.random.permutation(sequence_pool_strings))
        sequence_pool_strings = 'pick_sequence([\n     ' + ',\n     '.join(sequence_pool_strings) + '\n])'
        js_strings.append(sequence_pool_strings)

    # Randomize again
    sequence_strings = list(np.random.permutation(js_strings))

    total_string = ',\n'.join(sequence_strings)

    # Load template
    html_string = utils.load_text(TEMPLATE_LOCATION)

    # Inject subtask pool
    html_string = html_string.replace('__INSERT_SEQUENCE_POOL_HERE__', total_string)

    # Load ptap/public/common/*.js files into a string
    javascript_common = utils.make_javascript_common_injection_string()

    # Load the task definition into a string
    javascript_task = utils.load_text(TASK_LOCATION)

    # Join the strings
    javascript_injection = '\n\n\n\n'.join([javascript_common, javascript_task])

    html_string = html_string.replace('__INJECT_JAVASCRIPT_HERE__', javascript_injection)

    return html_string


def _generate_subtask_call_string(
        train_url_sequence: list,
        train_label_sequence: list,
        ntest_trials: int,
        test_urls_0: list,
        test_urls_1: list,
        name:str,
):

    # Get common prefix of the URLs
    common_prefix = os.path.commonprefix(train_url_sequence + test_urls_0 + test_urls_1)
    train_url_suffix_sequence = [s.split(common_prefix)[-1] for s in train_url_sequence]
    test_url_suffixes_0 = [s.split(common_prefix)[-1] for s in test_urls_0]
    test_url_suffixes_1 = [s.split(common_prefix)[-1] for s in test_urls_1]

    # Build string
    template_string = f'generate_sequence("{common_prefix}", {train_url_suffix_sequence}, {train_label_sequence}, {test_url_suffixes_0}, {test_url_suffixes_1}, {ntest_trials}, "{name}")'

    return template_string


def _check_urls_have_image(url_list):
    url_checked_cache = {}

    for url in tqdm(url_list, desc='checking images'):
        if url in url_checked_cache:
            continue

        url_checked_cache[url] = utils.check_url_has_image(url)

    return

