import os
import gevent.socket
import redis.connection

redis.connection.socket = gevent.socket
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "threadslti.settings")

from ws4redis.uwsgi_runserver import uWSGIWebsocketServer  # noqa
application = uWSGIWebsocketServer()
