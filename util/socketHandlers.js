// Map to contain connected conversations and their socket ids.
const conversationSocketIdMap = new Map();

// Getter function to allow access to conversationSocketIdMap
exports.getConversationSocketIdMap = () => {
	return conversationSocketIdMap;
};

// Below function adds conversations and socket ids to conversationSocketIdMap.
exports.addClientToMap = (conversationId, socketId) => {
	conversationSocketIdMap.set(conversationId, socketId);
};

// Below function removes conversations and socket ids from conversationSocketIdMap.
exports.removeClientFromMap = (conversationId, socketId) => {
	conversationSocketIdMap.delete(conversationId);
};
