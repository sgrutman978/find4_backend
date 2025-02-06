// import useSui from "./useSui";
import { Transaction } from "@mysten/sui/transactions";
import { EventId, getFullnodeUrl, QueryEventsParams, SuiClient, SuiObjectChangeCreated, SuiObjectResponse } from "@mysten/sui/client";
// import { useCallback, useState } from "react";
import ConnectFourAI from './ConnectFourAI';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import https from 'https';
import fs from 'fs';

// const https = require('https');
// const fs = require('fs');

//import dotenv from "dotenv";
//dotenv.config();

/*
type OnlineStatus = {
    addy: string,
    epoch: number
};*/

type GameBasicInfo = {
  type: number,
  currentPlayerTurn?: number,
  winner?: number,
  lastTurnEpoch?: number,
  p1: string,
  p2: string
  nonce?: number
}

export interface Profile {
  profilePicUrl?: string,
  username?: string,
  points?: number
};

import * as dotenv from "dotenv";
dotenv.config({ path: '.env' });

const app = express();
const port: number = 3000;

export const suiClient = new SuiClient({ url: "https://go.getblock.io/2e301c1cd2e542e897c7a14109d81baf"}); //getFullnodeUrl("mainnet") });

const kp_import_0 = Ed25519Keypair.fromSecretKey(process.env.REACT_APP_PK!);
const pk = kp_import_0.getPublicKey();
const sender = pk.toSuiAddress();
// const addToListMap = new Map<string, number>();
// let globalNonce = 0;
export const innerGamesTrackerAddy = port == 3000 ? process.env.REACT_APP_GAMES_TRACKER_INNER_ADDY_MAINNET : process.env.REACT_APP_GAMES_TRACKER_INNER_ADDY;
const OGAddy = port == 3000 ? process.env.REACT_APP_ORIGINAL_ADDRESS_FOR_EVENT_AND_OBJECT_TYPE_MAINNET! : process.env.REACT_APP_ORIGINAL_ADDRESS_FOR_EVENT_AND_OBJECT_TYPE!;
const adminCap = port == 3000 ? process.env.REACT_APP_ADMIN_CAP_ADDRESS_MAINNET! : process.env.REACT_APP_ADMIN_CAP_ADDRESS!;
const packageAddy = port == 3000 ? process.env.REACT_APP_PACKAGE_ADDRESS_MAINNET! : process.env.REACT_APP_PACKAGE_ADDRESS!;
// const globalNonceAddy = port == 3000 ? process.env.REACT_APP_NONCE_ADDRESS_MAINNET! : process.env.REACT_APP_NONCE_ADDRESS!;
const innerProfilesTableAddy = "0x85728786020e36230cb9c38a181a51eff5b11259d4dd0d35850b298fd45d8a28";
// let firstGo = true;
const currentOnline = new Map<string, number>();
const gamesPerUser = new Map<string, Set<string>>();
const allGamesInfo = new Map<string, GameBasicInfo>();
const allAddys = new Set<string>();
const allProfiles = new Map<string, Profile>();
allAddys.add("0x8418bb05799666b73c4645aa15e4d1ccae824e1487c01a665f51767826d192b7");
allAddys.add("0x35f1de2d4b389c76e57a617688f9034e7ac57a22d0e19ff54541ae93e270d0b0");


// Read SSL certificate and key files
// const options = {
//   key: fs.readFileSync('key.pem'),
//   cert: fs.readFileSync('cert.pem')
// };

// Create HTTPS server
// const server = https.createServer(options, app);
const server = https.createServer({ key: fs.readFileSync('./key2.pem'), cert: fs.readFileSync('./cert2.pem')}, app);
// passphrase: process.env.REACT_APP_CERT_PASSWORD}

app.use(cors());
app.use(bodyParser.json());

app.post('/imonline', (req, res) => {
  try{
   let addy = req.body.addy;
   allAddys.add(addy);
   if(!allProfiles.has(addy)){
    GetProfile(addy).then((prof) => {
      console.log("ppppproooooffiiiiillleeee");
      console.log(prof);
      console.log(prof.points);
      if(prof.points){
        allProfiles.set(addy, prof);
      }
    }).catch((e) => console.log(e));
   }
   let epoch = Date.now();
   currentOnline.set(addy, epoch);
  //  console.log("ll");
   if(addy && !gamesPerUser.has(addy)){
    getUserGamesAndLatestGameBasicInfo(addy, true);
   }
   res.send('Online');
  } catch (e) {
    console.log(e);
  }
});

