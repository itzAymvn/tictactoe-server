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

const getRooms = () => {
    /*
    players = [
        {
            id: 'cdTwV0bnIA_c8ng6AAAB',
            username: 'Aymvn',
            room: '123',
            symbol: 'X',
            score: undefined
        },
        {
            id: 'cdTwVez_c8ng6AAAB',
            username: 'Anas
            room: '123',
            symbol: 'O',
            score: undefined
        }
    ]
    */

    // Get all rooms
    const rooms = players.map((player) => {
        // return list of rooms along with the number of players in each room
        return {
            room: player.room,
            players: getPlayersInRoom(player.room).length,
        };
    });

    // Remove duplicate rooms
    const uniqueRooms = rooms.filter(
        (room, index, self) =>
            index === self.findIndex((r) => r.room === room.room)
    );

    return uniqueRooms;
};

module.exports = {
    getPlayersInRoom,
    addPlayer,
    removePlayer,
    getPlayer,
    getRooms,
};
