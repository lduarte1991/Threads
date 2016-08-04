from django.contrib import admin
from threads.models import Thread, Post, Notification, Pseudonym


class ThreadAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'topic',
        'course_id',
        'deleted',
        'hidden'
    )


class PostAdmin(admin.ModelAdmin):
    list_display = (
        'message',
        'pseudonym',
        'deleted',
        'hidden'
    )


class PseudonymAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'category'
    )

admin.site.register(Thread, ThreadAdmin)
admin.site.register(Post, PostAdmin)
admin.site.register(Pseudonym, PseudonymAdmin)
