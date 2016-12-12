/*
 * admin.js
 * -- Admin only functions --
 * This file only gets loaded when the user is an instructor...but the rest of the code should still live without it.
 */
(function($) {

    // gets all the jquery selectors for items that only exist when user is an instructor
	$.Admin = function(options) {
        this.initOptions = options;
		try {
            this.drawerGear = jQuery(options['drawer_gear']);
            this.drawerDownload = jQuery(options['drawer_download']);
            this.drawerPrint = jQuery(options['drawer_print']);
            this.drawerStats = jQuery(options['drawer_stats']);
            this.floatingBox = jQuery(options['floating_box']);
            this.addPseudosButton = jQuery(options['adding_pseudos']);
            this.addPseudosTextField = jQuery(options['adding_pseudos_text']);
            this.resetPseudosButton = jQuery(options['reset_pseudos']);
        } catch(e){
            console.log("Warning! View was not created correctly");
        }

        this.init();

        return this;
	};

    // connects the different elements on the page to functions below
	$.Admin.prototype.init = function() {
		var self = this;
		jQuery('body').on('click', self.initOptions['drawer_gear'], self.clickedGearButton.bind(self));
        jQuery('body').on('click', self.initOptions['drawer_download'], self.clickedDownloadButton.bind(self));
        jQuery('body').on('click', self.initOptions['drawer_print'], self.clickedDownloadButton.bind(self));
        jQuery('body').on('click', self.initOptions['drawer_stats'], self.clickedStatsButton.bind(self));
        jQuery('body').on('click', self.initOptions['adding_pseudos'], self.addPseudos.bind(self));
        jQuery('body').on('click', self.initOptions['reset_pseudos'], self.resetPseudos.bind(self));
        jQuery('body').on('click', self.initOptions['delete_thread'], self.deleteThread.bind(self));
        jQuery('body').on('click', self.initOptions['delete_reply'], self.deleteReply.bind(self));
        jQuery('body').on('click', self.initOptions['hide_thread'], self.hideThread.bind(self));
        jQuery('body').on('click', self.initOptions['hide_reply'], self.hideReply.bind(self));
        jQuery('body').on('click', self.initOptions['move'], self.moveThreadOptions.bind(self));
        jQuery('body').on('click', self.initOptions['pop-up-bckgd'], self.closePopup.bind(self));
        jQuery('body').on('click', self.initOptions['pop-up-cancel'], self.closePopup.bind(self));
        jQuery('body').on('click', self.initOptions['change_topic_button'], self.changeTopic.bind(self));
	};

    // this just triggers the floating box that allows instructors to add pseudonyms
	$.Admin.prototype.clickedGearButton = function() {
        this.floatingBox.toggle();
    };

    // triggers way to download or print the current course's annotations
    $.Admin.prototype.clickedDownloadButton = function(event) {
        var url = '/threads/admin/download_data/'+ '?type=' + jQuery(event.target).data('value');
        window.open(url);
    };

    $.Admin.prototype.clickedStatsButton = function(event) {
        var url = jQuery(event.target).data('url');
        window.location.href=url;
    }

    // this gets run once instructor has added a link to the field to a list of appropriate pseudonyms
    // that replaces the defaults
    $.Admin.prototype.addPseudos = function() {
        // gets the link and the csrf token
        var url = this.addPseudosButton.data('url');
        var csrf = jQuery('input[name="csrfmiddlewaretoken"]').val();
        var self = this;

        // if it works then the gear icon stops jiggling and turns white
        var success = function(){
            self.floatingBox.hide();
            self.drawerGear.removeClass('jiggle');
            self.drawerGear.css('color', 'white');
            self.addPseudosTextField.val('');
        };

        // makes a call to logic to actually add the list
        jQuery.publish('ltithreads.addPseudos', [url, this.addPseudosTextField.val(), success, csrf]);
    };

    // function deletes pseudos list for this course and sets it back to default
    $.Admin.prototype.resetPseudos = function() {
        var url = jQuery(event.target).data('url');
        var self = this;

        // when it success the gear starts to jiggle again and turn yellow
        var success = function() {
            self.drawerGear.addClass('jiggle');
            self.drawerGear.css('color', 'yellow');
        };

        // makes a call to logic to reset list
        jQuery.publish('ltithreads.resetPseudos', [url, success]);
    };

    // catch-all function that hides/unhides or deletes/undeletes a thread/reply
    $.Admin.prototype.administrate = function(isThread, target, undo_check, fail) {
    	// since these elements lie within the thread element, this stops propagation so thread doesn't open
        if (!event) {
    		event = window.event;
    	}
    	if (event.stopPropagation) {
    		event.stopPropagation();
    	} else {
    		event.cancelBubble = true;
    	}

    	var url = jQuery(target).data('href');
		var id = jQuery(target).data('id');

        // gets default for either thread or reply
    	var item_name = '';
    	if (isThread) {
    		item_name = '#item-';
    	} else {
    		item_name = '#reply-item-'
    	}

        // checks to see whether it involves hiding/unhiding or deleting/undeleting
    	var undo = jQuery(item_name + id).hasClass(undo_check) ? 1 : 0;
    	if (undo_check === 'admin-deleted') {
	    	if (url.indexOf('/delete/0/') !== -1) {
	    		url = url.replace('/delete/0/', '/delete/' + undo + "/");
	    	} else {
	    		url = url + undo + '/';
	    	}
	    } else {
	    	if (url.indexOf('/hide/0/') !== -1) {
	    		url = url.replace('/hide/0/', '/hide/' + undo + '/');
	    	} else {
	    		url = url + undo + '/';
	    	}
	    }

        // adds/removes class when deleted/undeleted or hidden/unhidden
	    var success = function(reply) {
			if (reply.message.indexOf('successfully') !== -1) {
				jQuery(item_name + id.toString()).toggleClass(undo_check);
			}
		};

        // makes request
	    jQuery.publish('ltithreads.makeAjaxRequestViaSub', ['GET', url, {}, fail, success]);

    }

    // passes fail message and parameters for deleting a thread
	$.Admin.prototype.deleteThread = function(event) {
		var fail = 'error_deleting_thread';
		this.administrate(true, event.currentTarget, 'admin-deleted', fail);
    };

    // passes fail message and parameters for deleting a reply
    $.Admin.prototype.deleteReply = function(event) {
		var fail = 'error_deleting_reply';
		this.administrate(false, event.currentTarget, 'admin-deleted',fail);
    };

    // passes fail message and parameters for hiding a thread
    $.Admin.prototype.hideThread = function(event) {
		var fail = 'error_hidden_thread';
		this.administrate(true, event.currentTarget, 'admin-hidden', fail);
    };

    // passes fail message and parameters for hiding a reply
    $.Admin.prototype.hideReply = function(event) {
		var fail = 'error_deleting_hidden';
		this.administrate(false, event.currentTarget, 'admin-hidden', fail);
    };

    // called when a thread's topic should be changed
    $.Admin.prototype.moveThreadOptions = function(event) {

        // same as above, stops propagation of click event
        if (!event) {
            event = window.event;
        }
        if (event.stopPropagation) {
            event.stopPropagation();
        } else {
            event.cancelBubble = true;
        }

        // shows the pop up
        jQuery(this.initOptions['pop-up-bckgd']).show();
        var url = jQuery(event.currentTarget).data('url');
        jQuery(this.initOptions['action-topic-element']).attr('action', url);
    }

    // called when user has decided to change the topic
    $.Admin.prototype.changeTopic = function(event) {
        var topic_url = jQuery(this.initOptions['action-topic-element']).attr('action');
        var topic = jQuery('input[name="topic"]:checked').val();
        var topic_title = jQuery('input[name="new-topic-title"]').val();
        var csrf = jQuery('input[name="csrfmiddlewaretoken"]').val();
        jQuery.publish('ltithreads.changeTopic', [topic_url, topic, topic_title, csrf]);
    };

    // called when user decides to close the pop up
    $.Admin.prototype.closePopup = function(event) {
        if (jQuery(event.target).hasClass(this.initOptions['pop-up-bckgd'])) {
            jQuery(this.initOptions['pop-up-bckgd']).hide();
        }
    };
}(HxThreads));