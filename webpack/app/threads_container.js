module.exports = function() {
    var element = document.createElement('section');
    element.className = 'new-thread-container';
    element.role = 'application';
    element.ariaLabel = 'Threads | Threads Container';
    element.innerHTML = "<div class='header-container'>\
    <h3 class='header'>Threads</h3>\
    </div>\
    <div class='threads-list' role='list' aria-label='Threads List'></div>";
    return element;
}
