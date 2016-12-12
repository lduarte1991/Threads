var replies_container = require('./replies_container');

module.exports = function(thread_obj) {
    var element = document.createElement('div');
    element.role = 'listitem';
    element.tabIndex = 0;
    element.className = 'thread-item item-' + thread_obj.pk;
    element.innerHTML = "<h4 class='thread-title'>" + thread_obj.fields.title + "</h4><div class='replies-count' role='button' aria-label='Click to view " + thread_obj.fields.replies + " replies' aria-pressed='false'>" + thread_obj.fields.replies + '</div>';
    return element;
};
