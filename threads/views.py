from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.conf import settings
from threads.models import Thread, Post, Notification, Pseudonym
from lti.utils import (debug_printer, get_lti_value, retrieve_token,
    initialize_lti_tool_provider, validate_request, hash_anon_id)
from django.http import HttpResponse
from django.contrib.humanize.templatetags.humanize import naturaltime
from django.core import serializers
from django.core.exceptions import PermissionDenied
from django.core.urlresolvers import reverse
from django.core.paginator import Paginator
from django.contrib.auth.decorators import login_required
import datetime
import uuid
import hashlib
import json
import jwt


@csrf_exempt
def render_main_thread(request, context):
    context.update({
        'topics': Thread.getTopics(request.session['course_id']),
        'mentioned_id': request.session['anon_id'],
        'notifications': Notification.getNotificationsFromThreads(Thread.objects.all(), request.session['anon_id']),
        'unique_key': request.session['course_id'] + context['current_topic']
    })
    return render(request, 'lti/index.html', context)


def post_thread(request):
    title = request.POST.get('title', '')
    topic = request.POST.get('topic', 'Current')
    sessionId = request.session['anon_id']
    course = request.session['course_id']
    is_instructor = request.session['is_instructor']
    if title != '':
        # save the above as a thread
        thread = Thread.create_new_thread_with_topic(title, sessionId, course, topic, is_instructor)
        data = {
            'message': thread.title,
            'updated': naturaltime(thread.latest_reply),
            'thread_id': thread.pk,
            'admin_panel': '',
            'replyNum': thread.getNumberOfReplies()
        }
        if request.session['is_instructor']:
            admin_panel = "<div class='admin-panel'><div class='delete' data-id='"+str(thread.pk)+"' data-href='"+reverse('threads:delete_thread', kwargs={'thread_id': thread.pk, 'undo': 0})+"' title='Mark thread as deleted'><i class='fa fa-remove'></i></div>"
            admin_panel = admin_panel + "<div class='hide' data-id='"+str(thread.pk)+"' data-href='"+reverse('threads:hide_thread', kwargs={'thread_id': thread.pk, 'undo': 0})+"' title='Hide entire thread'><i class='fa fa-eye'></i></div>"
            admin_panel = admin_panel + "<div class='move' data-id='"+str(thread.pk)+"' onclick='jQuery(\".popup-background\").show(); jQuery(\".addthreadtotopic\").attr(\"action\", \""+reverse('threads:new_topic', kwargs={'thread_id': thread.pk})+"\");return false;' title='Change thread's topic'><i class='fa fa-tag'></i></div></div>"
            data.update({
                'admin_panel': admin_panel,
                'replies_url': reverse('threads:get_replies', kwargs={'thread_id': thread.pk}),
                'post_reply_url': reverse('threads:post_reply', kwargs={'thread_id': thread.pk})
            })
        return HttpResponse(json.dumps(data), content_type='application/json')

    return render_main_thread(request, {'threads': Thread.objects.filter(topic='Current', course_id=course)})


def post_reply(request, thread_id):
    reply = request.POST.get('reply', '')
    sessionId = request.session['anon_id']
    thread = Thread.objects.get(pk=thread_id)
    course = request.session['course_id']
    if reply != '':
        # save the above as a thread
        (post, notes) = Post.create_new_post(reply, sessionId, thread_id, course)
        data = {
            'message': post.message,
            'updated': naturaltime(post.updated_date),
            'pseudonym': post.pseudonym,
            'reply_id': post.pk,
            'parent_thread_id': thread_id,
            'post_id': sessionId,
            'notes': notes
        }
        if len(notes) > 0:
            secured = []
            for note in notes:
                secured.append(jwt.encode({'not_id': note.anon_id, 'reply_id': post.pk, 'thread_id': thread_id, 'remove_notification_url': reverse('threads:remove_notification', kwargs={'notification_id': note.pk})}, sessionId, algorithm="HS256"))
            data.update({'notes': secured})
    return HttpResponse(json.dumps(data), content_type='application/json')

@csrf_exempt
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

@csrf_exempt
def get_replies(request, thread_id):
    try:
        if 'fiddle.jshell' in request.META['HTTP_REFERER']:
            request.session['is_instructor'] = True
            request.session['course_id'] = 'testSession'
            request.session['anon_id'] = 'abclui'
    finally:
        return get_replies_offset(request, thread_id, 1)

