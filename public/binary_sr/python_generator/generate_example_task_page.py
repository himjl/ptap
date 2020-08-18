"""
Generates an HTML which allows any user to run the task.
"""
from typing import Union
import numpy as np
from tqdm import tqdm
import requests

import PIL.Image
from io import BytesIO


def check_url_has_image(url: str):
    assert isinstance(url, str)
    return_vals = {}
    try:
        response = requests.get(url)
        img = np.array(PIL.Image.open(BytesIO(response.content)))
        height = img.shape[0]
        width = img.shape[1]
        nchannels = img.shape[2]
        return_vals['height'] = height
        return_vals['width'] = width
        return_vals['nchannels'] = nchannels
        return_vals['status'] = True
    except Exception as e:
        return_vals['status'] = False
        return_vals['exception'] = e
    return return_vals

def check_subtask_arg_validity(
        train_url_sequence:list,
        train_label_sequence:list,
        ntest_trials:int,
        test_urls_0:list,
        test_urls_1: list,
        check_urls:bool = False,
        url_checked_cache=None,
):
    """
    Checks input arguments for validity and then creates a JavaScript string which will create the task
    :param train_url_sequence:
    :type train_url_sequence:
    :param train_label_sequence:
    :type train_label_sequence:
    :param ntest_trials:
    :type ntest_trials:
    :param test_images:
    :type test_images:
    :param test_labels:
    :type test_labels:
    :return:
    :rtype:
    """

    assert isinstance(train_url_sequence, list)
    assert isinstance(train_label_sequence, list)
    assert isinstance(ntest_trials, int)
    assert isinstance(test_urls_0, list)
    assert isinstance(test_urls_1, list)
    assert np.mod(ntest_trials, 2) == 0, f'Gave odd number of test trials (n = {ntest_trials}); requires even number'
    assert len(train_url_sequence) == len(train_label_sequence), f'Mismatch between urls (n = {len(train_url_sequence)}) and labels (n = {len(train_label_sequence)})'

    assert len(test_urls_0) >= ntest_trials / 2, f'Insufficient number of test urls 0 provided (need {ntest_trials / 2}; gave {len(test_urls_0)}'
    assert len(test_urls_1) >= ntest_trials / 2, f'Insufficient number of test urls 1 provided (need {ntest_trials / 2}; gave {len(test_urls_1)}'

    assert set(train_label_sequence) == {0, 1}, 'Invalid labels found: %s'%(str(set(train_label_sequence)))
    assert len(train_url_sequence) + len(test_urls_0) + len(test_urls_1) > 0, 'No trials provided?'

    all_passed = True
    if check_urls:
        if url_checked_cache is None:
            url_checked_cache = {}

        for url in tqdm(train_url_sequence + test_urls_0 + test_urls_1, desc = 'checking images'):
            if url in url_checked_cache:
                continue
            url_checked_cache[url] = check_url_has_image(url)
            if url_checked_cache[url]['status'] == False:
                print('URL %s failed'%url)
                print('With Exception:\n%s'%url_checked_cache[url]['exception'])
                all_passed = False

    return {'status':all_passed, 'url_checked_cache':url_checked_cache}


def generate_subtask_call_string(
        train_url_sequence:list,
        train_label_sequence:list,
        ntest_trials:int,
        test_urls_0:list,
        test_urls_1: list,):

    template_string = f'generate_subtask_sequence({train_url_sequence}, {train_label_sequence}, {test_urls_0}, {test_urls_1}, {ntest_trials}),'

    return template_string


if __name__ == '__main__':
    blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
    orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'

    train_url_sequence = [blue, blue, blue, orange]
    train_label_sequence = [0, 0, 0, 1]
    ntest_trials = 6
    test_urls_0 = [blue, blue, blue]
    test_urls_1 = [orange, orange, orange]

    status = check_subtask_arg_validity(train_url_sequence, train_label_sequence, ntest_trials, test_urls_0, test_urls_1, check_urls=True,)
    assert status['status'] == True
    js_string = generate_subtask_call_string(train_url_sequence, train_label_sequence, ntest_trials, test_urls_0, test_urls_1,)

    train_url_sequence = [orange, orange, orange, blue]
    train_label_sequence = [1, 1, 1, 0]
    ntest_trials = 6
    test_urls_0 = [blue, blue, blue]
    test_urls_1 = [orange, orange, orange]

    status = check_subtask_arg_validity(train_url_sequence, train_label_sequence, ntest_trials, test_urls_0, test_urls_1, check_urls=True,)
    assert status['status'] == True
    js_string2 = generate_subtask_call_string(train_url_sequence, train_label_sequence, ntest_trials, test_urls_0, test_urls_1,)

    total_string = '\n'.join([js_string, js_string2])
    