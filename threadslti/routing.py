from channels.routing import route
from lti.consumers import ws_message, ws_add, ws_disconnect

channel_routing = [
    route("websocket.connect", ws_add),
    route("websocket.receive", ws_message),
    route('websocket.discconect', ws_disconnect)
]
