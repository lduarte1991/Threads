/*
 *  hxthreads.js
 *  --Initializer--
 *  Creates a main object that will include all the separate components that interact with each other to make the threads tool
 */

window.HxThreads = window.HxThreads || function(options) {

	// this utils object contains broad functions that could be used in other tools
	// it takes in a url for the iframe and main page to talk to each other.
	HxThreads.utils = new HxThreads.Utils('https://courses.edx.org');

	// this accessibility object makes sure that certain functions occur
	// on certain types of objects in a consistent manner (keyboard input)
	HxThreads.accessibility = new HxThreads.Accessibility({
		'triggerClicks': [
			'.thread-item',
			'.submit-reply-inline-button',
			'.new-thread-button',
			'.new-thread-container2 div[role="button"]'
		]
	});

	// this view object contains all the different names for the main components
	// of the tool. This is useful for UI changes so they can be switched at will
	HxThreads.view = new HxThreads.View({
		'thread_maker_opener': '.new-thread .new-thread-button',
		'thread_maker': '.new-thread-container2',
		'thread_maker_text': '.new-thread-container2 textarea',
		'thread_maker_submit': '.new-thread-container2 .submit-thread-button',
		'thread_maker_cancel': '.new-thread-container2 .never-mind-button',
		'threads_list': '.threads-list',
		'drawer_buttons': '.drawer.drawer-buttons',
		'drawer_home': '.fa.fa-home',
		'drawer_home_badge': '#thread-button',
		'drawer_bars': '.fa.fa-bars',
		'drawer_bars_badge': '#mentioned-button',
		'drawer_topics': '.drawer.drawer-topic',
		'drawer_mentions': '.drawer.drawer-mentions',
		'drawer': '.drawer.drawer-contents',
		'drawer_thin_bar': '.drawer.drawer-left',
		'scroll-to-top': '.scroll-to-top',
		'scroll-to-bottom': '.scroll-to-bottom',
		'notification_button': '#mentioned-button',
		'notification': '.small-popup',
		'mention_title': '#mentions',
	});

	// this logic object will perform all the actual tasks irrespective of the
	// actual visual objects on screen (hopefully).
	HxThreads.logic = new HxThreads.Logic();
	HxThreads.websockets = new HxThreads.Websocket({
		'failure_backup': HxThreads.view.warnUser,
		'websocket_url': window.location.host,
		'anon_id': jQuery('.mentioned-id').html().trim(),
		'fallback_url': '/threads/thread/fillmein/',
		'fallback': HxThreads.logic.polling_success,
		'decode_message': HxThreads.logic.decode_message,
		'unique_key': jQuery('#unique_key').html().trim()
	});

	// if the admin.js file gets through then instantiate that as well
	if (HxThreads.Admin !== undefined) {
		HxThreads.admin = new HxThreads.Admin({
			'drawer_gear': '.fa.fa-gear',
			'floating_box': '.floating-holder',
			'adding_pseudos': '.submit-button-pseudos',
			'adding_pseudos_text': '.address-field input',
			'reset_pseudos': '.reset-button-pseudos',
			'delete_thread': '.delete',
			'delete_reply': '.delete-reply',
			'hide_thread': '.hide',
			'hide_reply': '.hide-reply',
			'move': '.move',
			'change_topic_button': '.input-topic',
			'pop-up-bckgd': '.popup-background',
			'pop-up-cancel': '.popup-background .input-cancel',
			'action-topic-element': '.addthreadtotopic',
		});
	}
};
jQuery(document).ready(function() {
	HxThreads({});
});
