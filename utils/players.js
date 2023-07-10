//Array of players
const players = [];

const getPlayersInRoom = (room) => {
    return players.filter((player) => player.room === room);
};

const addPlayer = ({ id, username, room, symbol }) => {
    players.push({ id, username, room, symbol });
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
