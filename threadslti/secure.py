SECURE_SETTINGS = {
    'django_secret_key': 'c1p*$b=$a-7580-z7335dv%k24j-$)873-7qmx79a-f@d0e*#)',
    'debug': True,
    'CONSUMER_URL': 'localhost:8000/lti/launch_lti/',
    'CONSUMER_KEY': '123key',
    'LTI_SECRET': 'secret',
    'ADMIN_ROLES': {'Administrator', 'Instructor', 'urn:lti:instrole:ims/lis/Administrator'},
    'X_FRAME_ALLOWED_SITES': {
        'tlt.harvard.edu', 'edx.org',
        'harvardx.harvard.edu',
        '0.0.0.0:8000',
        'canvas.harvard.edu',
        'ltiapps.net'
    },
    'X_FRAME_ALLOWED_SITES_MAP': {
        'harvardx.harvard.edu': '0.0.0.0:8000',
        'edx.org': 'edx.org',
        '0.0.0.0:8000': '0.0.0.0:8000',
        'ltiapps.net': 'ltiapps.net'
    },
    'db_default_name': "threads",
    'db_default_user': "threads",
    'db_default_password': "fake",
    'db_default_host': 'localhost',
    'db_default_port': '',
    'SERVER_NAME': 'localhost',
    'TEST_SERVER': False,
    'testing_user_id': '123FakeTESTING',
    'testing_user_name': 'TESTLUIS',
    'testing_roles': 'Administrator',
    'testing_context_id': 'TEST_CONTEXT_ID',
    'testing_collection_id': 'FAKE_COLLECTION_ID',
    'testing_object_id': 'FAKE_OBJECT_ID',
}
