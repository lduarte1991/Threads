from django.test import TestCase
import uuid
import time
import oauth2
import hashlib
from utils import *
from django.test.client import RequestFactory
from django.core.exceptions import PermissionDenied
import sys
import jwt


class LTIViewsTests(TestCase):

    def setUp(self):
        self.userid = unicode(uuid.uuid4().__str__())
        params = {
            u"context_id": u"course-v1:HarvardX+HxAT101+2015_T4",
            u"custom_collection_id": u"747e0b51-bba8-4941-a282-111720f52f0b",
            u"custom_object_id": u"29",
            u"launch_prenetation_return url": u"",
            u"lis_outcome_service_url": u"",
            u"lis_person_sourcedid": u"NAME" + self.userid,
            u"lis_result_sourcedid": u"S3294476",
            u"lti_message_type": u"basic-lti-launch-request",
            u"lti_version": u"LTI-1p0",
            u"oauth_callback": u"about:blank",
            u"oauth_consumer_key": u"threads-harvardx-harvard-aa3cab",
            u"oauth_nonce": unicode(uuid.uuid1().__str__()),
            u"oauth_signature_method": u"HMAC-SHA1",
            u"oauth_timestamp": unicode(int(time.time())),
            u"oauth_scheme": u'body',
            u"oauth_version": u'1.0',
            u"resource_link_id": u"edge.edx.org-9dcef10b976e49dda3aa6ebcc613b0f6",  # noqa
            u'roles': u"Instructor",
            u"user_id": unicode(self.userid)
        }
        consumer = oauth2.Consumer(key=u"threads-harvardx-harvard-aa3cab", secret=u"266abd2d-4c64-4b2d-8661-f4cabc0b3d66")  # noqa
        params.update({u'oauth_consumer_key': unicode(consumer.key)})
        request = oauth2.Request(method="POST", url="http://testserver/lti/launch/", parameters=params)  # noqa
        signature_method = oauth2.SignatureMethod_HMAC_SHA1()
        request.sign_request(signature_method, consumer, None)

        return_params = {}
        for key in request:
            if request[key] == None:
                return_params[key] = None
            elif isinstance(request[key], list):
                return_params[key] = request.get_parameter(key)
            else:
                return_params[key] = request.get_parameter(key)
        self.params_ = return_params

    def test_launch_no_permissions(self):
        resp = self.client.get('/lti/launch/')
        self.assertEqual(resp.status_code, 403)
        self.assertFalse('threads' in resp.context)

    def test_launch_with_permissions(self):
        resp = self.client.post('/lti/launch/', self.params_)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue('threads' in resp.context)
        self.assertTrue('is_instructor' in resp.context)
        self.assertTrue('current_topic' in resp.context)
        self.assertTrue('noPseudos' in resp.context)

    def test_launch_as_instructor(self):
        resp = self.client.post('/lti/launch/', self.params_)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue('is_instructor' in resp.context)
        self.assertEqual(resp.context['is_instructor'], True)

    def test_launch_as_student(self):
        self.params_['roles'] = u"Student"
        consumer = oauth2.Consumer(key=u"threads-harvardx-harvard-aa3cab", secret=u"266abd2d-4c64-4b2d-8661-f4cabc0b3d66")  # noqa
        request = oauth2.Request(method="POST", url="http://testserver/lti/launch/", parameters=self.params_)  # noqa
        signature_method = oauth2.SignatureMethod_HMAC_SHA1()
        request.sign_request(signature_method, consumer, None)

        return_params = {}
        for key in request:
            if request[key] == None:
                return_params[key] = None
            elif isinstance(request[key], list):
                return_params[key] = request.get_parameter(key)
            else:
                return_params[key] = request.get_parameter(key)
        self.params_ = return_params
        resp = self.client.post('/lti/launch/', self.params_)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue('is_instructor' in resp.context)
        self.assertEqual(resp.context['is_instructor'], False)


