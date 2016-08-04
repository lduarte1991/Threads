"""
Sets the urls which will launch the LTI
"""
from django.conf.urls import patterns, url

urlpatterns = patterns(
    '',
    url(
        r'^launch/$',
        'lti.views.launch',
        name="launch",
    ),
)
