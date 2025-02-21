import { EventId, QueryEventsParams } from "@mysten/sui/client";
import ChainUtility from "./chainUtility";
import { adminCap, innerGamesTrackerAddy, innerProfilesTableAddy, OGAddy, packageAddy, sender, suiClient } from ".";
import ConnectFourAI from "./ConnectFourAI";
import { Transaction } from "@mysten/sui/transactions";

type GameBasicInfo = {
    type: number,
    currentPlayerTurn?: number,
    winner?: number,
    lastTurnEpoch?: number,
    p1: string,
    p2: string,
    // nonce?: number,
    lastMoveColumn?: number // nonce onchain
  }

  interface TableEntry {
    key: string;
    value: any; // Replace 'any' with your specific value type
}

class Find4 {
  gamesPerUser = new Map<string, Set<string>>();
  allGamesInfo = new Map<string, GameBasicInfo>();
  lastMultiPlayerMoveEventId: EventId | null = {"txDigest":"fANAGqdeprBEe6ktdSx8NK2Xw5C6CzzPGLSw5AdYBsZ","eventSeq":"0"};
  lastSinglePlayerMoveEventId: EventId | null = {"txDigest":"9hMnYy43cxHWQqug2mwdjxvs3CHTXZn9MeA9BpcsVuW7","eventSeq":"0"};
  chainUtil: ChainUtility;


  public constructor(chainUtil: ChainUtility){
    this.chainUtil = chainUtil;
  }

  public getUserGamesAndLatestGameBasicInfo(addy: string, getBasicInfo: boolean){
    // if (!gamesPerUser.has(addy)){
      // console.log("hh");
        this.GetGamesListForUser(addy).then((obj) => {
          // console.log(obj);
          // console.log("rr");
          this.gamesPerUser.set(addy, new Set());
          obj.forEach((gameId) => {
            this.gamesPerUser.get(addy)?.add(gameId);
            if(getBasicInfo){
              this.getBasicGameInfo(gameId);
            }
          });
        }).catch(e => console.log(e));
    //  }
  };

  public async GetGamesListForUser(addy: String): Promise<string[]>  {
    // console.log("22222MY GAMESSSSSSS2222");
      let data: string[] = [];
    // console.log(addy);
    // console.log("LLLLLLL");
      await suiClient.getDynamicFieldObject({
          parentId: innerGamesTrackerAddy!,
          name: {
              type: 'address',
              value: addy,
          },
      }).then((data2) => {
          if(data2!.data){
        // console.log((data2!.data!.content! as any).fields.value);
              let tmp = (data2!.data!.content! as any).fields.value;
        // console.log("MY GAMESSSSSSS");
              // console.log(tmp);
              data = tmp;
          }
      }).catch(error => {
      console.log("GetGamesListForUser Error: " + error.status);
    });
      return data;
  };

public aiMakeMove(gameId: string, gameDataNonce: number, bestMoveColumn: number){
    this.chainUtil.sendTransaction(this.aiMoveCreateTx(gameId, bestMoveColumn)).then(success => {
      //setup for next time player move come in in advance
        // allGamesInfo.get(gameId)!.nonce! = gameDtaNonce + 1;
        this.allGamesInfo.get(gameId)!.lastMoveColumn! = bestMoveColumn;
        this.allGamesInfo.get(gameId)!.currentPlayerTurn! = 1;
        this.getBasicGameInfo(gameId);
        console.log(success);
    }).catch(error => {
      console.log(error);
      this.aiMakeMove(gameId, bestMoveColumn, bestMoveColumn);
    });
  }

