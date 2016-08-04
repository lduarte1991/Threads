/*
 * views.js
 * -- View Controller -- 
 * Should be the only file that actually interacts with jQuery selectors. Most of them will be included via options to allow for quick
 * updating if the UI needs to be changed in the future.
 */

(function($) {

    // instantiates all the selectors and elements to local variables for easy retrieval
    $.View = function(options) {
        try {
            this.initOptions = options;
            this.openThreadMakerButton = jQuery(options['thread_maker_opener']);
            this.threadMaker = jQuery(options['thread_maker']);
            this.threadMakerTextArea = jQuery(options['thread_maker_text']);
            this.threadMakerSubmitButton = jQuery(options['thread_maker_submit']);
            this.threadMakerCancelButton = jQuery(options['thread_maker_cancel']);
            this.threadsList = jQuery(options['threads_list']);
            this.drawerButtons = jQuery(options['drawer_buttons']);
            this.drawerHome = jQuery(options['drawer_home']);
            this.drawerHomeBadge = jQuery(options['drawer_home_badge']);
            this.drawerBars = jQuery(options['drawer_bars']);
            this.drawerBarsBadge = jQuery(options['drawer_bars_badge']);
            this.drawerMentions = jQuery(options['drawer_mentions']);
            this.drawerTopics = jQuery(options['drawer_topics']);
            this.drawerThinBar = jQuery(options['drawer_thin_bar']);
            this.drawer = jQuery(options['drawer']);
            this.drawerGear = jQuery(options['drawer_gear']);
            this.floatingBox = jQuery(options['floating_box']);
            this.addPseudosButton = jQuery(options['adding_pseudos']);
            this.addPseudosTextField = jQuery(options['adding_pseudos_text']);
            this.resetPseudosButton = jQuery(options['reset_pseudos']);
            this.notificationButton = jQuery(options['notification_button']);
            this.mentionTitle = jQuery(options['mention_title']);
            this.notification = jQuery(options['notification']);
            this.repliesAdded = [];
            this.repliesToBePrinted = '';
        } catch(e){
            console.log("Warning! View was not created correctly");
        }
        this.init();

        return this;
    };

    // Called once and should contain the broadest ways to call elements in case they are
    // made dynamically, i.e. the jQuery "on" function based on body but calling an inner element
    $.View.prototype.init = function() {
        var self = this;

        // creates and stores the templates in a local variable
        self.createTemplates();

        // Connects all "buttons" that should be clicked to their appropriate functions
        jQuery('body').on('click', self.initOptions['thread_maker_opener'], self.openThreadMaker.bind(self));
        jQuery('body').on('click', self.initOptions['thread_maker_cancel'], self.closeThreadMaker.bind(self));
        jQuery('body').on('click', self.initOptions['thread_maker_submit'], self.submitThread.bind(self));
        jQuery('body').on('click', '.thread-item', self.openThread);
        jQuery('body').on('click', '.submit-reply-inline-button', self.submitReply);
        //jQuery('body').on('click', self.initOptions['drawer_home'], self.clickedHomeButton.bind(self));
        jQuery('body').on('click', self.initOptions['drawer_bars'], self.clickedSidebarButton.bind(self));
        jQuery('body').on('click', self.initOptions['drawer_topics'], self.selectedTopic.bind(self));
        jQuery('body').on('click', self.initOptions['scroll-to-top'], self.scrollToTop.bind(self));
        jQuery('body').on('click', self.initOptions['scroll-to-bottom'], self.scrollToBottom.bind(self));
        jQuery('body').on('click', self.initOptions['drawer_mentions'], self.mentionClicked.bind(self));
        jQuery('body').on('click', self.closeAllThings.bind(self));
        jQuery('body').on('keyup', '.submit-reply-inline textarea', self.textareaInput.bind(self));
        jQuery('body').on('paste', '.submit-reply-inline textarea', self.textareaInput.bind(self));

        // events in the pub/sub model for the view to interact with the logic component
        jQuery.subscribe('closeThreadMaker', self.closeThreadMaker.bind(self));
        jQuery.subscribe('ltithreads.view.addNewThread', self.addNewThreadViaPub.bind(self));
        jQuery.subscribe('ltithreads.view.addNewReply', self.addNewReplyViaPub.bind(self));
        jQuery.subscribe('ltithreads.view.showNotification', self.createMentionPopupViaPub.bind(self));
        jQuery.subscribe('ltithreads.view.increase_thread_badge', self.increaseThreadBadgeViaPub.bind(self));
        jQuery.subscribe('ltithreads.view.decreaseBadge', self.decreaseBadgeViaPub.bind(self));
        jQuery.subscribe('ltithreads.view.increase_replies_badge', self.increaseRepliesBadgeViaPub.bind(self));
        jQuery.subscribe('ltithreads.view.loadReplies', self.loadReplies.bind(self));
        jQuery.subscribe('ltithreads.view.addedNewReply', self.addedNewReply.bind(self));
        jQuery.subscribe('ltithreads.view.scrollToThread', self.scrollToThread.bind(self));
        jQuery.subscribe('ltithreads.view.scrollToReply', self.scrollToReply.bind(self));
    };

    // should create a jiggling icon on the screen warning users of an error
    $.View.prototype.warnUser = function(text) {
        // add a warning button
        this.drawerButtons.append('<div class="button jiggle" style="color:yellow;"><i class="fa fa-warning"></i></div>');
        
        // create a label for when you hover over it
        new Opentip(jQuery('.button.jiggle'), {
            showOn: 'click',
            tipJoint: 'left',
            style: 'alert',
            title: text
        });

        // when it clicks, remove jiggle effect and turn it white.
        jQuery('.button.jiggle').click(function() {
            jQuery(this).removeClass('jiggle');
            jQuery(this).css('color', 'white');
        });
    };

    // if there are certain options that should be chosen based on browsers, this function allows for that pick to be made
    $.View.prototype.chooseBasedOnBrowser = function(chrome, safari, firefox, opera, firefox, ie) {
        var useragent = window.navigator.userAgent;
        if (useragent.indexOf('Chrome')) {
            return chrome;
        } else if (useragent.indexOf('Safari')) {
            if (safari === undefined) {
                return chrome;
            }
            return safari;
        } else if (useragent.indexOf('Firefox')) {
            if (firefox === undefined) {
                return chrome;
            }
            return firefox;
        } else if (useragent.indexOf('MSIE')) {
            if (ie === undefined) {
                return chrome;
            }
            return ie;
        } else if (useragent.indexOf('Opera')) {
            if (opera === undefined) {
                return chrome;
            }
            return opera;
        } else {
            return chrome;
        }
    };

    // will be called every time there is a new thread made. 
    $.View.prototype.addNewThread = function(thread, shouldFocus) {
        if (jQuery('#item-' + thread.thread_id).length > 0) {
            return;
        }
        // if there is an admin, get the admin value and needed urls
        var admin_panel = window.admin_panel ? window.admin_panel.replace(/\[\[thread_id\]\]/g, thread.thread_id) : "";
        
        // add the thread to the top of the list
        var pinned = thread.pinned ? ' pinned' : '';
        var hidden = thread.hidden ? ' admin-hidden': '';
        var deleted = thread.deleted ? ' admin-deleted' : '';
        var template_stuff = jQuery.extend({}, thread, {
            'admin_panel': admin_panel,
            'pinned': pinned,
            'hidden': hidden,
            'deleted': deleted
        });

        // if it is a pinned thread, it adds it to the top, otherwise it adds it to the list below the pinned threads
        if (thread.pinned) {
            jQuery('.threads-list').prepend(this.templateHolder['thread'](template_stuff));
        } else {
            jQuery('.add-threads-after').after(this.templateHolder['thread'](template_stuff));
        }
        

        if (shouldFocus) {
            // for accessibility, focus on the new thread
            jQuery('#item-' + thread.thread_id).focus();
        }
    };

    // wrapper that calls "addNewThread" but is used to listen to published events
    $.View.prototype.addNewThreadViaPub = function(_, thread, shouldFocus) {
        this.addNewThread(thread, shouldFocus);
    };

    // will be called every time there is a new reply made
    $.View.prototype.addNewReply = function(reply, parent_thread_id, shouldFocus) {
        // if that reply already exists (for whatever reason) then exit out of this function
        if (jQuery('#reply-item-' + reply.reply_id).length !== 0) {
            return;
        }

        // put in the appropriate statuses...not really relevant to learners (only instructors)
        var status = '';
        if (reply.deleted && window.reply_admin_panel) {
            status = ' admin-deleted';
        }
        if (reply.hidden && window.reply_admin_panel) {
            status = ' admin-hidden';
        }

        // if the user is an admin that information will be elsewhere in the html so retrieve it.
        var admin_panel = window.reply_admin_panel
        if (admin_panel === undefined) {
            admin_panel = '';
        } else {
            admin_panel = admin_panel.replace(/\[\[post_id\]\]/g, reply.reply_id);
        }

        var self = this;

        self.repliesAdded.push(parent_thread_id);
        // passes information into the template to create an element formatted exactly
        jQuery('#replies-for-' + parent_thread_id + ' .scroll-to-top').before(self.templateHolder['reply']({
            'status': status,
            'admin_panel': admin_panel,
            'thread_id': parent_thread_id,
            'reply': reply
        }));

        // checks to make sure that all "@" mentions are color-coded
        var unique_pseudos = jQuery.unique(jQuery('.reply-pseudo').map(function(){return this.innerHTML.replace(':', '');}).get());
        jQuery.each(unique_pseudos, function(index, value) {
            var regex = new RegExp('@' + value, 'g');
            jQuery('.reply-item .reply-message').map(function() {return this.innerHTML = this.innerHTML.replace(regex, '<span style="color:red;">@'+value+'</span>')}).get()
        });

        // changes all time stamps to dynamically changing elements (e.g. one minute ago, or 1 hour ago)
        jQuery('time.timeago').timeago();

        // calls clean up function after the reply
        reply['parent_thread_id'] = parent_thread_id;
        self.repliesAdded.pop();
        this.addedNewReply(reply, shouldFocus);
    };

    // wrapper function for pub/sub
    $.View.prototype.addedNewReplyViaPub = function(_, reply) {
        this.addedNewReply(reply, false);
    };

    // wrapper function for pub/sub
    $.View.prototype.addNewReplyViaPub = function(_, reply, parent_thread_id, shouldFocus) {
        this.addNewReply(reply, parent_thread_id, shouldFocus);
    };

    // this function increases a particular badge by "1". Badges being the little numbers that appear
    // when a new thread or reply is created.
    $.View.prototype.increaseBadge = function(badge_location) {

        // if the call doesn't include a badge_location it means it should increase the counter in the home badge
        if (badge_location === undefined) {
            var counter = parseInt(this.drawerHomeBadge.data('counter'), 10) + 1;
            this.drawerHomeBadge.data('counter', counter);
            this.drawerHomeBadge.html(counter);
            this.drawerHomeBadge.show();
        } else {
            // if there was a badge location it means it was a new reply for a thread
            // so it increases that counter by 1
            var pthread = jQuery('#item-' + badge_location);
            var counter = parseInt(pthread.data('counter'), 10) || 0;
            counter = counter + 1;
            pthread.data('counter', counter);
            var badge = pthread.find('.button-badge.onred');

            if (badge.length == 0) {
                pthread.append('<span class="button-badge onred" tabindex="0" aria-label="'+(counter)+' new replies in this thread.">' + (counter) + '</span>');
            } else {
                badge.html(counter);
                badge.show();
            }
        }
        
    };

    // similar to above but decreases the notification number by 1 since all other actions that decrease badges just reset to 0
    $.View.prototype.decreaseBadge = function() {
        var counter = parseInt(this.notificationButton.data('counter'), 10) - 1;
        if (counter <= 0) {
            this.notificationButton.hide();
            this.notificationButton.data('counter', 0);
            this.notificationButton.html('0');
            return;
        }

        this.notificationButton.data('counter', counter);
        this.notificationButton.html(counter);
    }

    // wrapper function for pub/sub
    $.View.prototype.decreaseBadgeViaPub = function(_) {
        this.decreaseBadge();
    }

    // wrapper function for pub/sub
    $.View.prototype.increaseThreadBadgeViaPub = function(_) {
        this.increaseBadge();
    };

    // wrapper function for pub/sub
    $.View.prototype.increaseRepliesBadgeViaPub = function(_, badge_location) {
        this.increaseBadge(badge_location);
    };

    // function called when user clicks on thread and tries to load replies
    $.View.prototype.openThread = function(event) {

        // makes sure that the call doesn't run when admin buttons are clicked
        if (!jQuery(event.target).hasClass('thread-item') && !jQuery(event.target).hasClass('thread-title')) {
            return;
        }

        // gets all the needed variables
        var thread_id = jQuery(this).data('thread-id');

        // makes sure to remove all the sibling elements regarding replies
        if (jQuery(this).hasClass('opened')) {
            jQuery('#replies-for-' + thread_id + '+ .submit-reply-inline').remove();
            jQuery('#replies-for-' + thread_id).remove();
            jQuery(this).removeClass('opened');
            jQuery(this).data('page_num', '0');
            return;
        }
        var replies_url = jQuery(this).data('replies-url');

        // check to make sure that user cannot click again while the data is retrieved and have it accidentally close on them
        if (window.busy_vars && window.busy_vars[thread_id] === true) {
            return;
        } else {
            window.busy_vars = window.busy_vars || {};
            window.busy_vars[thread_id] = true;
        }

        // log it!
        jQuery.publish('logThatThing', ['clicked_thread', {'thread_id': thread_id}, 'harvardx', 'ltithreads']);
        
        // get logic to make the ajax call
        jQuery.publish('ltithreads.getReplies', [thread_id, replies_url]);
    };

    // function gets called when user wants to create a new thread. This makes the text area appear.
    $.View.prototype.openThreadMaker = function() {
        // moves the fixed white bar up to acommodate the textarea and buttons
        this.threadMaker.animate({
            'margin-bottom': '40px'
        });

        // hides button that toggles the textarea
        this.openThreadMakerButton.hide();

        // adds a bit of padding to the bottom of the threads list so that when the bottom
        // bar covers the threads behind it, you are still able to scroll up to view all of them
        this.threadsList.css('padding-bottom', '255px');

        // accessibility purposes and convenience, focus on the input so you can start typing
        this.threadMakerTextArea.focus();

        // publish event that should log it in edx
        jQuery.publish('logThatThing', ['clicked_button_to_add_new_thread', {}, 'harvardx', 'threadslti']);
    };

    // function gets called after user has filled in text area and wants to actually create the thread.
    $.View.prototype.submitThread = function() {
        // gather all the data needed to submit the thread
        var post_thread_url = this.threadMaker.data('posting');
        var title = this.threadMakerTextArea.val();
        var topic = jQuery('.drawer.drawer-menu').html().trim();
        var csrf = jQuery('input[name="csrfmiddlewaretoken"]').val();

        // log it!
        jQuery.publish('logThatThing', ['clicked_button_to_create_thread', {'thread_title': title}, 'harvardx', 'threadslti']);
        
        // actually create the thread
        jQuery.publish('ltithreads.submitThread', [title, post_thread_url, topic, csrf]);

        this.threadMakerTextArea.val('');
    };


    // function gets called after user has decided not to make a new thread and wants to cancel their 
    $.View.prototype.closeThreadMaker = function(name) {
        var self = this;

        // moves the fixed white bar down to hide the textarea and buttons
        self.threadMaker.animate({
            'margin-bottom': '-200px'
        }, function() {
            // after it moves then the hidden button to toggle it open shows again
            self.openThreadMakerButton.show();
        });
        
        //moves the padding back to its original state since the white bar has been moved down
        self.threadsList.css('padding-bottom', '70px');

        // log it!
        if (name !== '') {
            jQuery.publish('logThatThing', ['clicked_button_to_cancel_adding_new_thread', {}, 'harvardx', 'threadslti']);
        }
        this.threadMakerTextArea.val('');
    };

    // function gets called when a user submits a new reply to a thread
    $.View.prototype.submitReply = function() {
        
        // prevents user from spamming reply button and making multiple replies at once
        if (window.rapid_submit) {
            return;
        } else {
            window.rapid_submit = true;
        }

        // gets all the necessary variables and passes them to logic
        var post_reply_url = jQuery(this).data('reply-url');
        var reply = jQuery('#' + jQuery(this).data('text')).val();
        var csrf = jQuery('input[name="csrfmiddlewaretoken"]').val();

        // log it!
        jQuery.publish('logThatThing', ['clicked_button_to_create_reply', {'reply': reply}, 'harvardx', 'threadslti']);
        
        jQuery.publish('ltithreads.submitReply', [reply, post_reply_url, csrf]);
    };


    // function gets called when a suer hits the home button 
    $.View.prototype.clickedHomeButton = function(event) {

        // the new thread counter gets reset to 0 and user gets sent to default url
        this.drawerHomeBadge.data('counter', '0');
        this.drawerHomeBadge.hide();
        window.location.href = jQuery(event.target).data('url');

        // log it!
        jQuery.publish('logThatThing', ['clicked_home_button', {}, 'harvardx', 'ltithreads']);
    };

    // function gets called when user clicks the sidebar button
    $.View.prototype.clickedSidebarButton = function(event) {

        var self = jQuery(event.target);
        var isOpen = self.hasClass('open');
        if (isOpen) {
            // if it was opened, this closes it
            setTimeout(function(){
                self.removeClass('open');
            });

            this.drawerThinBar.animate({'left': 0});
            this.drawer.animate({'left': '-200px'});
        } else {
            // if it was closed, this opens it
            this.drawer.animate({'left': 0});
            this.drawerThinBar.animate({'left': '200px'});
            self.addClass('open');
        }

        // log it!
        jQuery.publish('logThatThing', ['toggled_side_menu', {'new_state': isOpen ? 'closed' : 'open'}, 'harvardx', 'ltithreads']);
    };

    // function gets called when user clicks on a topic in the sidebar
    $.View.prototype.selectedTopic = function() {

        // if it's not the currently selected topic
        if (!jQuery(event.target).hasClass('selected')) {

            // then go to the appropriate url for that topic
            var new_topic = jQuery(event.target).data('topic');

            // log it first!
            jQuery.publish('logThatThing', ['clicked_button_to_switch_topics', {'topic': new_topic}, 'harvardx', 'ltithreads']);
            window.location.href = '/threads/filter/' + encodeURIComponent(new_topic);
        }
    };

    // function gets called when user clicks on one of the "Mentions" in the side bar above topics
    $.View.prototype.mentionClicked = function(event) {
        var item = jQuery(event.target);
        var thread_id = item.data('thread-id');
        var post_id = item.data('post-id');
        var url = item.data('url');

        // if the thread was not opened yet, this triggers it open
        if (!jQuery('#item-' + thread_id).hasClass('opened')) {
            jQuery('#item-' + thread_id).trigger('click');
        }

        // it closes the side bar (assumes it's opened since you clicked on a mention)
        this.drawerBars.trigger('click');

        // calls logic to remove notification so user does not see it every time.
        jQuery.publish('ltithreads.removeNotification', [url, item, thread_id, post_id]);

        // calculates what it needs to do in order to take you to the appropriate reply where you were mentioned.
        var move_to_post = function(thread_id, post_id) {
            var post_holder = jQuery('#replies-for-' + thread_id);
            if (post_holder.length == 0) {
                setTimeout(function() {move_to_post(thread_id, post_id)}, 500);
            } else {
                var post = jQuery('#reply-item-' + post_id);
                if (post.length == 0) {
                    post_holder.animate({scrollTop: post_holder.prop('scrollHeight')});
                    setTimeout(function() {move_to_post(thread_id, post_id)}, 1000);
                } else {
                    var textarea = post_holder.find('.submit-reply-inline');
                    var new_top = post.offset().top + textarea.outerHeight();
                    post_holder.animate({scrollTop: new_top});
                }
            }
        }
        move_to_post(thread_id, post_id);
        jQuery.publish('logThatThing', ['clicked_mentioned_button', {'thread_id': thread_id, 'post_id': post_id}, 'harvardx', 'ltithreads']);
    };

    // this function gets called when a mention was made and the user needs to be notified
    $.View.prototype.createMentionPopup = function(notification) {

        // increase the mention counter
        var mention_counter = parseInt(this.notificationButton.data('counter'), 10) + 1;
        this.notificationButton.data('counter', mention_counter);
        this.notificationButton.html(mention_counter);
        this.notificationButton.show();

        // the "mention" header is hidden if there were no mentions at first. This shows it
        if (jQuery(this.initOptions['mention_title'] + ':visible').length == 0) {
            this.mentionTitle.show();
        }

        // write the text that will be shown in the notification
        var thread_container = '#item-' + notification.thread_id;
        var jthread_container = jQuery(thread_container);

        var text = 'You were mentioned in a post: <br>' + jQuery(thread_container +' .thread-title').html(); 
        this.notification.html(text);

        // has it actually show up on the bottom right hand screen
        this.notification.css('bottom', '0px');

        // if the notification gets click, it takes the user to the appropriate thread
        this.notification.click(function() {
           
            if (!jthread_container.hasClass('opened')) {
                jthread_container.trigger('click');
            }
            jQuery('.new-thread-container').animate({
                scrollTop: jthread_container.offset().top + jQuery('.new-thread-container').scrollTop()
            }, 400);
        });

        // waits five seconds then hides the notification
        var self = this;
        setTimeout(function() {
                self.notification.css('bottom', '-99px');
        }, 5000);

        // creates a persistent mention element in the sidebar above the topics
        this.mentionTitle.after('<div class="drawer drawer-mentions" data-thread-id="'+notification.thread_id+'" data-post-id="'+notification.reply_id+'" data-url="'+notification.remove_notification_url+'">'+text+'</div>')
    };


    // wrapper function for pub/sub
    $.View.prototype.createMentionPopupViaPub = function(_, notification) {
        this.createMentionPopup(notification);
    };

    // function gets called when the user hits thread and opens up the reply box
    $.View.prototype.loadReplies = function(_, replies, thread_id) {
        var thread_item = jQuery('.thread-item#item-' + thread_id);
        var thread_badge = thread_item.find('.button-badge.onred');
        var posting_url = thread_item.data('posting-url');

        // will reset the badge to 0 since they just opened it
        thread_badge.hide();
        thread_item.data('end', 'false');
        thread_item.data('counter', '0');
        thread_item.addClass('opened');

        // passes info to template
        thread_item.after(this.templateHolder['replies_list']({
            'thread_id': thread_id,
            'posting_url': posting_url
        }));

        var self = this;
        jQuery.each(replies, function(index, reply) {

            // if the reply holds information for the user, i.e. page number and what their pseduonym is in the thread
            if (reply.pageNum !== undefined) {
                var thread_replies = jQuery('#replies-for-' + thread_id);
                var thread_replies_submit = thread_replies.find('+ .submit-reply-inline');
                thread_item.data('page_num', reply.pageNum);
                if (reply.pseudo !== undefined && reply.pseudo === "") {
                    thread_replies_submit.prepend('<div tabindex="0" class="who-am-i">You have not yet joined this conversation.</div>');
                } else if (reply.pseudo !== undefined) {
                    thread_replies_submit.prepend('<div tabindex="0" class="who-am-i">In this thread, you were '+reply.pseudo+'</div>');
                }
            } else {

                // otherwise it gets made like a reply
                self.addNewReply(reply, thread_id, false);
            }
        });
        //TODO: Paginate when scrolling
        window.busy_vars[thread_id] = false;
        self.paginate(thread_id);
        var container = jQuery('#replies-for-' + thread_id);
        container.scroll(function() {
            var shouldStop = jQuery('#item-' + thread_id).data('end');
            if (shouldStop !== 'true' && parseInt(container.scrollTop(), 10) >= parseInt((container.prop('scrollHeight') - container.height()) / 1.1, 10)) {
                if (window.pagination) {
                    return;
                } else {
                    window.pagination = true;
                    self.paginate(thread_id);
                }
            }
        });
    };

    // function that runs after a new reply
    $.View.prototype.addedNewReply = function(reply, shouldFocus) {
        
        // if the new reply is yours
        if (jQuery('#replies-for-' + reply.parent_thread_id + ' + .submit-reply-inline .who-am-i').html() === "You have not yet joined this conversation.") {
            
        }

        // this let's you submit again
        setTimeout(function() {
            window.rapid_submit = false;
        }, 500);

        if (shouldFocus) {
            // will scroll the thread list to the location of the animation
            jQuery('.new-thread-container').animate({
                scrollTop: jQuery('#item-' + reply.parent_thread_id).offset().top
            });
            jQuery('#replies-for-'+ reply.parent_thread_id).animate({
                scrollTop: jQuery('#replies-for-' + reply.parent_thread_id)[0].scrollHeight
            }, 500);
        }

        // clear text area
        //jQuery('#textarea-for-' + reply.parent_thread_id).val('');

        // change the reply count in the thread being replied to
        jQuery('.thread-item#item-' + reply.parent_thread_id + ' .replies-count').html(reply.replyNum);

    };

    // function calls the templates for the threads and replies to be done dynamically but consistent
    $.View.prototype.createTemplates = function() {
        var self = this;
        self.templateHolder = {
            'thread': undefined,
            'reply': undefined,
            'mention': undefined,
            'replies_list': undefined
        }
        jQuery.each(this.templateHolder, function(index, value) {
            jQuery.ajax({
                method: 'GET',
                url: '/static/templates/' + index + '.html',
                success: function(data) {
                    self.templateHolder[index] = _.template(data);
                }
            })
        });
    };

    // when clicked, this will take the user to the first reply on the list
    $.View.prototype.scrollToTop = function(event) {
        var id = jQuery(event.target).data('id');
        jQuery('#replies-for-' + id + ' .reply-item').first()[0].focus();
        jQuery.publish('logThatThing', ['scrolled_to_first_reply', {'thread_id': id}, 'harvardx', 'ltithreads']);

    };

    // when clicked, this will take the user to the last reply on the list
    $.View.prototype.scrollToBottom = function(event) {
        var id = jQuery(event.target).data('id');
        jQuery('#replies-for-' + id + ' .reply-item').last()[0].focus();
        jQuery.publish('logThatThing', ['scrolled_to_last_reply', {'thread_id': id}, 'harvardx', 'ltithreads']);
    };

    // when clicked, this closes all the things
    $.View.prototype.closeAllThings = function(event) {
        if (!jQuery(event.target).hasClass('drawer') && !jQuery(event.target).hasClass('fa-bars') && jQuery('.fa.fa-bars').hasClass('open')) {
            jQuery('.fa.fa-bars').trigger('click');
        }
    };

    // given the id, this waits for the given element to show up and then scroll to it.
    $.View.prototype.scrollToElement = function(id, is_thread, other_id) {
        var self = this;

        if (is_thread) {
            if (jQuery('#item-' + id).length === 0) {
                setTimeout(function() {
                    self.scrollToElement(id, is_thread);
                }, 500);
            } else {
                jQuery('.new-thread-container').animate({scrollTop: jQuery('.new-thread-container').scrollTop() + jQuery('#item-' + id).offset().top});
            }
        } else {
            if (jQuery('#reply-item-' + id).length === 0) {
                setTimeout(function() {
                    self.scrollToElement(id, is_thread);
                }, 500);
            } else {
                jQuery('#replies-for-' + other_id).animate({
                    scrollTop: jQuery('#replies-for-' + other_id).scrollTop() + jQuery('#reply-item-' + id).offset().top
                });
            }
        }
    };

    $.View.prototype.scrollToThread = function(_, id) {
        this.scrollToElement(id, true, undefined);
    };

    $.View.prototype.scrollToReply = function(_, id, thread_id) {
        this.scrollToElement(id, false, thread_id);
    };

    $.View.prototype.textareaInput = function(event) {
        var textarea = jQuery(event.target);
        var input = textarea.val();
        var limit = 3000;

        if (input.length >= limit) {
            textarea.val(textarea.val().substring(0, limit-1));
            var warning = new Opentip(textarea, {
                showOn: 'creation',
                tipJoint: 'bottom',
                style: 'alert',
                title: "Warning! There is a " + limit + " character limit for replies."
            });

            jQuery.publish('logThatThing', ['exceeded_character_limit', {}, 'harvardx', 'ltithreads']);

        }

    };

    $.View.prototype.paginate = function(thread_id) {
        var container = jQuery('#replies-for-' + thread_id);
        var thread_item = jQuery('#item-' + thread_id);
        var new_page_num = parseInt(jQuery('.thread-item#item-' + thread_id).data('page_num'), 10) + 1;
        var offset_url = '/threads/thread/' + thread_id + '/get_replies/' + new_page_num;
        var self = this;
        jQuery.ajax({
            method: "GET",
            url: offset_url,
            async: true,
            success: function(data) {
                var pseudo_ids = [];
                jQuery.each(data, function(index, reply) {
                    if (reply.end_of_list !== undefined) {
                        jQuery('#item-' + thread_id).data('end', 'true');
                    } else if (reply.pageNum !== undefined) {
                        pseudo_ids = reply.pseudoList;
                        var thread_replies = jQuery('#replies-for-' + thread_id);
                        var thread_replies_submit = thread_replies.find('+ .submit-reply-inline');
                        thread_item.data('page_num', reply.pageNum);
                        
                    } else {
                        // otherwise it gets made like a reply
                        //self.addNewReply(reply, thread_id, false);
                        self.addReplyToBePrinted(reply, thread_id);
                    }
                });
                self.printReplies(thread_id, pseudo_ids);
                var allowPagination = function() {
                    if (self.repliesAdded.length > 0) {
                        setTimeout(allowPagination, 500);
                    } else {
                        window.pagination = false;
                    }
                }
                allowPagination();
            }
        });
    };

    $.View.prototype.addReplyToBePrinted = function(reply, parent_thread_id) {
        var self = this;
         // put in the appropriate statuses...not really relevant to learners (only instructors)
        var status = '';
        if (reply.deleted && window.reply_admin_panel) {
            status = ' admin-deleted';
        }
        if (reply.hidden && window.reply_admin_panel) {
            status = ' admin-hidden';
        }

        // if the user is an admin that information will be elsewhere in the html so retrieve it.
        var admin_panel = window.reply_admin_panel
        if (admin_panel === undefined) {
            admin_panel = '';
        } else {
            admin_panel = admin_panel.replace(/\[\[post_id\]\]/g, reply.reply_id);
        }
        var templated = self.templateHolder['reply']({
            'status': status,
            'admin_panel': admin_panel,
            'thread_id': parent_thread_id,
            'reply': reply
        });
        self.repliesToBePrinted += templated;
    };

    $.View.prototype.printReplies = function(parent_thread_id, pseudo_ids) {
        var self = this;
        // checks to make sure that all "@" mentions are color-coded
        var unique_pseudos = pseudo_ids;
        jQuery.each(unique_pseudos, function(index, value) {
           var regex = new RegExp('@' + value, 'g');
           self.repliesToBePrinted = self.repliesToBePrinted.replace(regex, '<span style="color:red;">@'+value+'</span>');
        });
        jQuery('#replies-for-' + parent_thread_id + ' .scroll-to-top').before(self.repliesToBePrinted);

        // changes all time stamps to dynamically changing elements (e.g. one minute ago, or 1 hour ago)
        jQuery('time.timeago').timeago();
        self.repliesToBePrinted = '';
    };

    $.View.prototype.chartIt = function() {
        var ctx = jQuery('#myChart');
        var topic_list = [];
        jQuery.each(this.drawerTopics, function(index, topic) {
            topic_list.push(jQuery(topic).html().trim());
        });
        var posts = 0;
        jQuery.each(jQuery('.replies-count'), function(index, replies) {
            posts += parseInt(jQuery(replies).html().trim(), 10);
        });
        if (window.Chart !== undefined) {
            var myChart = new Chart(ctx, {
                type:'bar',
                data: {
                    labels:topic_list,
                    datasets: [{
                        label: 'Threads',
                        data: [jQuery('.thread-item').length],
                        borderWidth: 1,
                        backgroundColor: 'rgba(180, 0, 0)',
                        borderColor: 'black',
                    }, {
                        label: 'Posts',
                        data: [jQuery('.thread-item').length],
                        borderWidth: 1,
                        backgroundColor: 'rgba(0, 0, 180)',
                        borderColor: 'black',
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero:true
                            }
                        }]
                    }
                }
            });
        }
    };

}(HxThreads));