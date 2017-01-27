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
from sets import Set
import datetime
import uuid
import hashlib
import json
import jwt
import re



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


def download_data(request):
    data_type = request.GET.get('type')
    if not request.session['is_instructor']:
        return PermissionDenied
    course = request.session['course_id']
    threads = json.loads(serializers.serialize('json', Thread.objects.filter(course_id=course).order_by('-latest_reply')))

    if data_type == 'json':
        data = dict()
        for thread in threads:
            thread_id = thread['pk']
            posts = json.loads(serializers.serialize('json', Post.objects.filter(thread=thread_id)))
            actual_thread = Thread.objects.get(pk=thread_id)
            pseudo_list = actual_thread.getPseudosForThread()
            for post in posts:
                message = post['fields']['message'].encode('utf-8').replace('"', "\"")
                if '@' in message:
                    for anon, pseudo in pseudo_list.iteritems():
                        message = message.replace('@'+pseudo.encode('utf-8'), '<span style=\"color:red\">@' + pseudo.encode('utf-8') + "</span>")
                        message = message.replace('@ '+pseudo.encode('utf-8'), '<span style=\"color:red\">@' + pseudo.encode('utf-8') + "</span>")
                post["fields"].update({'anon_id': '[REDACTED]', 'message': message})
            title = thread['fields']['title'].encode('utf-8').replace('&quot;', "\"")
            thread["fields"].update({'title': title, 'posts': posts, 'replies': len(posts), 'original_poster': '[REDACTED]'})
            try:
                category = data[thread['fields']['topic']]
            except:
                category = []
            category.append(thread)
            data.update({thread['fields']['topic']: category})
        json_data = json.dumps(data)
        # at_mentions = re.compile('@(\w+)', re.VERBOSE)
        # json_data = at_mentions.sub(r'<span style=\"color:red\">@\1</span>', json_data)
        #return HttpResponse(json_data, content_type='application/json')
        return render(request, 'lti/json_download.html', {'json': json_data})
    elif data_type == 'html':
        data = []
        topics = Thread.objects.filter(course_id=course).order_by('topic', '-latest_reply').distinct('topic').values()
        for topic in topics:
            data.append({
                'topic': topic['topic'],
                'threads': Thread.objects.filter(course_id=course, topic=topic['topic'], hidden=False, deleted=False).order_by('-latest_reply')
            })
        context = {
            'threads': data  # Thread.objects.filter(course_id=course).order_by('topic', 'latest_reply').distinct('topic').values()
        }
        return render(request, 'lti/html_download.html', context)
    else:
        pass