const getUserGamesAndLatestGameBasicInfo = (addy: string, getBasicInfo: boolean) => {
  // if (!gamesPerUser.has(addy)){
    // console.log("hh");
      GetGamesListForUser(addy).then((obj) => {
        // console.log(obj);
        // console.log("rr");
        gamesPerUser.set(addy, new Set());
        obj.forEach((gameId) => {
          gamesPerUser.get(addy)?.add(gameId);
          if(getBasicInfo){
            getBasicGameInfo(gameId);
          }
        });
      }).catch(e => console.log(e));
  //  }
};

const getBasicGameInfo = (gameId: string) => {
  GetObjectContents(gameId).then((data) => {
    // console.log("pp");
    // console.log(data);
    // if (!allGamesInfo.has(gameId)){
    let winner = parseInt(data.data.winner);

    let gameInfo: GameBasicInfo = winner == 0 ? {
      type: parseInt(data.data.gameType),
      p1: data.data.p1,
      p2: data.data.p2,
      currentPlayerTurn: data.data.current_player,
      lastTurnEpoch: 0,
      nonce: parseInt(data.data.nonce)
    } : {
      type: parseInt(data.data.gameType),
      p1: data.data.p1,
      p2: data.data.p2,
      winner: data.data.winner
    };
    if(winner != 0){
      GetGamesListForUser(data.data.p1);
      GetGamesListForUser(data.data.p2);
    }
    gamesPerUser.get(data.data.p1)?.add(gameId);
    gamesPerUser.get(data.data.p2)?.add(gameId);
      allGamesInfo.set(gameId, gameInfo);
      // console.log(allGamesInfo);
      // console.log(gamesPerUser);
    // }
  }).catch(e => console.log(e));
}

export const GetProfile = async (addy: String): Promise<Profile> => {
	let data: Profile = {};
    await suiClient.getDynamicFieldObject({
		parentId: innerProfilesTableAddy!,
		name: {
            type: 'address',
            value: addy,
        },
	}).then((data2) => {
		if(data2!.data){
			let tmp = (data2!.data!.content! as any).fields.value.fields;
			console.log(tmp);

			data = {username: tmp.username, points: parseInt(tmp.trophies), profilePicUrl: tmp.image_url};
		}
	}).catch(e => console.log(e));
	return data;
};

function getRandomElementFromSet<T>(set: Set<T>): T | undefined {
  if (set.size === 0) {
    return undefined;
  }
  const values = Array.from(set);
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex];
}

app.get('/howmanyonline', (req, res) => {
    res.json({size: currentOnline.size});
});

app.get('/leaderboard', (req, res) => {
  console.log("\n\n\n\n\n\nyyyyyyyyyyy");
  console.log(allProfiles);
  const mapEntries = Array.from(allProfiles.entries());
  mapEntries.sort((a, b) => a[1].points! - b[1].points!);
  const sortedMap = new Map(mapEntries);
  let arr: {}[] = [];
  sortedMap.forEach((value, key) => {
      arr.push({addy: key, ...value});
  });
  res.json({profiles: arr});
});

app.get('/getP2', (req, res) => {
  const addy = req.query.addy as string;
  while(true){
    let randomAddy = getRandomElementFromSet(allAddys);
    if(randomAddy && addy != randomAddy){
      res.json({p2: randomAddy});
      break;
    }
  }
});

app.get('/myGames', (req, res) => {
  const addy = req.query.addy as string;
  let games: any[] = [];
  gamesPerUser.get(addy)?.forEach((gameId) => {
    let basicGame = allGamesInfo.get(gameId);
    if(basicGame){
      games.push({...allGamesInfo.get(gameId)!, id: gameId});
    }
  });
  res.json({games: games});
});

app.get('/whoTurn', (req, res) => {
  const gameId = req.query.gameId as string;
  if(!allGamesInfo.has(gameId)){
    getBasicGameInfo(gameId);
  }
  // console.log(allGamesInfo.get(gameId));
  // console.log(allGamesInfo);
  let turn = allGamesInfo.get(gameId)?.currentPlayerTurn;
  res.json({turn: turn});
});

