# Threads
LTI tool made by HarvardX to provide a pseudonymous forum-like experience. 

## Goals and Deliverables

The first iteration of the threads tool was built by Tyler Vigen for Professor 
Charles Nesson's Jury course. It was built using PHP and Javascript with a
MySQL backend. As outlined in Vigen's paper "Threads -- A Deliberation", its
main purpose was to provide a forum-like environment in which a level of 
pseudonymity could be attained. 

The course involves learners having to comment and discuss controversial topics
without fear of having opinions outside the "norm" or what may be deemed
"socially acceptable." Any learner may start a thread and any learner may
respond to that thread. In order to create a sense of dialogue (as opposed
to monologue), students receive a pseudonym which they keep for the duration
of the thread. They can then reference each other and maintain a connection
with who said what in each discussion while at the same time maintaining a level
of anonymity.

The purpose of this tool is outlined by the following goals:

1. Convert the tool to follow the LTI protocol.

2. Move the tool from its current framework to something that's easily extensible/scaled.

3. Keep the pseudonymity aspect of the previous tool though update the algorithm, adapt it to an environment which can handle multiple courses customizing to fit their needs.

4. Update the system of "live-updates" from its current polling state to one involving either long polling or, most desiribly, WebSockets.

5. Create an admin interface which lives within the tool instead of using the PHPMyAdmin interface (which would create not only security issues, but make the process more prone to mistakes since TFs would have access).

Here are the current deliverables for the tool to outline an MVP:

1. Interface to allow learners to make threads.

2. Interface to allow learners to reply to these threads.

3. Pseudonymity support so that learners identities aren't compromised
   while at the same time maintaining the same identities as long as
   the conversation remains in the same thread.

4. Admin interface which allows instructors/staff to "delete",
   "hide" and move threads from one topic to another.

4. Admin interface which allows instructors/staff to "delete" and
   "hide" replies to threads.

5. Interface for students to be able to switch between threads.

6. A live-update mechanism which either (a) allows a user to automatically
   receive responses as another learner posts it or (b) be notified
   that there was a new thread or response via numbered badges (a la apps)
       
    7. Allow users to be able to be notified when somebody mentions them via
       an @ tag.
       
    8. Have a mechanism to customize what tags are available on a 
       course-by-course basis. 
