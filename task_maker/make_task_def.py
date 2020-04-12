import os
import json
from typing import Union

landing_page_template = 'landing_page_template_v2.html'

def make_task_def(
        url_seq,
        label_seq,
        bonus_USD_per_correct,
    ):

    # Defaults
    presentation_dur_msec = 200
    reward_dur_msec = 100
    timeout_dur_msec = 5000
    punish_dur_msec = 800

    assert len(url_seq) == len(label_seq)
    assert isinstance(bonus_USD_per_correct, float)
    assert bonus_USD_per_correct < 0.1, 'Warning, paying bonus of %0.2f USD per correct' % (bonus_USD_per_correct)

    # Compress url_seq
    common_prefix = os.path.commonprefix(url_seq)
    suffix_seq = [url.split(common_prefix)[-1] for url in url_seq]
    suffix_pool = sorted(list(set(suffix_seq)))
    stimulus_number_seq = [suffix_pool.index(s) for s in suffix_seq]

    # Condition label_seq:
    for l in label_seq:

        if isinstance(l, int):
            assert l == 0 or l == 1
        elif isinstance(l, float):
            assert l == 0. or l == 1.
        else:
            assert l == True or l == False

    label_seq = [int(l) for l in label_seq]

    assert len(label_seq) == len(stimulus_number_seq)
    # Assemble task def
    trial_sequence = {
        'stimulus_number':stimulus_number_seq,
        'label':label_seq,
        'presentation_dur_msec':[presentation_dur_msec for _ in stimulus_number_seq],
        'punish_dur_msec':[punish_dur_msec for _ in stimulus_number_seq],
        'reward_dur_msec':[reward_dur_msec for _ in stimulus_number_seq],
        'timeout_dur_msec':[timeout_dur_msec for _ in stimulus_number_seq],
    }

    TASK_DEF = {
        'bonus_USD_per_correct': bonus_USD_per_correct,
        'image_url_prefix': common_prefix,
        'image_url_suffixes': suffix_pool,
        'trial_sequence': trial_sequence,
    }

    with open(landing_page_template, 'r') as myfile:
        html_string = myfile.read()

    html_string = html_string.replace('__TASK_DEF_GOES_HERE__', json.dumps(TASK_DEF, indent=2))

    s3_bucket = 'ptap_v2'
    html_string = html_string.replace("__S3_INSTALL_BUCKET_GOES_HERE__", s3_bucket)


    return

