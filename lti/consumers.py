from django.http import HttpResponse
from channels.handler import AsgiHandler
from channels import Group
from channels.sessions import channel_session
import json
import jwt
import sys

# def http_consumer(message):
#     # Make standard HTTP response - access ASGI path attribute directly
#     response = HttpResponse("Hello world! You asked for %s" % message.content['path'])
#     # Encode that response into message format (ASGI)
#     for chunk in AsgiHandler.encode_response(response):
#         message.reply_channel.send(chunk)


# def ws_message(message):
#     message.reply_channel.send({
#         "text": message.content['text'],
#     })


@channel_session
def ws_connect(message):
    print "Does reach here"
    personal_channel_name = message.content['path'].strip('/ws')
    Group('user-%s' % personal_channel_name).add(message.reply_channel)
    Group('threads').add(message.reply_channel)
    Group('threads').send({
        'text': '%s' % "Joined threads"
    })
    Group('user-%s' % personal_channel_name).send({
        'text': 'Joined notification channel'
    })


@channel_session
def ws_message(message):
    message_loaded = json.loads(message['text'])
    if 'notes' in message_loaded:
        for note in message_loaded['notes']:
            decoded = jwt.decode(note, message_loaded['poster_id'], algorithms=['HS256'])
            decoded['type'] = 'notification'
            Group('user-%s' % decoded['not_id']).send({
                'text': json.dumps(decoded)
            })
    Group('threads').send({
        'text': '%s' % message['text'],
    })


@channel_session
def ws_disconnect(message):
    Group('threads').discard(message.reply_channel)
