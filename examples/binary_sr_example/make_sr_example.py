import python_task_makers.utils as utils
import python_task_makers.binary_sr.generate_sr as generate_sr

blue = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/bluediamond.png'
orange = 'https://milresources.s3.amazonaws.com/Images/AbstractShapes/orangediamond.png'
train_url_sequence = [blue, blue, blue, orange]
train_label_sequence = [0, 0, 0, 1]

ntest_trials = 2
test_urls_0 = [blue, blue, blue]
test_urls_1 = [orange, orange, orange]

subtask0 = generate_sr.Subtask(
    train_url_seq=train_url_sequence,
    train_label_seq=train_label_sequence,
    test_url_pool_0=test_urls_0,
    test_url_pool_1=test_urls_1,
    ntest_trials=ntest_trials,
)

string = generate_sr.write_html([subtask0, subtask0])
utils.save_text(string, '/home/umjl/WebstormProjects/ptap/examples/binary_sr_example/example_sr_task.html')