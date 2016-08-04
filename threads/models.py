from django.contrib.staticfiles.templatetags.staticfiles import static
from django.db import models
from lti.utils import debug_printer
import datetime
import random
import requests
import os
import sets


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
        auto_now=True
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

    @staticmethod
    def create_new_thread(title, session_id, course_id):
        newThread = Thread(title=title, original_poster=session_id, course_id=course_id)
        newThread.save()
        return newThread

    def getPseudosForThread(self):
        replies = self.post_set.all()
        pseudos = dict()
        for reply in replies:
            pseudos.update({reply.anon_id: reply.pseudonym})
        return pseudos

    def getNumberOfReplies(self):
        return len(self.post_set.all())

    @staticmethod
    def getTopics(course_id):
        return Thread.objects.filter(course_id=course_id).values_list('topic').distinct()

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
        auto_now=True
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
    def create_new_post(message, session_id, thread_id):
        thread = Thread.objects.get(pk=thread_id)
        reply = Post(thread=thread, message=message, anon_id=session_id, pseudonym=Post.getPseudo(thread, session_id))
        reply.save()

        for anon_id, pseudonym in thread.getPseudosForThread().iteritems():
            mentioned = "@" + pseudonym
            if mentioned in message:
                notification = Notification(mentioned_name=pseudonym, thread=thread, post=reply, anon_id=session_id)
                notification.save()
        return reply

    @staticmethod
    def getPseudo(thread, session_id):
        pseudos = thread.getPseudosForThread()
        if thread.original_poster == session_id:
            return "OP"
        try:
            return pseudos[session_id]
        except:
            settings_dir = os.path.dirname(__file__)
            PROJECT_ROOT = os.path.abspath(os.path.dirname(settings_dir))
            typesofnames = ['animals', 'cities', 'crayons']
            namefile = os.path.join(PROJECT_ROOT, 'static/' + random.choice(typesofnames) + '.txt')
            r = open(namefile)
            name = random.choice(r.readlines())
            return name.strip()

    class Meta:
        ordering = ['-updated_date']


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

    @staticmethod
    def getNotificationsFromThreads(list_of_threads, anon_id):
        nots = []
        for thread in list_of_threads:
            for notification in thread.notification_set.filter(anon_id=anon_id):
                nots.append(notification)
        return nots
