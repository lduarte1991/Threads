from django.test import TestCase
import uuid
import time
import oauth2
import jwt


class ThreadsViewsTests(TestCase):
    fixtures = ['threads_views_testdata.json']

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

    def test_post_thread(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #1'}, headers={"X-CSRFToken", csrf})
        self.assertTrue(resp.status_code == 200)
        response_json = resp.json()
        self.assertEqual('Thread #1', response_json['message'])
        self.assertEqual(0, response_json['replyNum'])

    def test_post_reply(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #2'}, headers={"X-CSRFToken", csrf})
        parent_id = resp.json()['thread_id']
        resp = self.client.post('/threads/thread/'+str(parent_id)+'/new_reply/', {'reply': 'Test Reply'}, headers={'X-CSRFToken', csrf})
        self.assertTrue(resp.status_code == 200)
        response_json = resp.json()
        self.assertEqual('Test Reply', response_json['message'])
        self.assertEqual(str(parent_id), str(response_json['parent_thread_id']))

    def test_delete_thread(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #3'}, headers={"X-CSRFToken", csrf})
        parent_id = str(resp.json()['thread_id'])
        resp = self.client.get('/threads/thread/'+parent_id+'/delete/0/')
        self.assertTrue('successfully' in resp.content)
        resp = self.client.get('/threads/thread/'+parent_id+'/delete/1/')
        self.assertTrue('successfully' in resp.content)

    def test_hide_thread(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #4'}, headers={"X-CSRFToken", csrf})
        parent_id = str(resp.json()['thread_id'])
        resp = self.client.get('/threads/thread/'+parent_id+'/hide/0/')
        self.assertTrue('successfully' in resp.content)
        resp = self.client.get('/threads/thread/'+parent_id+'/hide/1/')
        self.assertTrue('successfully' in resp.content)

    def test_delete_post(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #5'}, headers={"X-CSRFToken", csrf})
        parent_id = resp.json()['thread_id']
        resp = self.client.post('/threads/thread/'+str(parent_id)+'/new_reply/', {'reply': 'Test Reply 2'}, headers={'X-CSRFToken', csrf})
        post_id = str(resp.json()['reply_id'])
        resp = self.client.get('/threads/post/' + post_id + '/delete/0/')
        self.assertTrue('successfully' in resp.content)
        resp = self.client.get('/threads/post/' + post_id + '/delete/1/')
        self.assertTrue('successfully' in resp.content)

    def test_delete_post(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #6'}, headers={"X-CSRFToken", csrf})
        parent_id = resp.json()['thread_id']
        resp = self.client.post('/threads/thread/'+str(parent_id)+'/new_reply/', {'reply': 'Test Reply 3'}, headers={'X-CSRFToken', csrf})
        post_id = str(resp.json()['reply_id'])
        resp = self.client.get('/threads/post/' + post_id + '/hide/0/')
        self.assertTrue('successfully' in resp.content)
        resp = self.client.get('/threads/post/' + post_id + '/hide/1/')
        self.assertTrue('successfully' in resp.content)

    def test_new_topic_existing(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #7'}, headers={"X-CSRFToken", csrf})
        parent_id = str(resp.json()['thread_id'])
        resp = self.client.post('/threads/thread/' + parent_id + '/new_topic/', {
            'topic': 'Test'
        })
        response_json = resp.json()
        self.assertEqual("Success", response_json['message'])
        self.assertEqual(str(parent_id), str(response_json['thread']))
        self.assertEqual('Test', response_json['topic'])

    def test_new_topic_brand_new(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/new_thread/', {'title': 'Thread #7'}, headers={"X-CSRFToken", csrf})
        parent_id = str(resp.json()['thread_id'])
        resp = self.client.post('/threads/thread/' + parent_id + '/new_topic/', {
            'topic': 'new-topic-title',
            'new-topic-title': 'Brand Spankin New'
        })
        response_json = resp.json()
        self.assertEqual("Success", response_json['message'])
        self.assertEqual(str(parent_id), str(response_json['thread']))
        self.assertEqual('Brand Spankin New', response_json['topic'])

    def test_reset_pseudos(self):
        resp = self.client.get('/threads/admin/reset_pseudos/')
        self.assertTrue(resp.response_code == 200)
        response_json = resp.json()
        self.assertEqual('Success', response_json['message'])

    def test_add_new_pseudos(self):
        resp = self.client.post('/threads/admin/add_pseudos/', {
            'address': 'https://studio.edge.edx.org/asset-v1:HarvardX+HxAT101+2015_T4+type@asset+block@veggieList.txt'
        })
        self.assertTrue(resp.response_code == 200)
        response_json = resp.json()
        self.assertEqual('Success', response_json['message'])

    def test_remove_notification(self):
        response = self.client.post('/lti/launch/', self.params_)
        csrf = response.client.cookies['csrftoken'].value
        resp = self.client.post('/threads/thread/433/new_reply/', {'reply': '@Gazelle ok'}, headers={'X-CSRFToken', csrf})
        response_json = resp.json()
        if len(response_json['notes']) > 0:
            decoded = jwt.decode(response_json['notes'][0], response_json['post_id'])
            response = self.client.get(response_json['remove_notification_url'])
            self.assertTrue(response.response_code == 200)
            self.assertEqual('Success' in response.json()['message'])