  public async singlePlayerEventListener(): Promise<EventId | null>{
    // console.log("Listening for SinglePlayerGameHumanPlayerMadeAMove...");
    try {
      let queryParams: QueryEventsParams = {
      query: {MoveEventType: `${OGAddy}::single_player::SinglePlayerGameHumanPlayerMadeAMove`},//MoveEventModule: { package: process.env.REACT_APP_PACKAGE_ADDRESS, module: "single_player"}},
      order: "ascending",
      limit: 100,
      ...(this.lastSinglePlayerMoveEventId ? { cursor: this.lastSinglePlayerMoveEventId} : {})
      };
      const response = await suiClient.queryEvents(queryParams);
      const responseData = [...response.data];
      // return responseData || [];
   
if(responseData.length > 0){
  let newLastProcessedEventId: EventId | null = this.lastSinglePlayerMoveEventId;
        // fetchEvents("single_player::SinglePlayerGameHumanPlayerMadeAMove", true).then((events) => {
      // let gameIdSet = new Set();
            responseData?.forEach((event) => {
        newLastProcessedEventId = {
          txDigest: event.id.txDigest,
          eventSeq: event.id.eventSeq
        };
                let eventData = event.parsedJson as any;
        let gameId = eventData.game;
        if(!this.allGamesInfo.get(gameId)){
          this.getBasicGameInfo(gameId);
        }else{
           this.allGamesInfo.get(gameId)!.currentPlayerTurn = 2; // set to 2 so gui can read player has switched
        }
        // console.log("yyyyyyyyyeeeeeeee");
        // console.log(gameId);
         console.log(event.id.txDigest);
    console.log(this.allGamesInfo.get(gameId));
                // if (!gameIdSet.has(gameId)){
          // gameIdSet.add(gameId);
  //          console.log("jjjjj");
  //        console.log(allGamesInfo.get(gameId)?.nonce);
    // console.log(eventData.nonce); 
      if(this.allGamesInfo.get(gameId) && !this.allGamesInfo.get(gameId)?.winner){// && eventData.nonce >= allGamesInfo.get(gameId)?.nonce!){
            // console.log("PLAYER MADE A MOVE, AI'S TURN");
            //double check
          this.chainUtil.GetObjectContents(gameId).then((wrappedGameData) => {
            let gameData = wrappedGameData.data;
            // console.log(gameData.current_player);
            if (/*eventData.nonce == gameData.nonce && */gameData.gameType == 1 && !gameData.is_game_over && gameData.current_player == 2){
              let originalBoard = gameData.board.reverse();
              let board = Array(6).fill(null).map(() => Array(7).fill(0));
              let count = 0;
              for (let i = 0; i < board.length; i++){
                for (let j = 0; j < board[0].length; j++){
                  board[i][j] = parseInt(originalBoard[i][j]);
                  if(board[i][j] != 0){
                    count = count + 1;
                  }
                }
              }
              // console.log(board);
              let ai = new ConnectFourAI(board);
              let firstMoveChoices = [0,1,1,2,2,2,3,3,3,3,4,4,4,5,5,6];
              let bestMoveColumn = count < 2 ? firstMoveChoices[Math.floor(Math.random()*16)] : ai.findBestMove();
              // console.log(`best move ${bestMoveColumn}`);
              this.aiMakeMove(gameId, bestMoveColumn, bestMoveColumn);
            }else{
                this.getBasicGameInfo(gameId);
            }
          }).catch(error => {
            console.log(error);
          });
        }
                // }
        
            });
      return newLastProcessedEventId;
    }else{
      return this.lastSinglePlayerMoveEventId;
    }
 
    } catch (e) {
    console.log('fetchingEvents Error:' + (e! as any).status);
    return this.lastSinglePlayerMoveEventId;
  };
};

public newMultiPlayerGameEventListener() {
    this.chainUtil.fetchEvents("multi_player::MultiPlayerGameStartedEvent2", false).then((events) => {
        events?.forEach((event) => {
            let eventData = event.parsedJson as any;
    let gameId = eventData.game;
    let p1 = eventData.p1;
    let p2 = eventData.p2;
    // let nonce = eventData.nonce;
    // if(nonce > globalNonce){
        this.getBasicGameInfo(gameId);
      // getUserGamesAndLatestGameBasicInfo(p1, false);
      // getUserGamesAndLatestGameBasicInfo(p2, false);
      this.gamesPerUser.get(p1)?.add(gameId);
      this.gamesPerUser.get(p2)?.add(gameId);
      // globalNonce = nonce;
    // }
        });
    }).catch(error => {
  console.log(error);
});
};

public async multiPlayerMoveEventListener(): Promise<EventId | null>{
try {
  let queryParams: QueryEventsParams = {
  query: {MoveEventType: `0x87e2962a5315eeff4f1cf2848180a9b58a323053966780e60a9f127bcf5ccd6b::multi_player::MultiPlayerMoveEvent`},//MoveEventModule: { package: process.env.REACT_APP_PACKAGE_ADDRESS, module: "single_player"}},
  order: "ascending",
  limit: 10,
  ...(this.lastMultiPlayerMoveEventId ? { cursor: this.lastMultiPlayerMoveEventId} : {})
  };
  const response = await suiClient.queryEvents(queryParams);
  const events = [...response.data];
  
  if (events.length > 0) {
    let newLastProcessedEventId: EventId | null = this.lastMultiPlayerMoveEventId;
    for (const event of events) {
      // PROCESS EVENT
      this.getBasicGameInfo((event.parsedJson! as any).game);
      newLastProcessedEventId = {
        txDigest: event.id.txDigest,
        eventSeq: event.id.eventSeq
      };
    }
    // Update last processed event ID only after processing all new events
    return newLastProcessedEventId;
  }else{
    return this.lastMultiPlayerMoveEventId;
  }
} catch (e) {
  console.log('fetchingEvents Error:' + (e! as any).status);
  return this.lastMultiPlayerMoveEventId;
}
};

public getBasicGameInfo(gameId: string){
    this.chainUtil.GetObjectContents(gameId).then((data) => {
  // console.log("pp");
  // console.log(data);
  // if (!allGamesInfo.has(gameId)){
  let winner = parseInt(data.data.winner);

  if(data.data.board){
  let originalBoard = data.data.board.reverse();
  let board = Array(6).fill(null).map(() => Array(7).fill(0));
  let count = 0;
  for (let i = 0; i < board.length; i++){
    for (let j = 0; j < board[0].length; j++){
      board[i][j] = parseInt(originalBoard[i][j]);
      if(board[i][j] != 0){
        count = count + 1;
      }
    }
  }
  if(count == 42){
    winner = 5;
  }
}

  let gameInfo: GameBasicInfo = winner == 0 ? {
    type: parseInt(data.data.gameType),
    p1: data.data.p1,
    p2: data.data.p2,
    currentPlayerTurn: data.data.current_player,
    lastTurnEpoch: 0,
    // nonce: ,
    lastMoveColumn: parseInt(data.data.nonce)
  } : {
    type: parseInt(data.data.gameType),
    p1: data.data.p1,
    p2: data.data.p2,
    winner: winner
  };
  if(winner != 0){
    this.GetGamesListForUser(data.data.p1);
    this.GetGamesListForUser(data.data.p2);
  }
  this.gamesPerUser.get(data.data.p1)?.add(gameId);
  this.gamesPerUser.get(data.data.p2)?.add(gameId);
  this.allGamesInfo.set(gameId, gameInfo);
    // console.log(allGamesInfo);
    // console.log(gamesPerUser);
  // }
}).catch(e => console.log(e));
}

public aiMoveCreateTx(gameId: string, col: number): Transaction{
const txb = new Transaction();
try{
   txb.moveCall({
     target: `${packageAddy}::single_player::ai_make_move`,
     arguments: [txb.object(adminCap), txb.object(gameId), txb.pure.u64(col)],
   });
   txb.setSender(sender);
   txb.setGasPrice(1000);
   txb.setGasBudget(2000000);
} catch(e){
    console.log("AIMoveCreateTx ERROR: " + col);
}
return txb;
}

public setFind4Intervals(){
    setInterval(() => {
        // console.log("A");
        this.singlePlayerEventListener().then((eventId) => {
            // console.log(eventId);
          this.lastSinglePlayerMoveEventId = eventId;
        }).catch(e => {
          console.log(e);
        });
      }, 2500);
      
      setInterval(() => {
        this.newMultiPlayerGameEventListener();
      }, 15000);
      
      setInterval(() => {
        this.multiPlayerMoveEventListener().then((eventId) => {
            this.lastMultiPlayerMoveEventId = eventId;
        }).catch(e => {
          console.log(e);
        });
      }, 1500);
}



public async getAllProfiles(): Promise<TableEntry[]> {
    try {
        const tableEntries: TableEntry[] = [];
        let cursor = null;
        while(true){
        const dynamicFields = await suiClient.getDynamicFields({
            parentId: innerProfilesTableAddy,
            cursor: cursor,
            limit: 1000000
        });
        console.log("JKJKJK");
        console.log(dynamicFields);
        if (!dynamicFields.data) {
            return [];
        }
        // Fetch each table entry's value
        
        for (const field of dynamicFields.data) {
            const fieldObject = await suiClient.getObject({
                id: field.objectId,
                options: { showContent: true }
            });
            console.log(fieldObject);
            if (fieldObject.data?.content) {
                const content = fieldObject.data.content as any;
                tableEntries.push({
                    key: field.name.value as string,
                    value: content.fields.value.fields // Adjust based on your value structure
                });
            }
        }
        if(dynamicFields.hasNextPage){
            cursor = dynamicFields.nextCursor;
        }else{
            break;
        }
    }

        console.log(tableEntries);
        tableEntries.forEach((entry) => {
            console.log(entry);
            let tmp = entry.value;
            

            // if(tmp.points){
                this.chainUtil.allProfiles.set(entry.key, {username: tmp.username, points: parseInt(tmp.trophies), profilePicUrl: tmp.image_url});
            //   }
        });
        console.log(this.chainUtil.allProfiles);
        return tableEntries;
    } catch (error) {
        console.error('Error fetching table values:', error);
        throw error;
    }
}


}

 export default Find4;