jQuery.ajaxSetup({
    beforeSend: function(xhr, settings) {
        if (settings.type == 'POST' || settings.type == 'PUT' || settings.type == 'DELETE') {
            function getCookie(name) {
                var cookieValue = null;
                if (document.cookie && document.cookie != '') {
                    var cookies = document.cookie.split(';');
                    for (var i = 0; i < cookies.length; i++) {
                        var cookie = jQuery.trim(cookies[i]);
                        // Does this cookie string begin with the name we want?
                        if (cookie.substring(0, name.length + 1) == (name + '=')) {
                            cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                            break;
                        }
                    }
                }
                return cookieValue;
            }
            if (!(/^http:.*/.test(settings.url) || /^https:.*/.test(settings.url))) {
                // Only send the token to relative URLs i.e. locally.
                //console.log(getCookie('csrftoken'));
                xhr.setRequestHeader("X-CSRFToken", getCookie('csrftoken') || window.csrf_token_backup);
            }
        }
    }
});
window.loadReplies = function(event, replies_url, posting_url) {
    if (jQuery(event.target).hasClass('thread-item')) {
        jQuery(event.target)
    }
    if (!jQuery(event.target).hasClass('thread-item') && !jQuery(event.target).hasClass('thread-title')) {
        return;
    }

    jQuery('.new-replies-container').data("posting", posting_url);
    var thread_id = posting_url.replace('/threads/thread/', '').replace('/new_reply/', '');
    if (window.busy_vars && window.busy_vars[thread_id] === true) {
        return;
    } else {
        window.busy_vars = window.busy_vars || {};
        window.busy_vars[thread_id] = true;
    }

    window.logThatThing('clicked_thread', {
        'thread_id': thread_id,
    });

    jQuery.ajax({
        method: "GET",
        data: {
            'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
        },
        url: replies_url,
        fail: function(data){
            window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
            window.logThatThing('error_retrieving_replies', {
                'thread_id': thread_id
            });
        },
        success: function(data) {
            jQuery('.repliesList').html('');
            jQuery('.thread-item#item-' + thread_id + " .button-badge.onred").hide();
            jQuery('.thread-item#item-' + thread_id).data('end', 'false');
            //jQuery('.new-thread-container').slideUp();
            //jQuery('.new-replies-container').slideDown();
            jQuery('.new-replies-container').data('current_thread', thread_id);
            jQuery('.thread-item#item-' + thread_id).data('counter', '0');
            jQuery('.thread-item#item-' + thread_id).addClass('opened');
            jQuery('.thread-item#item-' + thread_id).after('<div class="same-page-repliesList" aria-live="polite" aria-relevant="additions" tabindex="0" id="replies-for-'+thread_id+'" style="display:none;"><div class="scroll-to-bottom" role="button" data-id="'+thread_id+'">Link to bottom of list</div><div role="button" class="scroll-to-top" data-id="'+thread_id+'">Link to top of list</div></div> <div class="submit-reply-inline"><textarea aria-label="Enter reply for thread." id="textarea-for-'+thread_id+'"></textarea><div class="submit-reply-inline-button" role="button" aria-label="Reply to thread" data-reply-url="'+posting_url+'" data-text="textarea-for-'+thread_id+'" tabindex="0">Reply</div><div class="loading-animation" id="loader-'+thread_id+'"></div></div>');
            window.logThatThing('success_retrieving_replies', {
                'thread_id': thread_id
            });
            window.adjustTextArea = function(thread_id) {
                var container = jQuery('#replies-for-' + thread_id);
                var textarea = container.find('.submit-reply-inline');
                var container_height =  container.height() == 0 ? 43 : container.height();
                var new_top = container.scrollTop() + (container_height - textarea.outerHeight());
                //console.log('Container scrollTop: ' + container.scrollTop() + '\nTextArea Height: ' + textarea.outerHeight() + '\n new_top:' + new_top);
                textarea.css('top', new_top);
                var end = jQuery('.thread-item#item-' + thread_id).data('end');
                var new_page_num = parseInt(jQuery('.thread-item#item-' + thread_id).data('page_num'), 10);
                if (parseInt(container.scrollTop(), 10) > parseInt((container.prop('scrollHeight') - container.height()) / 2, 10) && end !== 'true' && !window.loadingNewReplies) {
                    window.loadingNewReplies = true;
                    var new_page_num = parseInt(jQuery('.thread-item#item-' + thread_id).data('page_num'), 10) + 1;
                    var offset_url = '/threads/thread/' + thread_id + '/get_replies/' + new_page_num;
                    jQuery.ajax({
                        method: "GET",
                        url: offset_url,
                        async: true,
                        success: function(data) {
                            var total = data.length;
                            jQuery.each(data, function(index, reply) {
                                //console.log(reply);
                                if(reply.end_of_list !== undefined) {

                                    jQuery('.thread-item#item-' + thread_id).data('end', 'true');
                                    window.loadingNewReplies = false;
                                    return;
                                }
                                if (reply.pageNum !== undefined) {
                                    jQuery('.thread-item#item-' + thread_id).data('page_num', reply.pageNum)
                                }
                                var status = "";
                                if (reply.deleted && window.reply_admin_panel) {
                                    status = 'admin-deleted';
                                }
                                if (reply.hidden && window.reply_admin_panel) {
                                    status = 'admin-hidden'
                                }

                                if (index == total-1) {
                                    jQuery('.new-replies-container .header-container .header').html(reply.message);
                                } else {
                                    var admin_panel = window.reply_admin_panel
                                    if (window.reply_admin_panel === undefined) {
                                        admin_panel = '';
                                    }
                                    jQuery('#replies-for-' + thread_id + ' .scroll-to-top').after('<div tabindex="0" class="reply-item '+status+'" id="reply-item-'+reply.reply_id+'">'+admin_panel.replace(/\[\[post_id\]\]/g, reply.reply_id)+'<div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message.replace(/\n/g, '<br>') + '</div><time class="reply-date timeago" datetime="'+reply.updated+'">'+reply.updated+'</time></div>');
                                    //jQuery('.repliesList').prepend('<div class="reply-item"><div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message + '</div><div class="reply-date">'+reply.updated+'</div></div>');
                                }
                                var unique_pseudos = jQuery.unique(jQuery('.reply-pseudo').map(function(){return this.innerHTML.replace(':', '');}).get());
                                jQuery.each(unique_pseudos, function(index, value) {
                                    var regex = new RegExp('@' + value, 'g');
                                    jQuery('.reply-item .reply-message').map(function() {return this.innerHTML = this.innerHTML.replace(regex, '<span style="color:red;">@'+value+'</span>')}).get()
                                });
                                jQuery('time.timeago').timeago();
                            });
                            window.loadingNewReplies = false;
                        }
                    });
                }
            }
            jQuery('#replies-for-'+thread_id).scroll(function(){
                window.adjustTextArea(thread_id);}
            );
            var total = data.length;
            jQuery.each(data, function(index, reply) {
                if (reply.pageNum !== undefined) {
                    jQuery('.thread-item#item-' + thread_id).data('page_num', reply.pageNum)
                }

                if (reply.pseudo !== undefined) {
                    if (reply.pseudo === "") {
                        jQuery('#replies-for-' + thread_id + " + .submit-reply-inline").prepend('<div tabindex="0" class="who-am-i">You have not yet joined this conversation.</div>');
                    } else {
                        jQuery('#replies-for-' + thread_id + " + .submit-reply-inline").prepend('<div tabindex="0" class="who-am-i">In this thread, you were '+reply.pseudo+'</div>');
                    }
                }

                var status = "";
                if (reply.deleted && window.reply_admin_panel) {
                    status = 'admin-deleted';
                }
                if (reply.hidden && window.reply_admin_panel) {
                    status = 'admin-hidden'
                }

                if (index == total-1) {
                    jQuery('.new-replies-container .header-container .header').html(reply.message);
                } else {
                    var admin_panel = window.reply_admin_panel
                    if (window.reply_admin_panel === undefined) {
                        admin_panel = '';
                    }
                    jQuery('#replies-for-' + thread_id + ' .scroll-to-top').before('<div class="reply-item '+status+'" tabindex="0" id="reply-item-'+reply.reply_id+'">'+admin_panel.replace(/\[\[post_id\]\]/g, reply.reply_id)+'<div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message.replace(/\n/g, '<br>') + '</div><time class="reply-date timeago" datetime="'+reply.updated+'">'+reply.updated+'</time></div>');
                    //jQuery('.repliesList').prepend('<div class="reply-item"><div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message + '</div><div class="reply-date">'+reply.updated+'</div></div>');
                }
                var unique_pseudos = jQuery.unique(jQuery('.reply-pseudo').map(function(){return this.innerHTML.replace(':', '');}).get());
                jQuery.each(unique_pseudos, function(index, value) {
                    var regex = new RegExp('@' + value, 'g');
                    jQuery('.reply-item .reply-message').map(function() {return this.innerHTML = this.innerHTML.replace(regex, '<span style="color:red;">@'+value+'</span>')}).get()
                });
                jQuery('time.timeago').timeago();
            });
            
            jQuery('#replies-for-' + thread_id).show();
            window.adjustTextArea(thread_id);
            jQuery('.new-thread-container').animate({scrollTop:jQuery('#item-' + thread_id).offset().top});
            jQuery('#replies-for-' + thread_id + ' + .submit-reply-inline').find('.who-am-i').focus();
            var textarea = jQuery('#replies-for-' + thread_id + ' + .submit-reply-inline').find('textarea')[0];
            var heightLimit = 200; /* Maximum height: 200px */

            textarea.oninput = function() {
              textarea.style.height = ""; /* Reset the height*/
              textarea.style.height = Math.min(textarea.scrollHeight, heightLimit) + "px";
            };
            window.busy_vars[thread_id] = false;
        }
    });
}
jQuery(document).ready(function() {
    jQuery('.new-thread .new-thread-button').click(function() {
        jQuery('.new-thread-container2').animate({'margin-bottom': '40px'});
        jQuery(this).hide();
        jQuery('.threads-list').css('padding-bottom', '255px');
        jQuery('.new-thread-container2 textarea[name="title"]').focus();
        window.logThatThing('clicked_button_to_add_new_thread', {});
    });
    jQuery('.new-thread .never-mind-button').click(function() {
        jQuery('.new-thread-container2').animate({'margin-bottom': '-200px'});
        jQuery('.new-thread .new-thread-button').show();
        jQuery('.threads-list').css('padding-bottom', '70px');
        window.logThatThing('clicked_button_to_cancel_adding_new_thread', {});
    });

    jQuery('.drawer-button .fa-home').click(function() {
        if (jQuery('.new-replies-container:visible').length > 0) {
            jQuery('.new-thread-container').slideDown();
            jQuery('.new-replies-container').slideUp();
            jQuery('#thread-button').data('counter', "0");
            jQuery('#thread-button').hide();
        } else {
            window.location.href=jQuery(this).data('url');
        }
        window.logThatThing('clicked_home_button', {});
    });

    jQuery('.drawer-button .fa-bars').click(function() {
        if (jQuery(this).hasClass('open')) {
            var self = this;
            setTimeout(function(){jQuery(self).removeClass('open')}, 500);
            jQuery('.drawer.drawer-contents').animate({'left':"-200px"});
            jQuery('.drawer.drawer-left').animate({'left': '0'});
            
        } else {
            jQuery('.drawer.drawer-contents').animate({'left': "0"});
            jQuery('.drawer.drawer-left').animate({'left': '200px'});
            jQuery(this).addClass('open');
        }
       window.logThatThing('toggled_side_menu', {
        'new_state': jQuery(this).addClass('open') ? "opened" : "closed"
       });
    });

    jQuery('.drawer-button .fa-gear').click(function() {
            jQuery('.floating-holder').toggle();
    });

    jQuery('.submit-button-pseudos').click(function() {
        var url = jQuery(this).data('url');
        jQuery.ajax({
            method: "POST",
            data: {
                'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
                'address': jQuery('.address-field input').val(),
            },
            url: url,
            fail: function() {
                window.failure_backup('Server seems to be down. Wait a few minutes and reload the page to try again.');
            },
            success: function(data) {
                jQuery('.address-field input').val('');
                jQuery('.floating-holder').hide();
                jQuery('.fa.fa-gear').removeClass('jiggle');
                jQuery('.fa.fa-gear').css('color', 'white');
            }
        })
    });

    jQuery('.reset-button-pseudos').click(function() {
        var url = jQuery(this).data('url');
        jQuery.ajax({
            method: "GET",
            url: url,
            success: function(reply){
                jQuery('.drawer-button .fa-gear').addClass('jiggle');
                jQuery('.drawer-button .fa-gear').css('color', 'yellow');
            }
        })
    })

    jQuery('.drawer.drawer-contents').on('click', '.drawer.drawer-topic', function() {
        if (!jQuery(this).hasClass('selected')) {
            var new_topic = jQuery(this).data('topic');
            window.location.href = '/threads/filter/' + encodeURIComponent(new_topic);
            window.logThatThing('clicked_button_to_switch_topics', {});
        }
    });

    jQuery('.new-thread-container').on('click', '.delete', function(event) {
        if (!event) {
            event = window.event;
        }
        if (event.stopPropagation) {
            event.stopPropagation();
        } else {
            event.cancelBubble = true;
        }
        var delete_url = jQuery(this).data('href');
        var thread_id = jQuery(this).data('id');
        var undo = jQuery('#item-' + thread_id).hasClass('admin-deleted') ? 1 : 0;
        if (delete_url.indexOf('/delete/0/' !== -1)) {
            delete_url = delete_url.replace('/delete/0/', '/delete/' + undo + "/");
        } else {
            delete_url = delete_url + undo + "/";
        }
        jQuery.ajax({
            method: "GET",
            url: delete_url,
            fail: function(data) {
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.')
            },
            success: function(reply){
                if (reply.message.indexOf('successfully') !== -1) {
                    if (window.admin_panel === undefined) {
                        jQuery('#item-' + thread_id + " .thread-title").html("[DELETED] by staff");
                    } else {
                        jQuery('#item-' + thread_id).toggleClass('admin-deleted');
                    }
                } else {
                    jQuery('.threads-list').before('<h2>' + reply.message + '</h2>');
                }
            }
        });
    });

    jQuery('.new-thread-container').on('click', '.delete-reply', function(event) {
        var delete_url = jQuery(this).data('href');
        var post_id = jQuery(this).data('id');
        var undo = jQuery('#reply-item-' + post_id).hasClass('admin-deleted') ? 1: 0;
        delete_url = delete_url + undo + "/";
        jQuery.ajax({
            method: "GET",
            url: delete_url,
            fail: function(data) {
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
            },
            success: function(reply){
                if (reply.message.indexOf('successfully') !== -1) {
                    if (window.admin_panel === undefined) {
                        jQuery('#reply-item-' + post_id + " .thread-title").html("[DELETED] by staff");
                    } else {
                        jQuery('#reply-item-' + post_id).toggleClass('admin-deleted');
                    }
                } else {
                    jQuery('.threads-list').before('<h2>' + reply.message + '</h2>');
                }
            }
        });
    });

    jQuery('.new-thread-container').on('click', '.hide', function(e) {
        var hide_url = jQuery(this).data('href');
        var thread_id = jQuery(this).data('id');
        var undo = jQuery('#item-' + thread_id).hasClass('admin-hidden') ? 1 : 0;
        if (hide_url.indexOf('/hide/0/' !== -1)) {
            hide_url = hide_url.replace('/hide/0/', '/hide/' + undo + "/");
        } else {
            hide_url = hide_url + undo + "/";
        }
        jQuery.ajax({
            method: "GET",
            url: hide_url,
            fail: function(data) {
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
            },
            success: function(reply){
                //console.log(reply);
                if (reply.message.indexOf('successfully') !== -1) {
                    if (window.admin_panel === undefined) {
                        jQuery('#item-' + thread_id).remove();
                    } else {
                        jQuery('#item-' + thread_id).toggleClass('admin-hidden');
                    }
                    
                } else {
                    jQuery('.threads-list').before('<h2>' + reply.message + '</h2>');
                }
            }
        });
    });

    jQuery('.new-thread-container').on('click', '.hide-reply', function(e) {
        var hide_url = jQuery(this).data('href');
        var post_id = jQuery(this).data('id');
        var undo = jQuery('#reply-item-' + post_id).hasClass('admin-hidden') ? 1 : 0;
        hide_url = hide_url + undo + "/";
        jQuery.ajax({
            method: "GET",
            url: hide_url,
            fail: function(data) {
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
            },
            success: function(reply){
                //console.log(reply);
                if (reply.message.indexOf('successfully') !== -1) {
                    if (window.admin_panel === undefined) {
                        jQuery('#reply-item-' + post_id).remove();
                    } else {
                        jQuery('#reply-item-' + post_id).toggleClass('admin-hidden');
                    }
                    
                } else {
                    jQuery('.threads-list').before('<h2>' + reply.message + '</h2>');
                }
            }
        });
    });

    jQuery('body').on('click', '.scroll-to-top', function() {
        var thread_id = jQuery(this).data('id');
        jQuery('#replies-for-' + thread_id + ' .reply-item').first()[0].focus();
        //console.log(jQuery('#replies-for-' + thread_id + ' .reply-item').first());
    });
    jQuery('body').on('click', '.scroll-to-bottom', function() {
        var thread_id = jQuery(this).data('id');
        jQuery('#replies-for-' + thread_id + ' .reply-item').last()[0].focus();
        //console.log(jQuery('#replies-for-' + thread_id + ' .reply-item').last());
    });

    jQuery('.new-thread-container').on('click', '.submit-reply-inline-button', function() {
        //jQuery(this).css('display', 'none');
        //jQuery(this).parent().find('.loading-animation').css('display', 'inline-block');
        if (window.rapid_submit) {
            return;
        } else {
            window.rapid_submit = true;
        }
        var post_reply_url = jQuery(this).data('reply-url');
        var reply = jQuery('#' + jQuery(this).data('text')).val();
        window.logThatThing('clicked_button_to_create_reply', {
            'reply': reply,
        });
        jQuery.ajax({
            context: this,
            method: "POST",
            url: post_reply_url,
            data: {
                'reply': reply,
                'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
            },
            fail: function(data){
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
                window.logThatThing('failed_create_reply', {
                    'reply': reply
                });
                setTimeout(function(){
                    window.rapid_submit = false;
                }, 500);
            },
            success: function(reply){
                if (jQuery('#replies-for-' + reply.parent_thread_id + ' + .submit-reply-inline .who-am-i').html() === "You have not yet joined this conversation.") {
                    jQuery('#replies-for-' + reply.parent_thread_id + ' + .submit-reply-inline .who-am-i').html('In this thread, you were ' + reply.pseudonym);
                }
                //jQuery('.repliesList').append('<div class="reply-item"><div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message + '</div><div class="reply-date">'+reply.updated+'</div></div>');
                jQuery('.new-reply-container2 textarea').val('');
                window.logThatThing('success_create_reply', {
                    'reply': reply
                });
                setTimeout(function(){
                    window.rapid_submit = false;
                }, 500);
                if (window.socket !== undefined) {
                    var message = {
                        type: "reply_created",
                        pseudo: reply.pseudonym,
                        message: reply.message,
                        updated: reply.updated,
                        reply_id: reply.reply_id,
                        pthread_id: reply.parent_thread_id,
                        poster_id: reply.post_id,
                        notes: reply.notes,
                    }

                    jQuery('new-thread-container').animate({
                        scrollTop: jQuery('#item-' + reply.parent_thread_id).offset().top
                    });
                    // window.sendSocket(JSON.stringify(message));
                    var content = message;
                    var unique_pseudos = jQuery.unique(jQuery('.reply-pseudo').map(function(){return this.innerHTML.replace(':', '');}).get());
                    var mess = content.message;
                    jQuery.each(unique_pseudos, function(index, value) {
                        var regex = new RegExp('@' + value, 'g');
                        mess = mess.replace(regex, '<span style="color:red;">@'+value+'</span>');
                    });
                    var admin_panel = window.reply_admin_panel || '';
                    // jQuery('#replies-for-'+content.pthread_id).append('<div class="reply-item" id="reply-item-'+content.reply_id+'">'+admin_panel.replace(/\[\[post_id\]\]/g, content.reply_id)+'<div class="reply-message"><span class="reply-pseudo">'+content.pseudo+":</span> " + mess + '</div><div class="reply-date">'+content.updated+'</div></div>');
                    jQuery('.thread-item#item-' + content.pthread_id + ' .replies-count').html(jQuery('#replies-for-' + content.pthread_id + ' .reply-item').length);

                    //window.adjustTextArea(content.pthread_id);
                    jQuery('#textarea-for-' + content.pthread_id).val('');
                    jQuery('#replies-for-'+ content.pthread_id).animate({
                        scrollTop: jQuery('#replies-for-' + content.pthread_id)[0].scrollHeight
                    }, 500);
                    
                }
            }
        });
    });

    jQuery('.new-thread-container2').on('click', '.submit-thread-button', function() {
        var post_thread_url = jQuery('.new-thread-container2').data('posting');
        var title = jQuery('textarea[name="title"]').val();
        window.logThatThing('clicked_button_to_create_thread', {
            'thread_title': title
        });
        jQuery.ajax({
            method: "POST",
            url: post_thread_url,
            data: {
                'title': title,
                'topic': jQuery('.drawer.drawer-menu').html().trim(),
                'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
            },
            fail: function(data) {
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
                window.logThatThing('failed_create_thread', {
                    'thread_title': title
                });
            },
            success: function(reply){
                jQuery('.new-thread-container2 textarea').val('');
                jQuery('.new-thread-container2').animate({'margin-bottom': '-200px'});
                jQuery('.new-thread .new-thread-button').show();
                window.logThatThing('success_create_thread', {
                    'thread': reply
                });
                //jQuery('.threads-list').prepend("<div class='thread-item' id='item-" + reply.thread_id + "'>"+reply.admin_panel+"<div onclick='window.loadReplies(\""+reply.replies_url+"\", \""+reply.post_reply_url+"\");' data-reply-url='"+reply.post_reply_url+"'> <div class='thread-title'>"+reply.message+"</div></div>");
                if (window.socket !== undefined) {
                    var message = {
                        type: "thread_created",
                        thread_id: reply.thread_id,
                        thread_title: reply.message,
                        replyNum: reply.replyNum
                    }
                    
                    window.sendSocket(JSON.stringify(message));
                }
                var admin_panel = window.admin_panel ? window.admin_panel.replace(/\[\[thread_id\]\]/g, reply.thread_id) : "";
                var get_replies_url = "/threads/thread/thread_id/get_replies/".replace('thread_id', reply.thread_id);
                var post_reply_url = "/threads/thread/thread_id/new_reply/".replace('thread_id', reply.thread_id);
                jQuery('.add-threads-after').after("<div class='thread-item' tabindex='0' id='item-" + reply.thread_id + "' onclick='if(jQuery(this).hasClass(\"opened\")){jQuery(\".same-page-repliesList#replies-for-"+reply.thread_id+" + .submit-reply-inline\").remove();jQuery(\".same-page-repliesList#replies-for-"+reply.thread_id+"\").remove();jQuery(this).removeClass(\"opened\");return false;};window.loadReplies(event, \""+get_replies_url+"\", \""+post_reply_url+"\");'>"+admin_panel+"<div data-reply-url='"+post_reply_url+"'> <div class='thread-title'>"+reply.message+"</div><div class='replies-count' role='button' aria-label='Click to view 0 replies' onclick='if (jQuery(\"#item-"+reply.thread_id+"\").hasClass(\"opened\")) { jQuery(this).attr(\"aria-pressed\", \"false\")} else { jQuery(this).attr(\"aria-pressed\", \"true\")}; jQuery(\"#item-"+reply.thread_id+"\").trigger(\"click\");' aria-pressed=\"false\">"+reply.replyNum+"</div></div></div>");
                jQuery('#item-' + reply.thread_id).focus();
            }
        });
    });

    // after the pop up shows up to change thread to a different topic, this just allows the forms to actually add the new topic
    jQuery('.popup-background').on('click', '.input-topic',function(event) {
        var topic_url = jQuery('.addthreadtotopic').attr('action');
        jQuery.ajax({
            method: "POST",
            url: topic_url,
            data: {
                'topic': jQuery('input[name="topic"]:checked').val(),
                'new-topic-title': jQuery('input[name="new-topic-title"]').val(),
                'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
            },
            fail: function(data) {
                window.failure_backup('The server seems to be down. Wait a few minutes, refresh and try again.');
            },
            success: function(reply){
                if (reply.message === "Success" && reply.topic !== jQuery('.drawer.drawer-menu').html().trim()) {
                    jQuery('#item-' + reply.thread).remove();
                }
                jQuery('.popup-background').hide();
                var found = false;
                jQuery.each(jQuery('.drawer.drawer-topic'), function(index, value) {
                    if (jQuery(value).html().trim() === reply.topic) {
                        found = true;
                    }
                });
                if (!found) {
                    jQuery('.drawer.drawer-contents').append('<div class="drawer drawer-topic" data-topic="'+reply.topic+'">' + reply.topic + '</div>');
                }
            }
        });
        //jQuery(this).parent().submit();
    });

    jQuery('body').on('click', '.popup-background', function(event) {
        if (jQuery(event.target).hasClass('popup-background')) {
            jQuery(this).hide();
        }
    });

    jQuery('body').on('click', function(event) {
        if (!jQuery(event.target).hasClass('drawer') && !jQuery(event.target).hasClass('fa-bars') && jQuery('.fa.fa-bars').hasClass('open')) {
            jQuery('.fa.fa-bars').trigger('click');
        }
    })

    jQuery('body').on('click', '.popup-background .input-cancel', function (event) {
        jQuery('.popup-background').hide();
    });

    jQuery('body').on('click', '.drawer.drawer-mentions', function(event) {
        var item = jQuery(this);
        var thread_id = jQuery(this).data('thread-id');
        var post_id = jQuery(this).data('post-id');
        var url = jQuery(this).data('url');
        //console.log(url);
        if (jQuery('#item-' + thread_id).hasClass('opened')) {
            jQuery('.fa.fa-bars').trigger('click');
        } else {
            jQuery('#item-' + thread_id).trigger('click');
        }
        window.logThatThing('clicked_button_to_open_mention', {
            'thread_id': thread_id,
            'post_id': post_id
        });
        jQuery.ajax({
            url: url,
            method: "GET",
            fail:function(){
                window.failure_backup("Server seems to be down. Wait a few minutes, refresh and try again.");
                window.logThatThing('failed_retrieve_replies_for_mention', {
                    'thread_id': thread_id
                });
            },
            success: function(){
                item.remove();
                var counter = parseInt(jQuery('.button-badge.mentions').data('counter'), 10);
                if (counter - 1 === 0) {
                    jQuery('.button-badge').hide();
                }
                jQuery('.button-badge.mentions').data('counter', counter-1);
                jQuery('.button-badge.mentions').html(counter-1);
                window.logThatThing('success_retrieve_replies_for_mention', {
                    'thread_id': thread_id,
                    'post_id': post_id
                });
            }
        });
        var move_to_post = function(thread_id, post_id) {
            //console.log('#replies-for-' + thread_id);
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
                    //jQuery('.fa.fa-bars').trigger('click');
                }
            }
        }
        move_to_post(thread_id, post_id);
    })

    window.messageToSend = function(event) {
        //console.log("Message Received");
        try {
            var content = JSON.parse(event);
            //console.log(content)
            if (content.type === "thread_created") {
                if (jQuery("#item-" + content.thread_id).length === 0) {
                    var admin_panel = window.admin_panel.replace(/\[\[thread_id\]\]/g, content.thread_id) || "";
                    var get_replies_url = "/threads/thread/thread_id/get_replies/".replace('thread_id', content.thread_id);
                    var post_reply_url = "/threads/thread/thread_id/new_reply/".replace('thread_id', content.thread_id);
                    if (jQuery('#item-' + content.thread_id).length == 0) {
                        jQuery('.add-threads-after').after("<div class='thread-item' id='item-" + content.thread_id + "' onclick='if(jQuery(this).hasClass(\"opened\")){jQuery(\".same-page-repliesList#replies-for-"+content.thread_id+" + .submit-reply-inline\").remove();jQuery(\".same-page-repliesList#replies-for-"+content.thread_id+"\").remove();jQuery(this).removeClass(\"opened\");return false;};window.loadReplies(event, \""+get_replies_url+"\", \""+post_reply_url+"\");'>"+admin_panel+"<div data-reply-url='"+post_reply_url+"'> <h4 class='thread-title'>"+content.thread_title+"</h4><div class='replies-count'>"+content.replyNum+"</div></div></div>");
                    }
                    if (jQuery('.threads-list:visible').length === 0) {
                        var thread_button = jQuery('#thread-button');
                        var thread_counter = parseInt(thread_button.data('counter'), 10) + 1;
                        thread_button.data('counter', thread_counter);
                        thread_button.html(thread_counter);
                        thread_button.show();
                    }
                    // jQuery(document).animate({
                    //  scrollTop: jQuery('#item-' + content.thread_id).offset().top
                    // });
                }
                //console.log(content);
            } else if(content.type === "reply_created") {
                //console.log("The reply is being created");
                if (jQuery('#replies-for-'+content.pthread_id+':visible').length === 0) {
                    var pthread = jQuery('#item-' + content.pthread_id);
                    var counter = parseInt(pthread.data('counter'), 10) || 0;
                    counter = counter + 1;
                    pthread.data('counter', counter);
                    var badge = pthread.find('.button-badge.onred');
                    if (badge.length == 0) {
                        pthread.append('<span class="button-badge onred reply-button-'+content.reply_id+'" tabindex="0" aria-label="'+(counter)+' new replies in this thread.">' + (counter) + '</span>');
                        
                    } else {
                        badge.html(counter);
                        badge.show();
                    }
                    jQuery('#loader-' + content.pthread_id).parent().find('.submit-reply-inline-button').css('display', 'inline-block');
                    jQuery('#loader-' + content.pthread_id).css('display', 'none');

                } else {
                    //console.log('Number of these exact reply items are: ' + jQuery('#reply-item-' + content.reply_id).length);
                    if (jQuery('#reply-item-' + content.reply_id).length === 0) {
                        var pthread = jQuery('#item-' + content.pthread_id);
                        var counter = parseInt(pthread.data('counter'), 10) || 0;
                        counter = counter + 1;
                        pthread.data('counter', counter);
                        var badge = pthread.find('.button-badge.onred');
                        if (badge.length == 0) {
                            pthread.append('<span class="button-badge onred reply-button-'+content.reply_id+'" tabindex="0" aria-label="'+(counter)+' new replies in this thread.">' + (counter) + '</span>');
                        } else {
                            badge.html(counter);
                            badge.show();
                        }
                        var unique_pseudos = jQuery.unique(jQuery('.reply-pseudo').map(function(){return this.innerHTML.replace(':', '');}).get());
                        var mess = content.message;
                        jQuery.each(unique_pseudos, function(index, value) {
                            var regex = new RegExp('@' + value, 'g');
                            mess = mess.replace(regex, '<span style="color:red;">@'+value+'</span>');
                        });
                        var admin_panel = window.reply_admin_panel || '';
                        jQuery('#replies-for-'+content.pthread_id).append('<div class="reply-item" id="reply-item-'+content.reply_id+'">'+admin_panel.replace(/\[\[post_id\]\]/g, content.reply_id)+'<div class="reply-message"><span class="reply-pseudo">'+content.pseudo+":</span> " + mess + '</div><time class="reply-date timeago" datetime="'+content.updated+'">'+content.updated+'</time></div>');
                        window.adjustTextArea(content.pthread_id);
                        jQuery('#replies-for-'+ content.pthread_id).animate({
                            scrollTop: jQuery('#replies-for-' + content.pthread_id)[0].scrollHeight
                        }, 500);
                        jQuery('.thread-item#item-' + content.pthread_id + ' .replies-count').html(jQuery('#replies-for-' + content.pthread_id + ' .reply-item').length);
                        jQuery('#loader-' + content.pthread_id).parent().find('.submit-reply-inline-button').css('display', 'inline-block');
                        jQuery('#loader-' + content.pthread_id).css('display', 'none');
                        jQuery('time.timeago').timeago();
                    }
                }
            } else if (content.type === "notification"){
                var notification_button = jQuery('#mentioned-button');
                var notification = jQuery('.small-popup');
                var mention_counter = parseInt(notification_button.data('counter'), 10) + 1;
                notification_button.data('counter', mention_counter);
                notification_button.html(mention_counter);
                notification_button.show();

                if (jQuery('#mentions:visible').length == 0) {
                    jQuery('#mentions').show();
                }

                var text = 'You were mentioned in a post: <br>' + jQuery('#item-' + content.thread_id + ' .thread-title').html();
                notification.html(text);
                notification.css('bottom', '0px');
                notification.click(function(){
                    jQuery('#item-'+content.thread_id).trigger('click');
                    jQuery('.new-thread-container').animate({
                        scrollTop: jQuery('#item-' + content.thread_id).offset().top + jQuery('.new-thread-container').scrollTop()
                    }, 400, function() {
                        jQuery('#item-' + content.thread_id).css('background-color', 'rgb(180, 0, 0)');
                        jQuery('#item-' + content.thread_id).css('color', 'white');
                        setTimeout(function() {
                            jQuery('#item-' + content.thread_id).css('background-color', 'white');
                            jQuery('#item-' + content.thread_id).css('color', 'black');
                        }, 500)
                    });
                });
                setTimeout(function() {
                        notification.css('bottom', '-99px');
                }, 5000);

                jQuery('#mentions').after('<div class="drawer drawer-mentions" data-thread-id="'+content.thread_id+'" data-post-id="'+content.reply_id+'" data-url="'+content.remove_notification_url+'">'+text+'</div>')
            }
        } catch(e) {
            //console.log(event);
        }
    };

    window.setUpWebSocket = function() {
        if (window.websockets_failures > 15) {
            window.failure_backup('Live Update Server is down. Refresh to get new replies.');
            return;
        }
        if (window.location.protocol != "https:") {
            window.socket = new WS4Redis({
                uri: 'ws://' + window.location.host + '/ws/threads?subscribe-broadcast',
                connecting: window.onmessage,
                connected: window.onopen,
                receive_message: window.messageToSend,
                disconnected: window.onclose,
                heartbeat_message: '--heartbeat--'
            });
            window.notification_socket = new WS4Redis({
                uri: 'ws://' + window.location.host + '/ws/' + jQuery('.mentioned-id').html() + '?subscribe-broadcast',
                connecting: window.onmessage,
                connected: window.onopen,
                receive_message: window.messageToSend,
                disconnected: window.onclose,
                heartbeat_message: '--heartbeat--'
            });
        } else {
            window.socket = new WS4Redis({
                uri: 'wss://' + window.location.host + '/ws/threads?subscribe-broadcast',
                connecting: window.onmessage,
                connected: window.onopen,
                receive_message: window.messageToSend,
                disconnected: window.onclose,
                heartbeat_message: '--heartbeat--'
            });
            window.notification_socket = new WS4Redis({
                uri: 'wss://' + window.location.host + '/ws/' + jQuery('.mentioned-id').html() + '?subscribe-broadcast',
                connecting: window.onmessage,
                connected: window.onopen,
                receive_message: window.messageToSend,
                disconnected: window.onclose,
                heartbeat_message: '--heartbeat--'
            });
        }
        
        window.onmessage = window.messageToSend;
        window.onerror = function(event) {
            window.websockets_failures = window.websockets_failures + 1;
            window.lastError = new Date();
            //console.log(window.websockets_failures);
        };
        window.onclose = function(event){
            var reason;
            // See http://tools.ietf.org/html/rfc6455#section-7.4.1
            if (event.code == 1000)
                reason = "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
            else if(event.code == 1001)
                reason = "An endpoint is \"going away\", such as a server going down or a browser having navigated away from a page.";
            else if(event.code == 1002)
                reason = "An endpoint is terminating the connection due to a protocol error";
            else if(event.code == 1003)
                reason = "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
            else if(event.code == 1004)
                reason = "Reserved. The specific meaning might be defined in the future.";
            else if(event.code == 1005)
                reason = "No status code was actually present.";
            else if(event.code == 1006)
               reason = "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
            else if(event.code == 1007)
                reason = "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [http://tools.ietf.org/html/rfc3629] data within a text message).";
            else if(event.code == 1008)
                reason = "An endpoint is terminating the connection because it has received a message that \"violates its policy\". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.";
            else if(event.code == 1009)
               reason = "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
            else if(event.code == 1010) // Note that this status code is not used by the server, because it can fail the WebSocket handshake instead.
                reason = "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake. <br /> Specifically, the extensions that are needed are: " + event.reason;
            else if(event.code == 1011)
                reason = "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
            else if(event.code == 1015)
                reason = "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
            else
                reason = "Unknown reason";
            console.log(reason);
            setTimeout(window.setUpWebSocket, 500);
            window.websockets_failures = window.websockets_failures + 1;
            //console.log(window.websockets_failures);
        };
        window.onopen = function() {
            if (window.websockets_failures > 0 && window.lastError) {
                var newest = new Date();
                var delta = Math.ceil((newest - window.lastError)/1000);
                //console.log('Time between error and restart: ' + delta + ' seconds.');
                jQuery.ajax({
                    url: '/threads/thread/fillmein/' + delta + '/',
                    method: 'GET',
                    success: function(data) {
                        var missed_threads = data['threads'];
                        var missed_posts = data['posts'];
                        //console.log(missed_posts);
                        jQuery.each(missed_threads, function(index, thread) {
                            if (jQuery('#item-' + thread.thread_id).length == 0) {
                                jQuery('.add-threads-after').after("<div class='thread-item' tabindex='0' id='item-" + thread.thread_id + "' onclick='if(jQuery(this).hasClass(\"opened\")){jQuery(\".same-page-repliesList#replies-for-"+thread.thread_id+" + .submit-reply-inline\").remove();jQuery(\".same-page-repliesList#replies-for-"+thread.thread_id+"\").remove();jQuery(this).removeClass(\"opened\");return false;};window.loadReplies(event, \""+thread.replies_url+"\", \""+thread.post_reply_url+"\");'>"+thread.admin_panel+"<div data-reply-url='"+thread.post_reply_url+"'> <div class='thread-title'>"+thread.message+"</div><div class='replies-count' role='button' aria-label='Click to view 0 replies' onclick='if (jQuery(\"#item-"+thread.thread_id+"\").hasClass(\"opened\")) { jQuery(this).attr(\"aria-pressed\", \"false\")} else { jQuery(this).attr(\"aria-pressed\", \"true\")}; jQuery(\"#item-"+thread.thread_id+"\").trigger(\"click\");' aria-pressed=\"false\">"+thread.replyNum+"</div></div></div>");
                            }
                        });
                        jQuery.each(missed_posts, function(index, content) {
                            if (jQuery('#replies-for-'+content.pthread_id+':visible').length === 0) {
                            var pthread = jQuery('#item-' + content.pthread_id);
                            var counter = parseInt(pthread.data('counter'), 10) || 0;
                            counter = counter + 1;
                            pthread.data('counter', counter);
                            var badge = pthread.find('.button-badge.onred');
                            if (badge.length == 0) {
                                pthread.append('<span class="button-badge onred reply-button-'+content.reply_id+'" tabindex="0" aria-label="'+(counter)+' new replies in this thread.">' + (counter) + '</span>');
                                
                            } else {
                                badge.html(counter);
                                badge.show();
                            }
                            jQuery('#loader-' + content.pthread_id).parent().find('.submit-reply-inline-button').css('display', 'inline-block');
                            jQuery('#loader-' + content.pthread_id).css('display', 'none');

                            } else {
                                if (jQuery('#reply-item-' + content.reply_id).length === 0) {
                                    var pthread = jQuery('#item-' + content.pthread_id);
                                    var counter = parseInt(pthread.data('counter'), 10) || 0;
                                    counter = counter + 1;
                                    pthread.data('counter', counter);
                                    var badge = pthread.find('.button-badge.onred');
                                    if (badge.length == 0) {
                                        pthread.append('<span class="button-badge onred reply-button-'+content.reply_id+'" tabindex="0" aria-label="'+(counter)+' new replies in this thread.">' + (counter) + '</span>');
                                    } else {
                                        badge.html(counter);
                                        badge.show();
                                    }
                                    var unique_pseudos = jQuery.unique(jQuery('.reply-pseudo').map(function(){return this.innerHTML.replace(':', '');}).get());
                                    var mess = content.message;
                                    jQuery.each(unique_pseudos, function(index, value) {
                                        var regex = new RegExp('@' + value, 'g');
                                        mess = mess.replace(regex, '<span style="color:red;">@'+value+'</span>');
                                    });
                                    var admin_panel = window.reply_admin_panel || '';
                                    jQuery('#replies-for-'+content.pthread_id).append('<div class="reply-item" id="reply-item-'+content.reply_id+'">'+admin_panel.replace(/\[\[post_id\]\]/g, content.reply_id)+'<div class="reply-message"><span class="reply-pseudo">'+content.pseudo+":</span> " + mess + '</div><time class="reply-date timeago" datetime="'+content.updated+'">'+content.updated+'</time></div>');
                                    window.adjustTextArea(content.pthread_id);
                                    jQuery('#replies-for-'+ content.pthread_id).animate({
                                        scrollTop: jQuery('#replies-for-' + content.pthread_id)[0].scrollHeight
                                    }, 500);
                                    jQuery('.thread-item#item-' + content.pthread_id + ' .replies-count').html(jQuery('#replies-for-' + content.pthread_id + ' .reply-item').length);
                                    jQuery('#loader-' + content.pthread_id).parent().find('.submit-reply-inline-button').css('display', 'inline-block');
                                    jQuery('#loader-' + content.pthread_id).css('display', 'none');
                                    jQuery('time.timeago').timeago();
                                }
                            }
                        });
                    }
                });
                window.lastError = undefined;
            }
            window.websockets_failures = 0;
        }
    };
    window.setUpWebSocket();

    window.waitForConnection = function(callback, interval) {
        if (window.socket.readyState === WebSocket.OPEN) {
            callback();
            if (window.websockets_failures > 0) {
                console.log('There was a failure');
            }
            window.websockets_failures = 0;
        } else {
            if (window.socket.readyState === WebSocket.CLOSED) {
                window.websockets_failures = window.websockets_failures + 1;
                //console.log(window.websockets_failures);
                console.log("Closed Connection");
                window.setUpWebSocket();
            }
            setTimeout(function() {
                window.waitForConnection(callback, interval);
            }, interval);
        }
    };
    window.sendSocket = function(message) {
        window.waitForConnection(function(){
            window.socket.send(message);
            //console.log("Message sent");
        }, 500);
    };

    window.websockets_failures = 0;
    window.failure_backup = function(text){
        jQuery('.drawer.drawer-button').append('<div class="button jiggle" style="color:yellow;"><i class="fa fa-warning"></i></div>');
        new Opentip(jQuery('.button.jiggle'), {
            showOn: 'click',
            tipJoint: 'left',
            style: 'alert',
            title: text
        });
        jQuery('.button.jiggle').click(function() {
            jQuery(this).removeClass('jiggle');
            jQuery(this).css('color', 'white');
        })
    };

    jQuery('body').on('keypress', '.thread-item', function(e) {
        var key = e.keyCode ? e.keyCode : e.which;
        if (key == 13 || key == 32) {
            jQuery(this).trigger('click');
            return false;
        }
    });

    jQuery('body').on('keypress', '.submit-reply-inline-button', function(e) {
        var key = e.keyCode ? e.keyCode : e.which;
        if (key == 13 || key == 32) {
            jQuery(this).trigger('click');
            return false;
        }
    });

    jQuery('body').on('keypress', '.new-thread-button', function(e) {
        var key = e.keyCode ? e.keyCode : e.which;
        if (key == 13 || key == 32) {
            jQuery(this).trigger('click');
            return false;
        }
    });

    jQuery('body').on('keypress', '.new-thread-container2 div[role="button"]', function(e) {
        var key = e.keyCode ? e.keyCode : e.which;
        if (key == 13 || key == 32) {
            jQuery(this).trigger('click');
            return false;
        }
    });

    // Called sometime after postMessage is called
    function receiveMessage(event)
    {
      // Do we trust the sender of this message?
      if (event.origin !== "https://edge.edx.org")
        return;
      window.logSource = event.source;
      window.logOrigin = event.origin;
    }

    window.addEventListener("message", receiveMessage, false);

    window.logThatThing = function(action, thing) {
        if (window.logSource && window.logSource.postMessage) {
        window.logSource.postMessage({
            'event': "log",
            'event-source': 'harvardx',
            'event-object': 'ltithreads',
            'action': action,
            'object': JSON.stringify(thing)
        }, window.logOrigin);
    }
    }
    // //looks for the topic filter to change and turns off/on certain topics
    // jQuery('#topic-select').change(function() {
    //  new_topic = jQuery(this).val();
    //  topic_url = jQuery('#topic-select').data('url');

    //  window.location.href = '/threads/filter/' + encodeURIComponent(new_topic);
    // });
});