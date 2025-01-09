// import useSui from "./useSui";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, QueryEventsParams, SuiClient, SuiObjectChangeCreated, SuiObjectResponse } from "@mysten/sui/client";
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

import * as dotenv from "dotenv";
dotenv.config({ path: '.env' });

const app = express();
const port: number = 3000;

export const suiClient = new SuiClient({ url: "https://go.getblock.io/2e301c1cd2e542e897c7a14109d81baf"}); //getFullnodeUrl("mainnet") });

const kp_import_0 = Ed25519Keypair.fromSecretKey(process.env.REACT_APP_PK!);
const pk = kp_import_0.getPublicKey();
const sender = pk.toSuiAddress();
// const addToListMap = new Map<string, number>();
let globalNonce = 0;
export const innerGamesTrackerAddy = port == 3000 ? process.env.REACT_APP_GAMES_TRACKER_INNER_ADDY_MAINNET : process.env.REACT_APP_GAMES_TRACKER_INNER_ADDY;
const OGAddy = port == 3000 ? process.env.REACT_APP_ORIGINAL_ADDRESS_FOR_EVENT_AND_OBJECT_TYPE_MAINNET! : process.env.REACT_APP_ORIGINAL_ADDRESS_FOR_EVENT_AND_OBJECT_TYPE!;
const adminCap = port == 3000 ? process.env.REACT_APP_ADMIN_CAP_ADDRESS_MAINNET! : process.env.REACT_APP_ADMIN_CAP_ADDRESS!;
const packageAddy = port == 3000 ? process.env.REACT_APP_PACKAGE_ADDRESS_MAINNET! : process.env.REACT_APP_PACKAGE_ADDRESS!;
const globalNonceAddy = port == 3000 ? process.env.REACT_APP_NONCE_ADDRESS_MAINNET! : process.env.REACT_APP_NONCE_ADDRESS!;
// let firstGo = true;
const currentOnline = new Map<string, number>();
const gamesPerUser = new Map<string, Set<string>>();
const allGamesInfo = new Map<string, GameBasicInfo>();
const allAddys = new Set<string>();
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
      });
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
      allGamesInfo.set(gameId, gameInfo);
      // console.log(allGamesInfo);
      // console.log(gamesPerUser);
    // }
  });
}

app.get('/howmanyonline', (req, res) => {
    res.json({size: currentOnline.size});
});

function getRandomElementFromSet<T>(set: Set<T>): T | undefined {
  if (set.size === 0) {
    return undefined;
  }
  const values = Array.from(set);
  const randomIndex = Math.floor(Math.random() * values.length);
  return values[randomIndex];
}

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
        console.log(error);
      });
	return dataSet ? {data: (data?.data?.content as any)["fields"], version: data.data?.owner} : {data: [], version: ""};
};

GetObjectContents(globalNonceAddy).then((obj) => {
  console.log(obj);
  globalNonce = parseInt(obj.data.nonce);
});

setInterval(() => {
  singlePlayerEventListener();
}, 1800);

setInterval(() => {
  addToListEventListener();
}, 5000);