def statistics(request):
    if not request.session['is_instructor']:
        return PermissionDenied
    course = request.session['course_id']
    topics = Thread.getTopics(course)

    data = dict()
    threads_dates = [0, 0, 0, 0, 0, 0, 0]
    replies_dates = [0, 0, 0, 0, 0, 0, 0]
    replies_times = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    total_replies = 0
    total_threads = 0
    total_message_length = 0
    total_unique_users = Set([])

    for topic in topics:
        topic_name = topic[0]
        topic_threads = Thread.objects.filter(course_id=course, topic=topic_name)

        for day in range(7):
            threads_dates[day] = threads_dates[day] + len(topic_threads.filter(latest_reply__week_day=day+1))
        total_replies = 0
        total_threads += len(topic_threads)
        unique_users = Set([])
        thread_stats = []
        for thread in topic_threads:
            replies = thread.post_set.all()
            total_replies += len(replies)
            thread_unique_users = Set([])
            uid_num_posts = {
                '1': 0,
                '2': 0,
                '3': 0,
                '4': 0,
                '5to10': 0,
                'gt10': 0
            }
            for day in range(7):
                replies_dates[day] = replies_dates[day] + len(replies.filter(updated_date__week_day=day+1))
            for time in range(24):
                replies_times[time] = replies_times[time] + len(replies.filter(updated_date__hour=time))
            for reply in replies:
                thread_unique_users.add(reply.anon_id)
                unique_users.add(reply.anon_id)
                total_replies += 1
                total_message_length += len(reply.message)
            for uid in thread_unique_users:
                num_of_replies = len(replies.filter(anon_id=uid))
                if num_of_replies >= 5:
                    if num_of_replies > 10:
                        uid_num_posts['gt10'] = uid_num_posts['gt10'] + 1
                    else:
                        uid_num_posts['5to10'] = uid_num_posts['5to10'] + 1
                else:
                    uid_num_posts[unicode(num_of_replies)] = uid_num_posts[unicode(num_of_replies)] + 1

            thread_stats.append({
                'pk': thread.pk,
                'thread_name': thread.title,
                'unique_users': len(thread_unique_users),
                'replies_num': len(replies),
                'uid_replies': uid_num_posts
            })
        total_unique_users = total_unique_users.union(unique_users)

        data.update({topic_name: {
                'threads_num': len(topic_threads),
                'replies_num': total_replies,
                'unique_users': len(unique_users),
                'thread_stats': thread_stats
            }
        })
    if total_replies == 0:
        total_replies = 1
    context = {
        'stats': data,
        'stats_json': json.dumps(data),
        'threads_dates': threads_dates,
        'replies_dates': replies_dates,
        'replies_times': replies_times,
        'average_length': total_message_length / total_replies,
        'replies_count': total_replies,
        'threads_count': total_threads,
        'uniques_count': len(total_unique_users)
    }
    return render(request, 'lti/stats.html', context)

@login_required
def test_download_data(request):
    data_type = request.GET.get('type')
    course = 'course-v1:HarvardX+HLS3x+3T2016'  # request.session['course_id']
    threads = json.loads(serializers.serialize('json', Thread.objects.filter(course_id=course).order_by('-latest_reply')))

    if data_type == 'json':
        data = dict()
        for thread in threads:
            thread_id = thread['pk']
            posts = json.loads(serializers.serialize('json', Post.objects.filter(thread=thread_id)))
            actual_thread = Thread.objects.get(pk=thread_id)
            pseudo_list = actual_thread.getPseudosForThread()
            for post in posts:
                message = post['fields']['message'].encode('utf-8')
                if '@' in message:
                    for anon, pseudo in pseudo_list.iteritems():
                        message = message.replace('@'+pseudo.encode('utf-8'), '<span style=\"color:red\">@' + pseudo.encode('utf-8') + "</span>")
                        message = message.replace('@ '+pseudo.encode('utf-8'), '<span style=\"color:red\">@' + pseudo.encode('utf-8') + "</span>")
                    post["fields"].update({'anon_id': '[REDACTED]', 'message': message})
                else:
                    post["fields"].update({'anon_id': '[REDACTED]'})

            thread["fields"].update({'posts': posts, 'replies': len(posts), 'original_poster': '[REDACTED]'})
            try:
                category = data[thread['fields']['topic']]
            except:
                category = []
            category.append(thread)
            data.update({thread['fields']['topic']: category})
        json_data = json.dumps(data)
        # at_mentions = re.compile('@(\w+)', re.VERBOSE)
        # json_data = at_mentions.sub(r'<span style=\"color:red\">@\1</span>', json_data)
        #return HttpResponse(json_data, content_type='application/json')
        return render(request, 'lti/json_download.html', {'json': json_data})
    elif data_type == 'html':
        data = []
        topics = Thread.objects.filter(course_id=course).order_by('topic', '-latest_reply').distinct('topic').values()
        for topic in topics:
            data.append({
                'topic': topic['topic'],
                'threads': Thread.objects.filter(course_id=course, topic=topic['topic'], hidden=False, deleted=False).order_by('-latest_reply')
            })
        context = {
            'threads': data  # Thread.objects.filter(course_id=course).order_by('topic', 'latest_reply').distinct('topic').values()
        }
        return render(request, 'lti/html_download.html', context)
    else:
        pass