@csrf_exempt
def get_replies_offset(request, thread_id, pageNum):
    hasNotification = request.POST.get('clicked_notification')
    if hasNotification is not None:
        notification = Notification.objects.get(pk=hasNotification)
        notification.hidden = True
        notification.save()
    thread = Thread.objects.get(pk=thread_id)
    data = []
    paginator = Paginator(thread.post_set.all(), 30)
    try:
        page = paginator.page(pageNum)
    except:
        data.append({'end_of_list': 'true'})
        json_data = json.dumps(data)
        return HttpResponse(json_data, content_type='application/json')
    for post in page.object_list:
        if post.hidden is False or request.session['is_instructor']:
            data.append({
                'message': post.message if post.deleted is False or request.session['is_instructor'] else '[DELETED] by staff',
                'updated': str(post.updated_date),
                'pseudonym': post.pseudonym,
                'reply_id': post.pk,
                'deleted': post.deleted,
                'hidden': post.hidden,
            })
    data.append({
        'message': thread.title,
        'updated': str(thread.latest_reply),
        'pseudonym': "OP",
        'pageNum': pageNum,
        'pseudoList': thread.getPseudosForThread().values(),
        'pseudo': Post.getPseudo(thread, request.session['anon_id'], request.session['course_id'], False)
    })
    json_data = json.dumps(data)
    return HttpResponse(json_data, content_type='application/json')


def delete_or_hide(uid, objType, shouldDelete, shouldUndo):

    try:
        if objType == "Thread":
            obj = Thread.objects.get(pk=uid)
        else:
            obj = Post.objects.get(pk=uid)

        if shouldDelete:
            obj.deleted = shouldUndo
            action = "deleted"
        else:
            obj.hidden = shouldUndo
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


def delete_thread(request, thread_id, undo):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    json_data = json.dumps({
        'message': delete_or_hide(thread_id, "Thread", True, int(undo) == 0)
    })
    return HttpResponse(json_data, content_type='application/json') 


def hide_thread(request, thread_id, undo):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    json_data = json.dumps({
        'message': delete_or_hide(thread_id, "Thread", False, int(undo) == 0)
    })
    return HttpResponse(json_data, content_type='application/json') 


def delete_post(request, post_id, undo):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    json_data = json.dumps({
        'message': delete_or_hide(post_id, "Post", True, int(undo) == 0)
    })
    return HttpResponse(json_data, content_type='application/json')


def hide_post(request, post_id, undo):
    if not request.session["is_instructor"]:
        raise PermissionDenied
    json_data = json.dumps({
        'message': delete_or_hide(post_id, "Post", False, int(undo) == 0)
    })
    return HttpResponse(json_data, content_type='application/json')


def new_topic(request, thread_id):
    topic = request.POST.get('topic', '')
    if topic == "new-topic-title":
        topic = request.POST.get('new-topic-title')
    if topic != '':
        thread = Thread.objects.get(pk=thread_id)
        thread.topic = topic
        thread.save()
        data = {
            'message': "Success",
            'thread': thread_id,
            'topic': topic,
        }
        json_data = json.dumps(data)
        return HttpResponse(json_data, content_type='application/json')
    return render_main_thread(
        request,
        {
            'threads': Thread.objects.filter(course_id=request.session['course_id'], topic=topic),
            'is_instructor': request.session['is_instructor'],
            'current_topic': topic
        }
    )


def filter_topic(request, topic):
    if request.session['is_instructor']:
        threads = Thread.objects.filter(topic=topic, course_id=request.session['course_id'], pinned=False)
        pinned_threads = Thread.objects.filter(topic=topic, course_id=request.session['course_id'], pinned=True)
    else:
        threads, pinned_threads = Thread.getSeparatedThreads(request.session['course_id'], topic)
    return render_main_thread(
        request,
        {
            "threads": threads,
            "pinned_threads": pinned_threads,
            'is_instructor': request.session['is_instructor'],
            'current_topic': topic
        }
    )


def pseudonyms_ui(request):
    if request.session['is_instructor']:
        names = Pseudonym.getAllPseudonyms()
        data = []
        for pseudo in names:
            data.append({
                'name': pseudo.name,
                'category': pseudo.category.replace(' ', '_')
            })
        json_data = json.dumps(data)
        return HttpResponse(json_data, content_type='application/json')
    else:
        raise PermissionDenied