const aiMoveCreateTx = (gameId: string, col: number): Transaction => {
  const txb = new Transaction();
  txb.moveCall({
    target: `${packageAddy}::single_player::ai_make_move`,
    arguments: [txb.object(adminCap), txb.object(gameId), txb.pure.u64(col)],
  });
  txb.setSender(sender);
  txb.setGasPrice(1000);
  txb.setGasBudget(2000000);
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
	} catch (error) {
	  console.error('Error fetching events:', error);
	}
  };

	const singlePlayerEventListener = () => {
    // console.log("Listening for SinglePlayerGameHumanPlayerMadeAMove...");
		fetchEvents("single_player::SinglePlayerGameHumanPlayerMadeAMove", true).then((events) => {
      let gameIdSet = new Set();
			events?.forEach((event) => {
				let eventData = event.parsedJson as any;
        let gameId = eventData.game;
				if (!gameIdSet.has(gameId)){
          gameIdSet.add(gameId);
          // console.log("jjjjj");
          if(allGamesInfo.get(gameId) && eventData.nonce == allGamesInfo.get(gameId)?.nonce){
            //double check
          GetObjectContents(gameId).then((wrappedGameData) => {
            let gameData = wrappedGameData.data;
            // console.log(eventData.nonce);
            // console.log(gameData.nonce);
            if (eventData.nonce == gameData.nonce && gameData.gameType == 1 && !gameData.is_game_over){
              let originalBoard = gameData.board.reverse();
              let board = Array(6).fill(null).map(() => Array(7).fill(0));
              for (let i = 0; i < board.length; i++){
                for (let j = 0; j < board[0].length; j++){
                  board[i][j] = parseInt(originalBoard[i][j]);
                }
              }
              console.log(board);
              let ai = new ConnectFourAI(board);
              let firstMoveChoices = [0,1,1,2,2,2,3,3,3,3,4,4,4,5,5,6];
              let bestMoveColumn = gameData.nonce == 1 ? firstMoveChoices[Math.ceil(Math.random()*16)] : ai.findBestMove();
      //        console.log(`The AI suggests playing in column: ${bestMoveColumn}`);
              sendTransaction(aiMoveCreateTx(gameId, bestMoveColumn)).then(success => {
                //setup for next time player move come in in advance
                allGamesInfo.get(gameId)!.nonce! = allGamesInfo.get(gameId)?.nonce! + 2;
                allGamesInfo.get(gameId)!.currentPlayerTurn! = 1;
                console.log(success);
              }).catch(error => {
                console.log(error);
              });
            }
          })
        }
				}
			});
		}).catch(error => {
      console.log(error);
    });
	};

  const addToListEventListener = () => {
    //console.log("Listening for AddToListEvent...");
		fetchEvents("multi_player::MultiPlayerGameStartedEvent2", false).then((events) => {
      // let newBiggestAddToListNonce = addToListNonce;
      // console.log("NEW MULTI EVENT");
      // console.log(events);
			events?.forEach((event) => {
				let eventData = event.parsedJson as any;
        let gameId = eventData.game;
        let p1 = eventData.p1;
        let p2 = eventData.p2;
        let nonce = eventData.nonce;
        if(nonce > globalNonce){
          // console.log("NEW EVENTTTTTTTTTTTTTTTTTTT");
          // console.log(eventData);
          getBasicGameInfo(gameId);
          getUserGamesAndLatestGameBasicInfo(p1, false);
          getUserGamesAndLatestGameBasicInfo(p2, false);
          globalNonce = nonce;
          // console.log("HHHHHHHHHHH");
          // console.log(allGamesInfo);
          // console.log(gamesPerUser);
        }else{
          // console.log("ALREADY SEEN")
        }
        // console.log(allGamesInfo);
        // console.log(gamesPerUser);

        // let addy = eventData.addy;
        // let nonce = parseInt(eventData.nonce);
        //console.log(nonce);
        //console.log(addToListNonce);
        // console.log(firstGo);
				// if (!addToListMap.has(addy) && nonce > addToListNonce && addToListNonce > 0){// && !firstGo){
      //    console.log("ADD_TO_LIST_EVENT");
          //console.log(eventData);
        //   if(nonce > newBiggestAddToListNonce){
        //     newBiggestAddToListNonce = nonce;
        //   }
        //   addToListMap.set(addy, eventData.points);
				// }
			});
      // if(firstGo){
      //   firstGo = false;

      // }
      //console.log("pizza4");
      //console.log(addToListMap);
      // makeMatches(newBiggestAddToListNonce);
		}).catch(error => {
      console.log(error);
    });
	};

//   function makeMatches(newBiggestAddToListNonce: number){
//     //console.log("pizza1");
//     //console.log(newBiggestAddToListNonce);
//     addToListNonce = newBiggestAddToListNonce;
//     let keys = getSortedKeysByPoints();
//     for(let i = 0; i < Math.floor(keys.length/2); i++){
//       //console.log("pizza2");
//       const p1 = keys[i];
//       const p2 = keys[i+1];
//       addToListMap.delete(p1);
//       addToListMap.delete(p2);
//       sendTransaction(newGameCreateTx(p1, p2)).then(success => {
//         //console.log("pizza3");
//         //console.log(success);
//         addToListMap.delete(keys[i]);
//         addToListMap.delete(keys[i+1]);
//       }).catch(error => {
//         console.log(error);
//       });
//     }
//   }

//   function getSortedKeysByPoints(): string[] {
//     // Convert the Map to an array of[key, value] pairs
//     return Array.from(addToListMap.entries())
//         // Sort the array based on the points value in descending order
//         .sort((a, b) => b[1] - a[1])
//         // Map back to just the keys (profileAddy)
//         .map(([key]) => key);
// }

