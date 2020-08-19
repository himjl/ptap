"""
Generates an HTML which allows any user to run the task.
"""
import numpy as np
from tqdm import tqdm
import ptap_writer.utils as utils
import ptap_writer.config as config

from typing import List
import os

TEMPLATE_LOCATION = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sr_task_template.html')
assert os.path.exists(TEMPLATE_LOCATION), 'Could not find template at %s' % (TEMPLATE_LOCATION)

TASK_LOCATION = os.path.join(config.PTAP_PUBLIC_LOCATION, 'tasks/sr_task.js')
assert os.path.exists(TASK_LOCATION), 'Could not find task at %s' % (TASK_LOCATION)

class Subtask():

    def __init__(self,
                 train_url_seq: list,
                 train_label_seq: list,
                 test_url_pool_0: list,
                 test_url_pool_1: list,
                 ntest_trials: int,
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

        self._check_subtask_arg_validity(
            train_url_sequence=train_url_seq,
            train_label_sequence=train_label_seq,
            ntest_trials=ntest_trials,
            test_urls_0=test_url_pool_0,
            test_urls_1=test_url_pool_1)

        self.train_url_seq = train_url_seq
        self.train_label_seq = train_label_seq
        self.ntest_trials = ntest_trials
        self.test_url_pool_0 = test_url_pool_0
        self.test_url_pool_1 = test_url_pool_1

        return

    @staticmethod
    def _check_subtask_arg_validity(
            train_url_sequence: list,
            train_label_sequence: list,
            ntest_trials: int,
            test_urls_0: list,
            test_urls_1: list,
    ):
        """
        Checks input arguments for validity and then creates a JavaScript string which will create the task
        :param train_url_sequence:
        :type train_url_sequence:
        :param train_label_sequence:
        :type train_label_sequence:
        :param ntest_trials:
        :type ntest_trials:
        :param test_urls_0:
        :type test_urls_0:
        :param test_urls_1:
        :type test_urls_1:
        :return:
        :rtype:
        """

        assert isinstance(train_url_sequence, list)
        assert isinstance(train_label_sequence, list)
        assert isinstance(ntest_trials, int)
        assert isinstance(test_urls_0, list)
        assert isinstance(test_urls_1, list)
        assert np.mod(ntest_trials,
                      2) == 0, f'Gave odd number of test trials (n = {ntest_trials}); requires even number'
        assert len(train_url_sequence) == len(
            train_label_sequence), f'Mismatch between urls (n = {len(train_url_sequence)}) and labels (n = {len(train_label_sequence)})'

        assert len(
            test_urls_0) >= ntest_trials / 2, f'Insufficient number of test urls 0 provided (need {ntest_trials / 2}; gave {len(test_urls_0)}'
        assert len(
            test_urls_1) >= ntest_trials / 2, f'Insufficient number of test urls 1 provided (need {ntest_trials / 2}; gave {len(test_urls_1)}'

        assert set(train_label_sequence) == {0, 1}, 'Invalid labels found: %s' % (str(set(train_label_sequence)))
        assert len(train_url_sequence) + len(test_urls_0) + len(test_urls_1) > 0, 'No trials provided?'

        return


def write_html(
        subtask_pool: List[Subtask],
):
    """
    Generate an HTML string which, when loaded in a web browser, runs a series of 2-way, AFC image-to-button "subtasks".

    Each subtask begins with 'train trials' (n>=0) which are given in predetermined order, followed by 'test trials' (n>=0)
    which are presented in random order.

    The experimenter supplies a list of Subtask objects, which define each subtask.

    When a subject loads the HTML, three randomizations occur via client-side JavaScript:
        1) The order of subtasks is permuted.
        2) For each subtask, any "test image" trials are selected without replacement and presented in a random order.
           An equal number of trials from both categories is sampled.
        3) For each subtask, the mapping of the two possible labels (0 and 1) to buttons ("f" and "j" on the keyboard) is randomized.

    :param subtask_pool: list of Subtask objects
    :param base_url: str. Assumed to point to the "public" folder of the ptap project, which is uploaded at some URL.
    :return: HTML string
    """

    assert len(subtask_pool) > 0

    # Get unique list of urls that will be used in this experiment
    url_pool = set()
    for subtask in subtask_pool:
        assert isinstance(subtask, Subtask)
        [url_pool.add(url) for url in subtask.train_url_seq]
        [url_pool.add(url) for url in subtask.test_url_pool_0]
        [url_pool.add(url) for url in subtask.test_url_pool_1]

    # Check all URLs exist
    _check_urls_have_image(list(url_pool))

    # Assemble HTML
    subtask_strings = []
    for subtask in subtask_pool:
        js_string = _generate_subtask_call_string(
            train_url_sequence=subtask.train_url_seq,
            train_label_sequence=subtask.train_label_seq,
            ntest_trials=subtask.ntest_trials,
            test_urls_0=subtask.test_url_pool_0,
            test_urls_1=subtask.test_url_pool_1, )
        subtask_strings.append(js_string)

    # Randomize the order of the subtask pool expression, in case the JavaScript permute function is not fully random
    subtask_strings = list(np.random.permutation(subtask_strings))

    total_subtask_string = '\n'.join(subtask_strings)

    # Load template
    html_string = utils.load_text(TEMPLATE_LOCATION)

    # Inject subtask pool
    html_string = html_string.replace('__INSERT_SUBTASK_POOL_STRING__', total_subtask_string)

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
        test_urls_1: list, ):
    template_string = f'generate_subtask_sequence({train_url_sequence}, {train_label_sequence}, {test_urls_0}, {test_urls_1}, {ntest_trials}),'

    return template_string


def _check_urls_have_image(url_list):
    url_checked_cache = {}

    for url in tqdm(url_list, desc='checking images'):
        if url in url_checked_cache:
            continue

        url_checked_cache[url] = utils.check_url_has_image(url)

    return

