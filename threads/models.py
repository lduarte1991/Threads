from django.contrib.staticfiles.templatetags.staticfiles import static
from django.utils.html import escape
from django.db import models
from lti.utils import debug_printer
from django.db.models.aggregates import Count
from ws4redis.publisher import RedisPublisher
from ws4redis.redis_store import RedisMessage
from django.core.urlresolvers import reverse
from random import randint
import datetime
import random
import requests
import os
import sets
import json
import urllib


class Thread(models.Model):
    replies = models.IntegerField(
        default=0,
        verbose_name="Number of Replies",
        null=False,
    )

    archived = models.BooleanField(
        default=False,
        verbose_name="Is Archived?"
    )

    topic = models.CharField(
        max_length=250,
        verbose_name="Topic",
        default="Current"
    )

    latest_reply = models.DateTimeField(
        auto_now_add=True
    )

    title = models.TextField(
        blank=True,
    )

    original_poster = models.CharField(
        max_length=250,
        blank=False
    )

    course_id = models.CharField(
        max_length=250,
        blank=False
    )

    deleted = models.BooleanField(
        default=False
    )

    hidden = models.BooleanField(
        default=False
    )

    pinned = models.BooleanField(
        default=False
    )

    @staticmethod
    def create_new_thread_with_topic(title, session_id, course_id, topic, is_instructor):
        newThread = Thread(title=escape(title), original_poster=session_id, course_id=course_id, topic=topic, pinned=is_instructor)
        newThread.save()
        unique_key = 'threads' + course_id + topic
        redis_publisher = RedisPublisher(facility=unique_key, broadcast=True)
        message = RedisMessage(json.dumps({
            'type': 'thread_created',
            'thread_id': newThread.pk,
            'thread_title': newThread.title,
            'replyNum': newThread.getNumberOfReplies(),
            'pinned': newThread.pinned,
        }))
        redis_publisher.publish_message(message)

        redis_publisher = RedisPublisher(facility=session_id, broadcast=True)
        message = RedisMessage(json.dumps({
            'type': 'created-thread',
            'thread_id': newThread.pk
        }))
        redis_publisher.publish_message(message)
        return newThread

    @staticmethod
    def create_new_thread(title, session_id, course_id):
        return Thread.create_new_thread_with_topic(title, session_id, course_id, 'Current')

    def getPseudosForThread(self):
        replies = self.post_set.all()
        pseudos = dict()
        for reply in replies:
            pseudos.update({reply.anon_id: reply.pseudonym})
        return pseudos

    def getNumberOfReplies(self):
        return len(self.post_set.filter(hidden=False))

    @staticmethod
    def getTopics(course_id):
        if course_id is None:
            return Thread.objects.all().order_by('topic').distinct('topic').values_list('topic')
        return Thread.objects.filter(course_id=course_id).order_by('topic').distinct('topic').values_list('topic')

    @staticmethod
    def getThreads(course_id, topic, pinned):
        return Thread.objects.filter(course_id=course_id, topic=topic, pinned=pinned, hidden=False)

    @staticmethod
    def getUnpinnedThreads(course_id, topic):
        return Thread.getThreads(course_id, topic, False)

    @staticmethod
    def getPinnedThreads(course_id, topic):
        return Thread.getThreads(course_id, topic, True)

    @staticmethod
    def getSeparatedThreads(course_id, topic):
        return (Thread.getUnpinnedThreads(course_id, topic), Thread.getPinnedThreads(course_id, topic))

    @staticmethod
    def getChartInfo(course_id=None, topic=None):
        if course_id is None:
            topics = Thread.getTopics(None)
            result = dict()
            for top in topics:
                threads = Thread.objects.filter(topic=top, hidden=False)
                thread_count = len(threads)
                post_count = 0
                for thread in threads:
                    post_count += len(thread.post_set.all())

                result[top] = {
                    'threads': thread_count,
                    'posts': post_count
                }
        else:
            pass

    def __unicode__(self):
        return self.title

    class Meta:
        ordering = ['-latest_reply']


