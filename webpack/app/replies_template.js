module.exports = function(reply) {
	var element = document.createElement('div');
	element.className = 'reply-item';
	element.id = 'reply-item-' + reply.pk;
	element.innerHTML = "<div class='reply-message'><span class='reply-pseudo'>"+reply.fields.pseudonym+":</span>"+reply.fields.message+"</div><time class='reply-date timeago' datetime='"+reply.fields.updated_date+"'>"+reply.fields.updated_date+"</time></div>";
	return element;
}