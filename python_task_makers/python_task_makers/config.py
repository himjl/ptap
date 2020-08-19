import os
PTAP_PUBLIC_LOCATION = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'public')
assert os.path.isdir(PTAP_PUBLIC_LOCATION)