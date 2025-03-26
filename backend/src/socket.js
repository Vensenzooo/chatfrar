export function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    socket.on('send_message', (messageData) => {
      const roomId = messageData.groupId || `dm_${messageData.senderId}_${messageData.receiverId}`;
      io.to(roomId).emit('receive_message', messageData); // Vérifiez que 'receive_message' est bien émis
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });
}