class UtilsTests(TestCase):

    def setUp(self):
        self.userid = unicode(uuid.uuid4().__str__())
        params = {
            u"context_id": u"course-v1:HarvardX+HxAT101+2015_T4",
            u"custom_collection_id": u"747e0b51-bba8-4941-a282-111720f52f0b",
            u"custom_object_id": u"29",
            u"launch_prenetation_return url": u"",
            u"lis_outcome_service_url": u"",
            u"lis_person_sourcedid": u"NAME" + self.userid,
            u"lis_result_sourcedid": u"S3294476",
            u"lti_message_type": u"basic-lti-launch-request",
            u"lti_version": u"LTI-1p0",
            u"oauth_callback": u"about:blank",
            u"oauth_consumer_key": u"threads-harvardx-harvard-aa3cab",
            u"oauth_nonce": unicode(uuid.uuid1().__str__()),
            u"oauth_signature_method": u"HMAC-SHA1",
            u"oauth_timestamp": unicode(int(time.time())),
            u"oauth_scheme": u'body',
            u"oauth_version": u'1.0',
            u"resource_link_id": u"edge.edx.org-9dcef10b976e49dda3aa6ebcc613b0f6",  # noqa
            u'roles': u"Instructor",
            u"user_id": unicode(self.userid)
        }
        consumer = oauth2.Consumer(key=u"threads-harvardx-harvard-aa3cab", secret=u"266abd2d-4c64-4b2d-8661-f4cabc0b3d66")  # noqa
        params.update({u'oauth_consumer_key': unicode(consumer.key)})
        request = oauth2.Request(method="POST", url="http://testserver/lti/launch/", parameters=params)  # noqa
        signature_method = oauth2.SignatureMethod_HMAC_SHA1()
        request.sign_request(signature_method, consumer, None)

        return_params = {}
        for key in request:
            if request[key] == None:
                return_params[key] = None
            elif isinstance(request[key], list):
                return_params[key] = request.get_parameter(key)
            else:
                return_params[key] = request.get_parameter(key)
        self.params_ = return_params
        self.params_without_consumer_key = return_params.copy()
        self.params_without_consumer_key.pop('oauth_consumer_key', None)
        self.params_without_user_id = return_params.copy()
        self.params_without_user_id.pop('user_id', None)
        self.factory = RequestFactory()

    def test_hash_anon_id(self):
        username = "fake_username_for_threads"
        hashed_username = hash_anon_id(username)

        hashed, salt = hashed_username.split('__')
        return hashed == hashlib.sha256(salt.encode() + username.encode()).hexdigest()  # noqa

    def test_validate_request(self):
        request1 = self.factory.post('/lti/launch/', self.params_)
        try:
            validate_request(request1)
        except:
            self.fail("Error occurred in validate_request for some reason %s" % sys.exc_info()[0])  # noqa
        request2 = self.factory.post('/lti/launch/', self.params_without_consumer_key)  # noqa
        self.assertRaises(PermissionDenied, validate_request, request2)
        request3 = self.factory.post('/lti/launch/', self.params_without_user_id)  # noqa
        self.assertRaises(PermissionDenied, validate_request, request3)

    def test_initialize_lti_tool_provider(self):
        request1 = self.factory.post('/lti/launch/', self.params_)
        try:
            provider = initialize_lti_tool_provider(request1)
        except:
            self.fail("Error occurred in initialize_lti_tool_provider for some reason %s" % sys.exc_info()[0])  # noqa

    def test_get_lti_value(self):
        request1 = self.factory.post('/lti/launch/', self.params_)
        provider = initialize_lti_tool_provider(request1)
        self.assertEqual('29', get_lti_value('custom_object_id', provider))
        self.assertEqual(self.userid, get_lti_value('user_id', provider))

    def test_retrieve_token(self):
        userid = 'Fake ID'
        apikey = 'Fake_API_key'
        secret = 'Fake_secret'

        token = retrieve_token(userid, apikey, secret)

        decoded = jwt.decode(token, secret)
        self.assertEqual(userid, decoded['userId'])
        self.assertEqual(apikey, decoded['consumerKey'])
