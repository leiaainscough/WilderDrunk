//MODEL
const model = {
    //hashmap clients
    clients:[],
    game:[],

    newGame(id, clientId, nickname){
        this.game.push({
            gameId: id,
            cards: [],
            players: []
        })
        this.newGamePlayer(id, clientId);
        game_index = this.findGameInArray(id)
        this.getCards(game_index);
    },

    newClient(id, nick, conn){
        this.clients.push({
            clientId: id,
            nickname: nick,
            connection: conn
        })
    },

    newGamePlayer(gameId, clientId){
        game_index = this.findGameInArray(gameId);
        this.game[game_index].players.push(clientId)
    },

    getRandomCard(gameId){
        game_index = this.findGameInArray(gameId);
        no_cards = this.game[game_index].cards.length;
        index = Math.floor(Math.random() * no_cards);
        selected_card = this.game[game_index].cards[index];

        this.game[game_index].cards.splice(index, 1);
        
        return selected_card;
    },

    findClientInArray(id){
        for (i = 0; i < this.clients.length; i++){
            if (this.clients[i].clientId === id){
                return i;
            }
        }
        return null;
    },

    findGameInArray(id){
        for (i = 0; i < this.game.length; i++){
            if (this.game[i].gameId === id){
                return i;
            }
        }
        return null;
    },

    getCards(game_index){
        cards = ['lion','rhino','springbok','snake','spider','gorilla','crocodile','crane','vulture','elephant','giraffe','zebra'];
        cards.forEach(c=> {
            this.game[game_index].cards.push(c)
        })
    },

    makeId(){
        let ID = "";
        let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for ( var i = 0; i < 6; i++ ) {
          ID += characters.charAt(Math.floor(Math.random() * 36));
        }
        return ID;
    }
}
//CONTROLLER

const controller = {
    
    init(){
        websocketServer = require("websocket").server;
        wsServer=  new websocketServer({
            "httpServer": httpServer
        })
        wsServer.on("request", request => {
            const connection = request.accept(null, request.origin)
            connection.on("open", () => console.log("opened!"))
            connection.on("close", (e) => console.log("closed!" + e))
            connection.on("message", message => {
                const result = JSON.parse(message.utf8Data);
                //I have received a message from the client
                //a user want to create a new game
    
                if (result.method === "nick"){
                    const clientId = result.clientId;
                    const nickname = result.nickname;
    
                    model.newClient(clientId, nickname, connection);
                    
                    index = model.findClientInArray(clientId);
                    

                    const to_send = {
                        "method": "nick",
                        "client": model.clients[index].nickname
                    }
                    
                    const con = model.clients[index].connection;
                    con.send(JSON.stringify(to_send));
                }
    
                if (result.method === "create") {
                    const clientId = result.clientId;
                    const nickname = result.nickname;
                    
                    //GET FROM MODEL
                    const gameId = model.makeId();
    
                    model.newGame(gameId, clientId, nickname);
                    
                    index = model.findClientInArray(clientId);
                    game_index = model.findGameInArray(gameId);

                    const to_send = {
                        "method": "create",
                        "gameId": gameId,
                    }

                    const con = model.clients[index].connection;
                    con.send(JSON.stringify(to_send));
    
                }        
    
                //a client want to join
                if (result.method === "join") {
    
                    const clientId = result.clientId;
                    const gameId = result.gameId;
                    
                    game_index = model.findGameInArray(gameId);

                    if (game_index === null){
                        message = "invalid";
                    } else if (model.game[game_index].players.length >= 6){
                        message = "full";
                    } else {
                        message = "welcome";
                        model.newGamePlayer(gameId, clientId);

                        
                        const to_leader = {
                            "method": "new_player",
                            "nickname": model.clients[index].nickname
                        }

                        leader = model.game[game_index].players[0];

                        leader_index = model.findClientInArray(leader);
    
                        model.clients[leader_index].connection.send(JSON.stringify(to_leader));
                    }
                    
                    index = model.findClientInArray(clientId);

                    console.log(message);

                    const to_send = {
                        "method": "join",
                        "message": message
                    }

                    //loop through all clients and tell them that people has joined
                    model.clients[index].connection.send(JSON.stringify(to_send));

                }       
    
                if (result.method === "draw") {
                    const id = result.clientId;
                    const gameId = result.gameId;
    
                    //MODEL
                    const selected_card = model.getRandomCard(gameId);
    
                    const to_current = {
                        "method": "draw",
                        "random_card": selected_card,
                        "turn": "true"
                    }
                    
                    index = model.findClientInArray(clientId);
                    game_index = model.findGameInArray(gameId);

                    const to_players = {
                        "method": "draw",
                        "random_card": selected_card,
                        "turn": "false",
                        "player": model.clients[index].nickname
                    }
                        
                    model.game[game_index].players.forEach(c=> {
                        if (c !== id){
                            index = model.findClientInArray(c)
                            model.clients[index].connection.send(JSON.stringify(to_players));
                        } else {
                            index = model.findClientInArray(id)
                            model.clients[index].connection.send(JSON.stringify(to_current));
                        }
                    })

                    if (selected_card === undefined){
                        model.game.splice(game_index, 1);
                    }
                }

                if (result.method == "next"){
                    const clientId = result.clientId;
                    const gameId = result.gameId;
                    
                    game_index = model.findGameInArray(gameId);
                    index = model.findClientInArray(clientId);

                    //GET NEXT PLAYER - MODEL
                    for (i = 0; i < model.game[game_index].players.length; i++){
                        if (model.game[game_index].players[i] === clientId){
                            next_player = i + 1;
                        }
                    }
                    if (next_player === model.game[game_index].players.length){
                        next_player = 0;
                    }
    
                    const next_client = model.game[game_index].players[next_player];
                    const to_send = {
                        "method": "next",
                        "gameId": gameId,
                        "client": next_client
                    }   

                    model.game[game_index].players.forEach(p =>{
                        index = model.findClientInArray(p)
                        model.clients[index].connection.send(JSON.stringify(to_send));
                    })
                }
            })
    
            //generate a new clientId
            const clientId = model.makeId();
            
            //MODEL
            model.clients[clientId] = {
                "connection":  connection,
                "nickname": null
            }
    
            const to_send = {
                "method": "connect",
                "clientId": clientId
            }
            //send back the client connect
            connection.send(JSON.stringify(to_send))
    
        }
        )}
}

const http = require("http");
var express = require("express");
var app = express();
app.use(express.static('public'));
app.use(express.static('img'));
app.get("/", (req,res)=> res.sendFile(__dirname + "/index.html"));
app.use("/", (req,res)=> res.sendFile(__dirname + "/style.css"));
app.listen(5556, ()=>console.log("Listening on http port 5056"));
const httpServer = http.createServer();
httpServer.listen(5555, () => console.log("Listening.. on 5555"));
controller.init();