// app.listen(port, () => {
//   console.log(`Server running at http://localhost:${port}/`);
// });

server.listen(3000, () => {
  console.log('HTTPS server listening on port '+3000);
});

setInterval(() => {
	currentOnline.forEach((value, key, map) => {
	    if(Date.now() - value > 69000){
		map.delete(key);
	    }
	});
	//console.log(currentOnline.size);
	//console.log(currentOnline);

/*	GetObjectContents("0xd2126d45f8a0dadc5b12d649a1a28f24f2b3cd4ba8b60cb11e697f574f294e79").then((obj) => {
  console.log(obj);
  addToListNonce = parseInt(obj.data.nonce);
});*/
}, 15000);

setInterval(() => {

}, 60000);

export const GetGamesListForUser = async (addy: String): Promise<string[]> => {
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

export const GetObjectContents = async (id: string): Promise<any> => {
	let data: SuiObjectResponse = {};
	let dataSet = false;
    await suiClient.getObject(
		{
			id: id,
			options: {
				showContent: true,
				showOwner: true
			}}
	).then((data2) => {
		data = data2;
		// console.log(data2);
		dataSet = true;
	}).catch(error => {
        console.log("GetObjectContents Error: " + error.status);
  });
	return dataSet && data?.data?.content ? {data: (data?.data?.content as any)["fields"], version: data.data?.owner} : {data: [], version: ""};
};

// GetObjectContents(globalNonceAddy).then((obj) => {
//   // console.log(obj);
//   globalNonce = parseInt(obj.data.nonce);
// });

let lastMultiPlayerMoveEventId: EventId | null = null;

setInterval(() => {
  singlePlayerEventListener();
}, 2500);

setInterval(() => {
  newMultiPlayerGameEventListener();
}, 15000);

setInterval(() => {
  multiPlayerMoveEventListener().then((eventId) => {
    lastMultiPlayerMoveEventId = eventId;
  }).catch(e => {
    console.log(e);
  });
}, 1500);

const aiMoveCreateTx = (gameId: string, col: number): Transaction => {
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

// const newGameCreateTx = /*async*/ (p1: string, p2: string): Transaction => { //Promise<Transaction> => {
//   const txb = new Transaction();
//   // await GetObjectContents(gameId).then((wrappedGameData) => {
//   txb.moveCall({
//     target: `${packageAddy}::multi_player::attempt_pairing`,
//     arguments: [txb.object(adminCap), txb.pure.address(p1), txb.pure.address(p2)],
//   });
// // });
//   txb.setSender(sender);
//   txb.setGasPrice(1000);
//   txb.setGasBudget(20000000);
//   return txb;
// }

const sendTransaction = async (txb: Transaction) => {
  const bytes = await txb.build(
    {client: suiClient}
  );
  const serializedSignature = (await kp_import_0.signTransaction(bytes)).signature;
  let res = suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature: serializedSignature,
  });
  return res;
}

