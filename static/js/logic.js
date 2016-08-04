/*
 * logic.js
 * -- Controller--
 * Runs all the actual calculations calls to and from views.
 */
(function($) {

    // initializes logic function
    $.Logic = function(options) {
        this.init();
        return this;
    };

    // connects the functions bellow to evens in the pub/sub model
    $.Logic.prototype.init = function() {
        jQuery.subscribe('ltithreads.submitThread', this.submitThread.bind(this));
        jQuery.subscribe('ltithreads.getReplies', this.getReplies.bind(this));
        jQuery.subscribe('ltithreads.submitReply', this.submitReply.bind(this));
        jQuery.subscribe('ltithreads.addPseudos', this.addPseudos.bind(this));
        jQuery.subscribe('ltithreads.resetPseudos', this.resetPseudos.bind(this));
        jQuery.subscribe('ltithreads.makeAjaxRequestViaSub', this.makeAjaxRequestViaSub.bind(this));
        jQuery.subscribe('ltithreads.removeNotification', this.removeNotificationViaSub.bind(this));
        jQuery.subscribe('ltithreads.changeTopic', this.changeTopicViaSub.bind(this));
    };

    // actually does an ajax call. it creates a standard for requests to be logged
    $.Logic.prototype.makeAjaxRequest = function(method, url, data, fail, success) {
        var real_fail = fail;
        if (typeof fail !== "function") {
            real_fail = function() {
                jQuery.publish('ltithreads.failureMessage');
                jQuery.publish('logThatThing', [fail, data.update({'url': url}), 'harvardx', 'ltithreads']);
            };
        }
        jQuery.ajax({
            method: method,
            url: url,
            async: true,
            data: data,
            fail: real_fail,
            success: success
        });
    };

    // function wrapper for pub/sub
    $.Logic.prototype.makeAjaxRequestViaSub = function(_, method, url, data, fail, success) {
        this.makeAjaxRequest(method, url, data, fail, success);
    }

    // if websockets fails, this should be the backup
    $.Logic.prototype.polling_success = function() {
        //TODO
    };

    // runs when user has hit the submit thread button
    $.Logic.prototype.submitThread = function(_, title, post_thread_url, topic, csrf) {
        var self = this;

        // if successful, it logs the call and closes the threadmaker text area
        var success = function(reply) {
            jQuery.publish('logThatThing', ['success_create_thread', reply, 'harvardx', 'ltithreads']);
            jQuery.publish('closeThreadMaker');
        };
        var fail = 'failed_create_thread';

        // makes the request
        this.makeAjaxRequest('POST', post_thread_url, {
            'title': title,
            'topic': topic,
            'csrfmiddlewaretoken': csrf
        }, fail, success);
    };

    // runs when user has hit the submit reply button
    $.Logic.prototype.submitReply = function(_, reply, post_reply_url, csrf) {
        var self = this;

        // logs when the reply was successfully made
        var success = function(ajax_reply) {
            jQuery.publish('logThatThing', ['success_create_reply', ajax_reply, 'harvardx', 'ltithreads']);
        };

        // if there's a failure, it closes out the rapid submit function so user can try again
        var fail = function() {
            jQuery.publish('ltithreads.failureMessage');
            jQuery.publish('logThatThing', ['failed_create_reply', data.update({'url': url}), 'harvardx', 'ltithreads']);
            setTimeout(function() {
                window.rapid_submit = false;
            }, 500);
        };

        // makes the request
        this.makeAjaxRequest('POST', post_reply_url, {
            'reply': reply,
            'csrfmiddlewaretoken': csrf
        }, fail, success);
    };

    // runs when  user sends a thread via websocket...unsure when this will happen...
    $.Logic.prototype.sendThreadViaWebsocket = function(thread) {
        var thread_info = JSON.stringify({
            'type': 'thread_created',
            'thread_id': thread.thread_id,
            'thread_title': thread.message,
            'replyNum': thread.replyNum
        });
        jQuery.publish('ltithreads.websocket.sendThread', [thread_info]);
    };

    // runs when user sends a reply via websocket...unsure when this will happen either...
    $.Logic.prototype.sendReplyViaWebsocket = function(reply) {
        var thread_info = JSON.stringify({
            'type': 'reply_created',
            'pseudo': reply.pseudonym,
            'message': reply.message,
            'updated': reply.updated,
            'reply_id': reply.reply_id,
            'pthread_id': reply.parent_thread_id,
            'poster_id': reply.post_id,
        });
        jQuery.publish('ltithreads.websocket.sendReply', [thread_info]);
    };

    // runs when you get a message from the server. The three main functions so far are:
    // thread_created : runs when someone (maybe yourself) has created a new thread
    // reply_created  : runs when someone (maybe yourself) has created a new reply
    // notification   : runs when someone mentioned you in a thread
    $.Logic.prototype.decode_message = function(message) {
        
        console.log(message);
        if (message.type === "thread_created") {
            // TODO: Figure out how to differentiate between someone else's threads and your own
            jQuery.publish('ltithreads.view.addNewThread', [{
                'thread_id': message.thread_id,
                'message': message.thread_title,
                'replyNum': message.replyNum,
                'pinned': message.pinned
            }, false])
            // increase thread badge in the home button
            jQuery.publish('ltithreads.view.increase_thread_badge');
        } else if (message.type === 'reply_created') {
            // TODO: Figure out how to differentiate between someone else's replies and your own
            jQuery.publish('ltithreads.view.addNewReply', [{
                'pseudonym': message.pseudo,
                'message': message.message,
                'updated_date': message.updated,
                'updated': message.updated,
                'reply_id': message.reply_id,
                'parent_thread_id': message.pthread_id,
                'pthread_id': message.pthread_id,
                'replyNum': message.newReplyCount
            }, message.pthread_id, false]);

            // increase the badge in the parent thread for this reply
            jQuery.publish('ltithreads.view.increase_replies_badge', [message.pthread_id]);
            jQuery.publish('ltithreads.view.scrollToReply', [message.reply_id, message.pthread_id]);
        } else if (message.type === 'notification') {

            // shows notification and adds it to the sidebar via pub/sub
            jQuery.publish('ltithreads.view.showNotification', [{
                'thread_id': message.thread_id,
                'reply_id': message.reply_id,
                'remove_notification_url': message.remove_notification_url,
            }]);
        } else if (message.type === 'created-thread') {

            // send a message for view to scroll to element once created
            jQuery.publish('ltithreads.view.scrollToThread', [message.thread_id]);
        } else if (message.type === 'created-reply') {

            // send a message for view to scroll to element once created
            jQuery('#textarea-for-' + message.parent_thread_id).val('');
            var whenFound = function() {
                if (jQuery('#replies-for-' + message.parent_thread_id).length !== 0) {
                    jQuery('#replies-for-' + message.parent_thread_id + ' + .submit-reply-inline .who-am-i').html('In this thread, you were ' + message.pseudonym);
                } else {
                    setTimeout(whenFound, 500);
                }
            }
            whenFound();

            jQuery.publish('ltithreads.view.scrollToReply', [message.reply_id]);
        }
    };

    // runs when user clicked on a thread to open it
    $.Logic.prototype.getReplies = function(_, thread_id, replies_url) {
        var id = parseInt(thread_id, 10);
        var fail = 'failed_retrieve_replies';

        // if successful it creates the container for replies and adds them to the list
        var success = function(data) {
            jQuery.publish('ltithreads.view.loadReplies', [data, thread_id]);
        };

        // makes request
        this.makeAjaxRequest('GET', replies_url, {}, fail, success);
    };

    // sends link to add new pseudonyms to this course
    $.Logic.prototype.addPseudos = function(_, url, link_to_pseudos, success, csrf) {
        var self = this;
        var fail = 'instructor_error_linking_to_pseudo_list';
        console.log('clicked here');
        this.makeAjaxRequest('POST', url, {
            'address': link_to_pseudos
        }, fail, success);
    };

    // resets pseudonyms for current course
    $.Logic.prototype.resetPseudos = function(_, url, success) {
        var self = this;
        var fail = 'instructor_error_resetting_pseudos';
        this.makeAjaxRequest('GET', url, {}, success);
    };

    // remove notification and decrease notification badge
    $.Logic.prototype.removeNotification = function(url, notification_container, thread_id, post_id) {
        var self = this;
        var fail = 'failed_remove_notification';
        var success = function(data) {
            notification_container.remove();
            jQuery.publish('ltithreads.view.decreaseBadge');
        };
        this.makeAjaxRequest('GET', url, {}, fail, success)
    };

    // wrapper function for pub/sub
    $.Logic.prototype.removeNotificationViaSub = function(_, url, notification_container, thread_id, post_id) {
        this.removeNotification(url, notification_container, thread_id, post_id);
    };

    // instructor has changed topic
    $.Logic.prototype.changeTopic = function(topic_url, topic, topic_title, csrf) {
        var self = this;
        var fail = 'failed_change_topic';

        // if they succeeded in changing topic of a thread
        var success = function(data) {
            if (data.message === "Success" && data.topic !== jQuery('.drawer.drawer-menu').html().trim()) {
                // if it's not in the current topic, the thread gets removed
                jQuery('#item-' + data.thread).remove();
            }

            // hide pop up
            jQuery('.popup-background').hide();

            // go through and see if the topic is new or an existing one
            var found = false;
            jQuery.each(jQuery('.drawer.drawer-topic'), function(index, value) {
                if (jQuery(value).html().trim() === data.topic) {
                    found = true;
                }
            });

            // if it's new, it creates a new button to change to
            if (!found) {
                jQuery('.drawer.drawer-contents').append('<div class="drawer drawer-topic" data-topic="'+data.topic+'">' + data.topic + '</div>');
            }
        }

        // makes request
        this.makeAjaxRequest('POST', topic_url, {
            'topic': topic,
            'new-topic-title': topic_title,
            'csrfmiddlewaretoken': csrf
        }, fail, success);
    };

    // wrapper function for pub/sub
    $.Logic.prototype.changeTopicViaSub = function(_, topic_url, topic, topic_title, csrf) {
        this.changeTopic(topic_url, topic, topic_title, csrf);
    };
    
} (HxThreads));
