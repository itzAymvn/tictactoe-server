//Array of players
const players = [];

const getPlayersInRoom = (room) => {
    const playersInRoom = players.filter((player) => player.room === room);
    return playersInRoom;
};

const addPlayer = ({ id, username, room, symbol, score }) => {
    players.push({ id, username, room, symbol, score });
};

const removePlayer = (id) => {
    const index = players.findIndex((player) => player.id === id);

    if (index !== -1) {
        return players.splice(index, 1)[0];
    }

    return null;
};

const getPlayer = (id) => {
    return players.find((player) => player.id === id);
};

module.exports = {
    getPlayersInRoom,
    addPlayer,
    removePlayer,
    getPlayer,
};
