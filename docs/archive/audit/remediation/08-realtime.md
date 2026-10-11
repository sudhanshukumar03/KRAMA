# Domain events and socket updates

The realtime repair connected existing task and notification paths to the socket service. The earlier frontend already listened for events that the backend did not consistently publish, so a connected socket alone did not establish useful delivery.

## RT-01: the complete event path

Task creation, update and deletion needed matching domain events at their actual mutation sites. Their payloads also needed enough verified user and workspace identity for subscribers to choose the correct destination. Notification creation previously wrote a database row without emitting a corresponding socket update.

The repair covered publishers, subscribers and the notification worker. Events were published after the database transaction committed so clients would not refresh for a change that later rolled back. An absent user identifier could not be replaced with a hardcoded fallback or used to target an undefined room.

Later authorization work checked socket admission and workspace rooms against the user's permitted scope. Personal updates and workspace-wide updates have different audiences; event names alone do not define who may receive their payload.

## RT-02: recovery after disconnection

Notification polling was lengthened from thirty seconds to a three-minute fallback once push delivery was connected. Reconnect handling invalidated notification and task readers so changes missed while offline could be fetched again.

Socket events trigger query refreshes rather than creating a second independent copy of task state. That keeps normal reads, reconnect recovery and mutation responses aligned.

## Recorded verification

The original checks followed a mutation from its publisher through the subscriber to a connected client, rather than stopping at listener registration. They also covered notification delivery, reconnect refresh and fallback polling.

The same transaction and identity requirements apply when new subscribers are added. Current implementation is in the [event subscribers](../../../../apps/server/src/events/subscribers.ts), [socket service](../../../../apps/server/src/services/socket.service.ts) and [frontend provider](../../../../apps/web/src/providers/SocketProvider.tsx). See the [development guide](../../../development/README.md) for verification setup.
