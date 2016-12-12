var threads_container = require('./threads_container');
var threads_template = require('./threads_template');
var replies_container = require('./replies_container');
// var replies_template = require('./replies_container');
require('../../static/css/font-awesome.css');
require('../../static/css/threads-lite-style.css');
jQuery(document).ready(function() {
	jQuery('.threads-container').append(threads_container());
	jQuery.ajax({
		url: jQuery('.threads-json').html(),
		method: 'GET',
		success: function(data) {
			window.threads_list = data[jQuery('.threads-topic').html()];
			var html = '';
			jQuery.each(window.threads_list, function(index, value) {
				jQuery('.threads-list').prepend(replies_container(value.fields.posts, value.pk));
				jQuery('.threads-list').prepend(threads_template(value));
				jQuery('.threads-list').on('click', '.item-' + value.pk, function(){
					jQuery('#replies-for-' + value.pk).toggle();
				});
			});
			html = jQuery('.threads-list').html();
			jQuery.each(jQuery.unique(jQuery('.reply-pseudo')), function(index, value) {
				var pseudo = jQuery(value).html().trim();
				var regex = new RegExp('@' + pseudo, 'g');
				html = html.replace(regex, '<span style="color: red;">@' + pseudo + '</span>');
			});
			window.html = html;
			jQuery('.threads-list').html(html);
		}
	});
});
