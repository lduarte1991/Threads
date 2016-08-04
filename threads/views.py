from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.conf import settings
from threads.models import Thread, Post, Notification
from lti.utils import (debug_printer, get_lti_value, retrieve_token,
    initialize_lti_tool_provider, validate_request)
from django.http import HttpResponse
from django.contrib.humanize.templatetags.humanize import naturaltime
from django.core import serializers
from django.core.exceptions import PermissionDenied
import datetime
import uuid
import hashlib
import json


@csrf_exempt
def render_main_thread(request, context):
    context.update({'topics': Thread.getTopics(request.session['course_id'])})
    return render(request, 'lti/index.html', context)


def post_thread(request):
    title = request.POST.get('title', '')
    sessionId = request.session['anon_id']
    course = request.session['course_id']
    if title != '':
        # save the above as a thread
        thread = Thread.create_new_thread(title, sessionId, course)

    return render_main_thread(request, {'threads': Thread.objects.all})


def post_reply(request, thread_id):
    reply = request.POST.get('reply', '')
    sessionId = request.session['anon_id']
    thread = Thread.objects.get(pk=thread_id)
    if reply != '':
        # save the above as a thread
        post = Post.create_new_post(reply, sessionId, thread_id)
        data = json.dumps({
            'message': reply,
            'updated': naturaltime(post.updated_date),
            'pseudonym': post.pseudonym
        })

    return HttpResponse(data, content_type='application/json')


def show_replies(request, thread_id):
    thread = Thread.objects.get(pk=thread_id)
    return render(
        request,
        'lti/detail.html',
        {
            'parent_thread': thread,
            'replies': thread.post_set.all()
        }
    )


def get_replies(request, thread_id):
    hasNotification = request.POST.get('clicked_notification')
    if hasNotification is not None:
        notification = Notification.objects.get(pk=hasNotification)
        notification.delete()
    thread = Thread.objects.get(pk=thread_id)
    data = []
    for post in thread.post_set.all():
        data.append({
            'message': post.message,
            'updated': naturaltime(post.updated_date),
            'pseudonym': post.pseudonym,
        })
    data.append({
        'message': thread.title,
        'updated': naturaltime(thread.latest_reply),
        'pseudonym': "Original Poster"
    })
    json_data = json.dumps(data)
    return HttpResponse(json_data, content_type='application/json')


def delete_or_hide(uid, objType, shouldDelete):

    try:
        if objType == "Thread":
            obj = Thread.objects.get(pk=uid)
        else:
            obj = Post.objects.get(pk=uid)

        if shouldDelete:
            obj.deleted = True
            action = "deleted"
        else:
            obj.hidden = True
            action = "hidden"

        obj.save()
        message = objType + " was successfully " + action + "."
    except:
        if shouldDelete:
            action = "deleting"
        else:
            action = "hiding"
        message = "There was an error in " + action + " this " + objType.lower() + "."
    return message


def delete_thread(request, thread_id):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    return render_main_thread(
        request,
        {
            'threads': Thread.objects.filter(course_id=request.session['course_id']),
            'is_instructor': request.session['is_instructor'],
            'message': delete_or_hide(thread_id, "Thread", True)
        }
    )


def hide_thread(request, thread_id):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    return render_main_thread(
        request,
        {
            'threads': Thread.objects.filter(course_id=request.session['course_id']),
            'is_instructor': request.session['is_instructor'],
            'message': delete_or_hide(thread_id, "Thread", False)
        }
    )


def delete_post(request, post_id):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    return render_main_thread(
        request,
        {
            'threads': Thread.objects.filter(course_id=request.session['course_id']),
            'is_instructor': request.session['is_instructor'],
            'message': delete_or_hide(post_id, "Post", True)
        }
    )


def hide_post(request, post_id):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    return render_main_thread(
        request,
        {
            'threads': Thread.objects.filter(course_id=request.session['course_id']),
            'is_instructor': request.session['is_instructor'],
            'message': delete_or_hide(post_id, "Post", False)
        }
    )


def new_topic(request, thread_id):
    topic = request.POST.get('topic', '')
    if topic == "new-topic-title":
        topic = request.POST.get('new-topic-title')
    if topic != '':
        thread = Thread.objects.get(pk=thread_id)
        thread.topic = topic
        thread.save()
    return render_main_thread(
        request,
        {
            'threads': Thread.objects.filter(course_id=request.session['course_id']),
            'is_instructor': request.session['is_instructor'],
            'current_topic': topic
        }
    )


def filter_topic(request, topic):
    return render_main_thread(
        request,
        {
            "threads": Thread.objects.filter(topic=topic, course_id=request.session['course_id'], hidden=False),
            'is_instructor': request.session['is_instructor'],
            'current_topic': topic
        }
    )