export const fetchEvents = async (eventType: string, OG: boolean) => {
	try {
	  let queryParams: QueryEventsParams = {
		query: {MoveEventType: `${(OG ? OGAddy : packageAddy)}::${eventType}`},//MoveEventModule: { package: process.env.REACT_APP_PACKAGE_ADDRESS, module: "single_player"}},
		order: "descending",
		limit: 10,
	  };
	  const response = await suiClient.queryEvents(queryParams);
    const responseData = [...response.data];
	  return responseData || [];
	} catch (e) {
	  console.log('fetchingEvents Error:' + (e! as any).status);
	}
  };

	const singlePlayerEventListener = () => {
    // console.log("Listening for SinglePlayerGameHumanPlayerMadeAMove...");
		fetchEvents("single_player::SinglePlayerGameHumanPlayerMadeAMove", true).then((events) => {
      // let gameIdSet = new Set();
			events?.forEach((event) => {
				let eventData = event.parsedJson as any;
        let gameId = eventData.game;
        if(!allGamesInfo.get(gameId)){
          getBasicGameInfo(gameId);
        }else{
          allGamesInfo.get(gameId)!.currentPlayerTurn = 2;
        }
				// if (!gameIdSet.has(gameId)){
          // gameIdSet.add(gameId);
  //          console.log("jjjjj");
  //        console.log(allGamesInfo.get(gameId)?.nonce);
	// console.log(eventData.nonce); 
	  if(allGamesInfo.get(gameId) && eventData.nonce >= allGamesInfo.get(gameId)?.nonce!){
            console.log("PLAYER MADE A MOVE, AI'S TURN");
            //double check
          GetObjectContents(gameId).then((wrappedGameData) => {
            let gameData = wrappedGameData.data;
            if (eventData.nonce == gameData.nonce && gameData.gameType == 1 && !gameData.is_game_over){
              let originalBoard = gameData.board.reverse();
              let board = Array(6).fill(null).map(() => Array(7).fill(0));
              for (let i = 0; i < board.length; i++){
                for (let j = 0; j < board[0].length; j++){
                  board[i][j] = parseInt(originalBoard[i][j]);
                }
              }
              // console.log(board);
              let ai = new ConnectFourAI(board);
              let firstMoveChoices = [0,1,1,2,2,2,3,3,3,3,4,4,4,5,5,6];
              let bestMoveColumn = gameData.nonce == 1 ? firstMoveChoices[Math.floor(Math.random()*16)] : ai.findBestMove();
              aiMakeMove(gameId, gameData.nonce, bestMoveColumn);
            }else{
              getBasicGameInfo(gameId);
            }
          })
        }
				// }
			});
		}).catch(error => {
      console.log(error);
    });
	};

  const aiMakeMove = (gameId: string, gameDataNonce: number, bestMoveColumn: number) => {
    sendTransaction(aiMoveCreateTx(gameId, bestMoveColumn)).then(success => {
      //setup for next time player move come in in advance
        allGamesInfo.get(gameId)!.nonce! = gameDataNonce + 1;
        allGamesInfo.get(gameId)!.currentPlayerTurn! = 1;
        console.log(success);
    }).catch(error => {
      console.log(error);
      aiMakeMove(gameId, gameDataNonce, bestMoveColumn);
    });
  }

  const newMultiPlayerGameEventListener = () => {
		fetchEvents("multi_player::MultiPlayerGameStartedEvent2", false).then((events) => {
			events?.forEach((event) => {
				let eventData = event.parsedJson as any;
        let gameId = eventData.game;
        let p1 = eventData.p1;
        let p2 = eventData.p2;
        let nonce = eventData.nonce;
        // if(nonce > globalNonce){
          getBasicGameInfo(gameId);
          // getUserGamesAndLatestGameBasicInfo(p1, false);
          // getUserGamesAndLatestGameBasicInfo(p2, false);
          gamesPerUser.get(p1)?.add(gameId);
          gamesPerUser.get(p2)?.add(gameId);
          // globalNonce = nonce;
        // }
			});
		}).catch(error => {
      console.log(error);
    });
	};



  const multiPlayerMoveEventListener = async (): Promise<EventId | null> => {
    try {
      let queryParams: QueryEventsParams = {
      query: {MoveEventType: `0x87e2962a5315eeff4f1cf2848180a9b58a323053966780e60a9f127bcf5ccd6b::multi_player::MultiPlayerMoveEvent`},//MoveEventModule: { package: process.env.REACT_APP_PACKAGE_ADDRESS, module: "single_player"}},
      order: "ascending",
      limit: 10,
      ...(lastMultiPlayerMoveEventId ? { cursor: lastMultiPlayerMoveEventId} : {})
      };
      const response = await suiClient.queryEvents(queryParams);
      const events = [...response.data];
      
      if (events.length > 0) {
        let newLastProcessedEventId: EventId | null = lastMultiPlayerMoveEventId;
        for (const event of events) {
          // PROCESS EVENT
          getBasicGameInfo((event.parsedJson! as any).game);
          newLastProcessedEventId = {
            txDigest: event.id.txDigest,
            eventSeq: event.id.eventSeq
          };
        }
        // Update last processed event ID only after processing all new events
        return newLastProcessedEventId;
      }else{
        return lastMultiPlayerMoveEventId;
      }
    } catch (e) {
      console.log('fetchingEvents Error:' + (e! as any).status);
      return lastMultiPlayerMoveEventId;
    }
  };