class Post(models.Model):
    thread = models.ForeignKey(
        Thread,
        verbose_name="Parent Thread"
    )

    pseudonym = models.CharField(
        max_length=250,
        blank=False
    )

    message = models.TextField()

    updated_date = models.DateTimeField(
        auto_now_add=True
    )

    anon_id = models.CharField(
        max_length=250,
        blank=False
    )

    deleted = models.BooleanField(
        default=False
    )

    hidden = models.BooleanField(
        default=False
    )

    @staticmethod
    def create_new_post(message, session_id, thread_id, course_id):
        thread = Thread.objects.get(pk=thread_id)
        reply = Post(thread=thread, message=escape(message), anon_id=session_id, pseudonym=Post.getPseudo(thread, session_id, course_id, True))
        reply.save()

        nots = []
        for anon_id, pseudonym in thread.getPseudosForThread().iteritems():
            mentioned = "@" + pseudonym
            if mentioned in message:
                notification = Notification(mentioned_name=pseudonym, thread=thread, post=reply, anon_id=anon_id)
                notification.save()
                redis_publisher = RedisPublisher(facility=anon_id, broadcast=True)
                message = RedisMessage(json.dumps({
                    'type': 'notification',
                    'not_id': notification.anon_id,
                    'reply_id': reply.pk,
                    'thread_id': thread.pk,
                    'remove_notification_url': reverse('threads:remove_notification', kwargs={'notification_id': notification.pk}),
                }))
                redis_publisher.publish_message(message, expire=None)
                nots.append(notification)

        unique_key = 'threads' + course_id + thread.topic
        redis_publisher = RedisPublisher(facility=unique_key, broadcast=True)
        message = RedisMessage(json.dumps({
            'type': 'reply_created',
            'pseudo': reply.pseudonym,
            'message': reply.message,
            'updated': unicode(reply.updated_date),
            'reply_id': reply.pk,
            'pthread_id': thread_id,
            'poster_id': reply.anon_id,
            'newReplyCount': thread.getNumberOfReplies(),
        }))
        redis_publisher.publish_message(message)

        redis_publisher = RedisPublisher(facility=session_id, broadcast=True)
        message = RedisMessage(json.dumps({
            'type': 'created-reply',
            'reply_id': reply.pk,
            'parent_thread_id': thread_id,
            'pseudonym': reply.pseudonym
        }))
        redis_publisher.publish_message(message)
        return (reply, nots)

    @staticmethod
    def getPseudo(thread, session_id, course_id, return_new):
        pseudos = thread.getPseudosForThread()
        if thread.original_poster == session_id:
            return "OP"
        try:
            return pseudos[session_id]
        except:
            if not return_new:
                return ""
            pseudonyms = Pseudonym.getAllPseudonymsForCategory(course_id)
            if len(pseudonyms) == 0:
                pseudonyms = Pseudonym.getAllPseudonyms()
            name = random.choice(pseudonyms)
            return name.name.strip()

    class Meta:
        ordering = ['updated_date']


class Notification(models.Model):
    mentioned_name = models.CharField(
        max_length=250,
        blank=False
    )

    thread = models.ForeignKey(
        Thread,
        verbose_name="Thread Mentioned"
    )

    post = models.ForeignKey(
        Post,
        verbose_name="Post Mentioned"
    )

    anon_id = models.CharField(
        max_length=250,
        blank=False
    )

    hidden = models.BooleanField(
        default=False
    )

    @staticmethod
    def getNotificationsFromThreads(list_of_threads, anon_id):
        nots = []
        for thread in list_of_threads:
            for notification in thread.notification_set.filter(anon_id=anon_id, hidden=False):
                nots.append(notification)
        return nots


class PseudonymManager(models.Manager):
    def random(self):
        count = self.aggregate(count=Count('id'))['count']
        random_index = randint(0, count - 1)
        return self.all()[random_index]


class Pseudonym(models.Model):
    name = models.CharField(
        max_length=250,
        blank=False
    )

    category = models.CharField(
        max_length=250,
        blank=True,
        default='Uncategorized'
    )

    class Meta:
        ordering = ['category', 'name']

    @staticmethod
    def getAllPseudonyms():
        names = Pseudonym.objects.all()
        if len(names) == 0:
            Pseudonym.reset_to_default()
            names = Pseudonym.objects.all()
        return names

    @staticmethod
    def getAllPseudonymsForCategory(category):
        return Pseudonym.objects.filter(category=category)

    @staticmethod
    def addPseudonymsFromExternalFile(address, category):
        response = requests.get(address)
        lines_of_names = response.text.split('\n')

        def finalize(name, cat):
            if name != '' and name.strip() != '':
                p = Pseudonym(name=name.strip(), category=cat)
                p.save()
        for name in lines_of_names:
            if ',' in name:
                for n in name.split(','):
                    finalize(n, category)
            elif '\t' in name:
                for n in name.split('\t'):
                    finalize(n, category)
            else:
                finalize(name, category)

    @staticmethod
    def reset_to_default(course):
        ps = Pseudonym.objects.filter(category=course)
        for p in ps:
            p.delete()
        settings_dir = os.path.dirname(__file__)
        PROJECT_ROOT = os.path.abspath(os.path.dirname(settings_dir))
        typesofnames = ['animals', 'cities', 'crayons']
        for category in typesofnames:
            namefile = os.path.join(PROJECT_ROOT, 'static/' + category + '.txt')
            r = open(namefile)
            for name in r:
                p = Pseudonym(name=name.strip(), category=category)
                p.save()
