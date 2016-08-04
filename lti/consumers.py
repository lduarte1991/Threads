from django.http import HttpResponse
from channels.handler import AsgiHandler
from channels import Group


def http_consumer(message):
    # Make standard HTTP response - access ASGI path attribute directly
    response = HttpResponse("Hello world! You asked for %s" % message.content['path'])
    # Encode that response into message format (ASGI)
    for chunk in AsgiHandler.encode_response(response):
        message.reply_channel.send(chunk)


# def ws_message(message):
#     message.reply_channel.send({
#         "text": message.content['text'],
#     })


def ws_message(message):
    Group('chat').send({
        'text': "[user] %s" % message.content['text'],
    })


def ws_add(message):
    Group('chat').add(message.reply_channel)


def ws_disconnect(message):
    Group('chat').discard(message.reply_channel)