def reset_pseudos(request):
    if request.session['is_instructor']:
        Pseudonym.reset_to_default(request.session['course_id'])
        data = {
            'message': "Success",
        }
        json_data = json.dumps(data)
        return HttpResponse(json_data, content_type='application/json')
    else:
        raise PermissionDenied


def add_new_pseudos(request):
    if request.session['is_instructor']:
        address = request.POST.get('address', None)
        category = request.session['course_id']
        if address is not None and category is not None:
            Pseudonym.addPseudonymsFromExternalFile(address, category)
            data = {
                'message': "Success",
            }
            json_data = json.dumps(data)
            return HttpResponse(json_data, content_type='application/json')
        else:
            raise PermissionDenied


def remove_notification(request, notification_id):
    data = {
        'message': "Failure",
    }
    try:
        notification = Notification.objects.get(pk=notification_id)
        notification.hidden = True
        notification.save()
        data.update({'message', "Success"})
    finally:
        json_data = json.dumps(data)
        return HttpResponse(json_data, content_type='application/json')


def fill_me_in(request, seconds):
    if request.session['course_id']:
        course_id = request.session['course_id']
        filter_datetime = datetime.datetime.now() - datetime.timedelta(seconds=int(seconds) + 1)
        threads = Thread.objects.filter(latest_reply__gte=filter_datetime, course_id=course_id, hidden=False)
        posts = Post.objects.filter(updated_date__gte=filter_datetime)
        data = {
            'threads': [],
            'posts': []
        }
        for thread in threads:
            t_data = {
                'message': thread.title,
                'updated': naturaltime(thread.latest_reply),
                'thread_id': thread.pk,
                'admin_panel': '',
                'replyNum': thread.getNumberOfReplies()
            }
            if request.session['is_instructor']:
                admin_panel = "<div class='admin-panel'><div class='delete' data-id='"+str(thread.pk)+"' data-href='"+reverse('threads:delete_thread', kwargs={'thread_id': thread.pk, 'undo': 0})+"' title='Mark thread as deleted'><i class='fa fa-remove'></i></div>"
                admin_panel = admin_panel + "<div class='hide' data-id='"+str(thread.pk)+"' data-href='"+reverse('threads:hide_thread', kwargs={'thread_id': thread.pk, 'undo': 0})+"' title='Hide entire thread'><i class='fa fa-eye'></i></div>"
                admin_panel = admin_panel + "<div class='move' data-id='"+str(thread.pk)+"' onclick='jQuery(\".popup-background\").show(); jQuery(\".addthreadtotopic\").attr(\"action\", \""+reverse('threads:new_topic', kwargs={'thread_id': thread.pk})+"\");return false;' title='Change thread's topic'><i class='fa fa-tag'></i></div></div>"
                t_data.update({
                    'admin_panel': admin_panel,
                    'replies_url': reverse('threads:get_replies', kwargs={'thread_id': thread.pk}),
                    'post_reply_url': reverse('threads:post_reply', kwargs={'thread_id': thread.pk})
                })
            data['threads'].append(t_data)

        for post in posts:
            p_data = {
                'message': post.message,
                'updated': naturaltime(post.updated_date),
                'pseudo': post.pseudonym,
                'reply_id': post.pk,
                'pthread_id': post.thread.pk,
            }
            data['posts'].append(p_data)

        json_data = json.dumps(data)
        return HttpResponse(json_data, content_type='application/json')
    else:
        raise PermissionDenied


@login_required
def test(request):
    request.session['anon_id'] = 'test'
    request.session['course_id'] = 'testSession'
    request.session['is_instructor'] = True
    users = Post.objects.all().order_by('anon_id').distinct('anon_id').values_list('anon_id')
    context = {}
    context.update({
        'threads': Thread.objects.filter(pinned=False),
        'pinned_threads':  Thread.objects.filter(pinned=True),
        'topics': Thread.getTopics(None),
        'is_instructor': True,
        'current_topic': "Current",
        'noPseudos': [],
        'mentioned_id': "test",
        'notifications': [],
        'users': users,
        'usersCount': len(users)
    })
    return render(request, 'lti/test.html', context)
