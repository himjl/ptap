import numpy as np
from tqdm import tqdm
import ptap_writer.utils as utils
from typing import List
import os
from typing import Union
from tqdm import tqdm

loc = os.path.dirname(os.path.abspath(__file__))


def create_redirect_page(
        possible_urls:list,
        check_urls: bool,
):

    assert isinstance(possible_urls, list)
    if check_urls:
        passed = True
        for url in tqdm(possible_urls, desc = 'checking redirect URLs'):
            if not utils.check_url_exists(url, raise_exception=False):
                print(f'Could not find {url}')
                passed = False

        if not passed:
            print('Could not verify all URLs')
            raise Exception

    # Encode as strings
    url_array_string = '[\n'
    for url in possible_urls:
        url_array_string+=('\"' + url + '\"' + ',\n')
    url_array_string +=']\n'

    base_string = utils.load_text(os.path.join(loc, 'choose_url_randomly_template.html'))
    html_string = base_string.replace('__INSERT_URLS_ARRAY_HERE__', url_array_string)
    return html_string
