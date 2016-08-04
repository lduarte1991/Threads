"""
Sets the urls which will launch the LTI
"""
from django.conf.urls import url
from lti.views import launch

urlpatterns = [
    url(
        r'^launch/$',
        launch,
        name="launch",
    ),
]
