from lti.utils import (debug_printer, get_lti_value, retrieve_token, initialize_lti_tool_provider, validate_request, hash_anon_id)
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.conf import settings
from threads.views import render_main_thread
from threads.models import Thread, Notification, Pseudonym


@csrf_exempt
def launch(request):
    validate_request(request)
    tool_provider = initialize_lti_tool_provider(request)

    # collect anonymous_id and consumer key in order to fetch LTIProfile
    # if it exists, we initialize the tool otherwise, we create a new user
    user_id = get_lti_value('user_id', tool_provider)
    # user_id = "tempSessionID"
    request.session['anon_id'] = user_id  # hash_anon_id(user_id)
    debug_printer('DEBUG - Found anonymous ID in request: %s' % user_id)

    course = get_lti_value(settings.LTI_COURSE_ID, tool_provider)
    request.session['course_id'] = course
    debug_printer('DEBUG - Found course being accessed: %s' % course)

    roles = get_lti_value('roles', tool_provider)
    is_instructor = False
    for role in roles:
        if role in settings.ADMIN_ROLES:
            is_instructor = True
    request.session['is_instructor'] = is_instructor
    debug_printer('DEBUG - Found is_instructor being accessed: %s' % is_instructor)
    custom_topic = get_lti_value('custom_topic', tool_provider) or "Current"
    #threads = Thread.getUnpinnedThreads(course_id=course, topic=custom_topic)
    #pinned_threads = Thread.getPinnedThreads(course_id=course, custom_topic)
    
    if is_instructor:
        threads = Thread.objects.filter(topic=custom_topic, course_id=course, pinned=False)
        pinned_threads = Thread.objects.filter(topic=custom_topic, course_id=course, pinned=True)
    else:
        threads, pinned_threads = Thread.getSeparatedThreads(course, custom_topic)
    noPseudos = len(Pseudonym.getAllPseudonymsForCategory(course)) == 0

    return render_main_thread(
        request,
        {
            'threads': threads,
            'is_instructor': is_instructor,
            'pinned_threads': pinned_threads,
            'current_topic': custom_topic,
            'noPseudos': noPseudos
        }
    )
