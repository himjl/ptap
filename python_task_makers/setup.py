from setuptools import setup, find_packages
import os

if os.path.exists('requirements.txt'):
    with open('requirements.txt', 'r') as fb:
        requirements = fb.readlines()
else:
    requirements = []

print(find_packages())
setup(
    name="python_task_makers",
    version="0.01.dev",
    packages=find_packages(),
    # Project uses reStructuredText, so ensure that the docutils get
    # installed or upgraded on the target machine
    install_requires=requirements, # todo
    # metadata to display on PyPI
    author="Michael Lee",
    author_email="mil@mit.edu",
    description="generate HTML-based tasks that use ptap JavaScript functions",
    keywords="",
    # could also include long_description, download_url, etc.
)
