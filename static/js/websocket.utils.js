/*
 * websocket.utils.js
 * -- Abstracted functions -- 
 * Used to perform websocket requests.
 */

(function($) {
    $.Websocket = function(options) {
        this.socket = undefined;
        this.notification_socket = undefined;
        this.websockets_failures = 0;

        // change this at will
        this.failure_max = 15;
        this.lastError = undefined;
        
        // pass in function that does something when a string message
        // is passed in. Defaults to console log.
        if (options['failure_backup'] !== undefined) {
            this.failure_backup = options['failure_backup'];
        } else {
            this.failure_backup = function(message) {
                console.log(message);
            };
        }

        // usually the same url in the location, but left as an option in case it should change
        if (options['websocket_url'] !== undefined) {
            this.websocket_url = options['websocket_url'];
        } else {
            this.websocket_url = '';
            console.log('No url for Websockets was provided.');
        }

        // the anon_id has to be passed in via html/cms
        if (options['anon_id'] !== undefined) {
            this.user_id = options['anon_id'];
        } else {
            this.user_id = '';
            console.log('No user_id was provided');
        }

        // fallback_url - what url should be called if websockets fails too many times
        if (options['fallback_url'] !== undefined) {
            this.fallback_url = options['fallback_url'];
        } else {
            console.log('No fallback url was provided.');
            this.fallback_url = '';
        }

        // fallback function - what should happen if there is an error?
        if (options['fallback'] !== undefined) {
            this.fallback = options['fallback'];
        } else {
            this.fallback = function() {
                console.log('No fallback function was provided.');
            };
        }

        // function that does something with the websocket's response message
        if (options['decode_message']) {
            this.decode_message = options['decode_message'];
        } else {
            this.decode_message = function(message) {
                console.log('No decode message function was provided.');
                console.log(message);
            };
        }

        if (options['unique_key']) {
            this.unique_key = encodeURIComponent(options['unique_key']);
        } else {
            this.unique_key = '';
        }

        this.init();

        return this;
    };

    // should bind the send thread and send reply pub/sub and set up websocket item
    $.Websocket.prototype.init = function() {
        this.setUpWebSocket();
        jQuery.subscribe('ltithreads.websocket.sendThread', this.sendSocket.bind(this));
        jQuery.subscribe('ltithreads.websocket.sendReply', this.sendSocket.bind(this));
    };

    // sets up websockets (and restarts if connection should ever fail)
    $.Websocket.prototype.setUpWebSocket = function() {
        if (this.websockets_failures > this.failure_max) {
            this.failure_backup('Live Update Server is down. Refresh to get new replies.');
        }

        var protocol = 'wss://';
        if(window.location.protocol !== 'https:') {
            protocol = 'ws://';
        }
        
        var self = this;

        // connects all functions below 
        self.socket = new WS4Redis({
            uri: protocol + this.websocket_url + '/ws/threads'+self.unique_key+'?subscribe-broadcast',
            connecting: self.messageReceived.bind(self),
            connected: self.connectionCreated,
            receive_message: self.messageReceived.bind(self),
            disconnected: self.connectionClosed,
            heartbeat_message: '--heartbeat--'
        });

        self.notification_socket = new WS4Redis({
            uri: protocol + self.websocket_url + '/ws/' + self.user_id + '?subscribe-broadcast',
            connecting: self.messageReceived.bind(self),
            connected: self.connectionCreated,
            receive_message: self.messageReceived.bind(self),
            disconnected: self.connectionClosed,
            heartbeat_message: '--heartbeat--'
        });

    };

    // reconnects websocket should it ever disconnect
    $.Websocket.prototype.waitForConnection = function(callback, interval) {
        var self = this;

        // if socket is open then its time to do the callback
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            callback();
            if (this.websockets_failures > 0) {
                console.log('There was a failure, but now it is working.');
            }
            this.websockets_failures = 0;
        } else {
            // if it has completely closed, then we must restart it
            if (this.socket && this.socket.readyState === WebSocket.CLOSED) {
                this.websockets_failures = this.websockets_failures + 1;
                
                console.log("Closed Connection");
                this.setUpWebSocket();
            }

            // if it has not 
            setTimeout(function() {
                self.waitForConnection(callback, interval);
            }, interval);
        }
    };

    // actually sends a message back to the server
    $.Websocket.prototype.sendSocket = function(_, message) {
        var self = this;
        self.waitForConnection(function() {
            self.socket.send(message);
        }, 500);
    };

    // passes back messages from server to be decoded
    $.Websocket.prototype.messageReceived = function(event) {
        var self = this;
        try{
            var content = JSON.parse(event);
            console.log("Tried and true");
            self.decode_message(content);
        } catch (e) {
            // console.log("Tried and failed");
            // self.decode_message(event);
        }
    };

    // if there is an error, we add to a counter and write when the latest error happened
    $.Websocket.prototype.errorReceived = function(event) {
        this.websockets_failures = this.websockets_failures + 1;
        this.lastError = new Date();
    };

    // runs when websockets connection is first created
    $.Websocket.prototype.connectionCreated = function() {
        if (this.websockets_failures > 0 && this.lastError) {

            // calls fallback function if there was an error and there was a high number of failures
            var self = this;
            var newest = new Date();
            var delta = Math.ceil ((newest - this.lastError) / 1000);
            console.log('Time between error and restart: ' + delta + ' seconds.');

            jQuery.ajax({
                url: self.fallback_url + delta + '/',
                method: 'GET',
                success: function(data) {
                    self.fallback(data);
                }
            });
            this.lastError = undefined;
        }
        this.websockets_failures = 0;
    };

    // runs when connection closes and notes what the reason is given the status codes
    $.Websocket.prototype.connectionClosed = function() {
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

        //log reason for debug purposes
        console.log(reason);

        // try to restart the connection after a half-second wait
        setTimeout(window.setUpWebSocket, 500);

        // count this as a failure since connection shouldn't close
        window.websockets_failures = window.websockets_failures + 1;
    };

}(HxThreads));