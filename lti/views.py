from lti.utils import (debug_printer, get_lti_value, retrieve_token, initialize_lti_tool_provider, validate_request)
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
from django.conf import settings
from threads.views import render_main_thread
from threads.models import Thread, Notification


@csrf_exempt
def launch(request):
    validate_request(request)
    tool_provider = initialize_lti_tool_provider(request)

    def hash_anon_id(user):
        # uuid is used to generate a random number
        salt = uuid.uuid4().hex
        return hashlib.sha256(salt.encode() + user.encode()).hexdigest() + ':' + salt

    # collect anonymous_id and consumer key in order to fetch LTIProfile
    # if it exists, we initialize the tool otherwise, we create a new user
    # user_id = get_lti_value('user_id', tool_provider)
    user_id = "tempSessionID"
    request.session['anon_id'] = user_id  # hash_anon_id(user_id)
    debug_printer('DEBUG - Found anonymous ID in request: %s' % user_id)

    # course = get_lti_value(settings.LTI_COURSE_ID, tool_provider)
    course = "tempCourse"
    request.session['course_id'] = course
    debug_printer('DEBUG - Found course being accessed: %s' % course)

    is_instructor = "Student" in settings.ADMIN_ROLES
    request.session['is_instructor'] = is_instructor
    debug_printer('DEBUG - Found is_instructor being accessed: %s' % is_instructor)

    threads = Thread.objects.filter(course_id=course, topic="Current")
    notifications = Notification.getNotificationsFromThreads(threads, user_id)

    return render_main_thread(
        request,
        {
            'threads': threads,
            'is_instructor': is_instructor,
            'current_topic': "Current",
            'notifications': notifications
        }
    )
