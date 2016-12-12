var replies_template = require('./replies_template');
module.exports = function(replies_list, thread_id) {
	var element = document.createElement('div');
	element.className ='same-page-repliesList';
	element.tabIndex = 0;
	element.id = 'replies-for-' + thread_id;
	element.innerHTML= '<div class="scroll-to-bottom" role="button">Link to bottom of list</div><div role="button" class="scroll-to-top">Link to top of list</div>'
	
	jQuery.each(replies_list, function(index, value) {
		jQuery(element).prepend(replies_template(value));
	});
	return element;
};