/**
 * Socket.io Client Service
 * @owner ValGSgit
 * Handles real-time events: chat, notifications, game state, presence
 */

import { io } from 'socket.io-client'

let socket = null

export function connectSocket(token) {
	socket = io('http://localhost:3000', {
		auth: { token },
		autoConnect: true,
	})
	return socket
}

export function disconnectSocket() {
	if (socket) socket.disconnect()
}

export { socket }
