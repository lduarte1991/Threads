window.loadReplies = function(replies_url, posting_url, toBeNotified) {
	if (toBeNotified !== undefined) {
		jQuery('.reply-' + toBeNotified).removeClass('mentioned');
	}
	jQuery('.replies-container').data("posting", posting_url);
	jQuery.ajax({
		method: "POST",
		data: {
			"clicked_notification": toBeNotified,
			'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
		},
		url: replies_url,
		success: function(data) {
			jQuery('.reply-item').remove();
			jQuery.each(data, function(index, reply) {
				jQuery('.empty').hide();
				jQuery('.new-reply-container').show();

				jQuery('.empty').after('<div class="reply-item"><div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message + '</div><div class="reply-date">'+reply.updated+'</div></div>');
			});
		}
	});
}
jQuery(document).ready(function() {
	jQuery('.replies-container').on('click', '.input-reply', function() {
		var post_reply_url = jQuery('.replies-container').data('posting');
		var reply = jQuery('#reply').val();
		jQuery.ajax({
			method: "POST",
			url: post_reply_url,
			data: {
				'reply': reply,
				'csrfmiddlewaretoken': jQuery('input[name="csrfmiddlewaretoken"]').val(),
			},
			success: function(reply){
				jQuery('.new-reply-container').before('<div class="reply-item"><div class="reply-message"><span class="reply-pseudo">'+reply.pseudonym+":</span> " + reply.message + '</div><div class="reply-date">'+reply.updated+'</div></div>');
			}
		});
	});

	// after the pop up shows up to change thread to a different topic, this just allows the forms to actually add the new topic
	jQuery('.popup-background').on('click', '.input-topic',function(event) {
		jQuery(this).parent().submit();
	});

	//looks for the topic filter to change and turns off/on certain topics
	jQuery('#topic-select').change(function() {
		new_topic = jQuery(this).val();
		topic_url = jQuery('#topic-select').data('url');
		window.location.href = '/lti/filter/' + encodeURIComponent(new_topic);
	});
});