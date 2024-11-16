// import useSui from "./useSui";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, QueryEventsParams, SuiClient, SuiObjectChangeCreated, SuiObjectResponse } from "@mysten/sui/client";
// import { useCallback, useState } from "react";
import ConnectFourAI from './ConnectFourAI';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import dotenv from "dotenv";
dotenv.config();

export const suiClient = new SuiClient({ url: process.env.REACT_APP_SUI_NETWORK });

const kp_import_0 = Ed25519Keypair.fromSecretKey(process.env.REACT_APP_PK);
const pk = kp_import_0.getPublicKey();
const sender = pk.toSuiAddress();
const addToListMap = new Map<string, number>();
let addToListNonce = 0;
const globalNonceAddy = process.env.REACT_APP_NONCE_ADDRESS;
// let firstGo = true;

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
	});
	return dataSet ? {data: (data?.data?.content as any)["fields"], version: data.data?.owner} : {data: [], version: ""};
};

GetObjectContents(globalNonceAddy).then((obj) => {
  console.log(obj);
  addToListNonce = parseInt(obj.data.nonce);
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
    target: `${process.env.REACT_APP_PACKAGE_ADDRESS}::single_player::ai_make_move`,
    arguments: [txb.object(process.env.REACT_APP_ADMIN_CAP_ADDRESS), txb.object(gameId), txb.pure.u64(col)],
  });
  txb.setSender(sender);
  txb.setGasPrice(1000);
  txb.setGasBudget(2000000);
  return txb;
}

const newGameCreateTx = /*async*/ (p1: string, p2: string): Transaction => { //Promise<Transaction> => {
  const txb = new Transaction();
  // await GetObjectContents(gameId).then((wrappedGameData) => {
  txb.moveCall({
    target: `${process.env.REACT_APP_PACKAGE_ADDRESS}::multi_player::attempt_pairing`,
    arguments: [txb.object(process.env.REACT_APP_ADMIN_CAP_ADDRESS), txb.pure.address(p1), txb.pure.address(p2)],
  });
// });
  txb.setSender(sender);
  txb.setGasPrice(1000);
  txb.setGasBudget(20000000);
  return txb;
}

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

export const fetchEvents = async (eventType: string) => {
	try {
	  let queryParams: QueryEventsParams = {
		query: {MoveEventType: `${process.env.REACT_APP_PACKAGE_ADDRESS}::${eventType}`},//MoveEventModule: { package: process.env.REACT_APP_PACKAGE_ADDRESS, module: "single_player"}},
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
    console.log("Listening for SinglePlayerGameHumanPlayerMadeAMove...");
		fetchEvents("single_player::SinglePlayerGameHumanPlayerMadeAMove").then((events) => {
      let gameIdSet = new Set();
			events?.forEach((event) => {
				let eventData = event.parsedJson as any;
        let gameId = eventData.game;
				if (!gameIdSet.has(gameId)){
          gameIdSet.add(gameId);
          GetObjectContents(gameId).then((wrappedGameData) => {
            let gameData = wrappedGameData.data;
            if (eventData.nonce == gameData.nonce && gameData.gameType == 1 && !gameData.is_game_over){
              let originalBoard = gameData.board.reverse();
              let board = Array(6).fill(null).map(() => Array(7).fill(0));
              for (let i = 0; i < board.length; i++){
                for (let j = 0; j < board.length; j++){
                  board[i][j] = parseInt(originalBoard[i][j]);
                }
              }
              let ai = new ConnectFourAI(board);
              let firstMoveChoices = [0,1,1,2,2,2,3,3,3,3,4,4,4,5,5,6];
              let bestMoveColumn = gameData.nonce == 1 ? firstMoveChoices[Math.ceil(Math.random()*16)] : ai.findBestMove();
              console.log(`The AI suggests playing in column: ${bestMoveColumn}`);
              sendTransaction(aiMoveCreateTx(gameId, bestMoveColumn)).then(success => {
                console.log(success);
              }).catch(error => {
                console.log(error);
              });
            }
          })
				}
			});
		}).catch(error => {
      console.log(error);
    });
	};

  const addToListEventListener = () => {
    console.log("Listening for AddToListEvent...");
		fetchEvents("multi_player::AddToListEvent").then((events) => {
      let newBiggestAddToListNonce = addToListNonce;
			events?.forEach((event) => {
				let eventData = event.parsedJson as any;
        let addy = eventData.addy;
        let nonce = parseInt(eventData.nonce);
        console.log(nonce);
        console.log(addToListNonce);
        // console.log(firstGo);
				if (!addToListMap.has(addy) && nonce > addToListNonce && addToListNonce > 0){// && !firstGo){
          console.log("ADD_TO_LIST_EVENT");
          console.log(eventData);
          if(nonce > newBiggestAddToListNonce){
            newBiggestAddToListNonce = nonce;
          }
          addToListMap.set(addy, eventData.points);
				}
			});
      // if(firstGo){
      //   firstGo = false;

      // }
      console.log("pizza4");
      console.log(addToListMap);
      makeMatches(newBiggestAddToListNonce);
		}).catch(error => {
      console.log(error);
    });
	};

  function makeMatches(newBiggestAddToListNonce: number){
    console.log("pizza1");
    console.log(newBiggestAddToListNonce);
    addToListNonce = newBiggestAddToListNonce;
    let keys = getSortedKeysByPoints();
    for(let i = 0; i < Math.floor(keys.length/2); i++){
      console.log("pizza2");
      const p1 = keys[i];
      const p2 = keys[i+1];
      addToListMap.delete(p1);
      addToListMap.delete(p2);
      sendTransaction(newGameCreateTx(p1, p2)).then(success => {
        console.log("pizza3");
        console.log(success);
        addToListMap.delete(keys[i]);
        addToListMap.delete(keys[i+1]);
      }).catch(error => {
        console.log(error);
      });
    }
  }

  function getSortedKeysByPoints(): string[] {
    // Convert the Map to an array of[key, value] pairs
    return Array.from(addToListMap.entries())
        // Sort the array based on the points value in descending order
        .sort((a, b) => b[1] - a[1])
        // Map back to just the keys (profileAddy)
        .map(([key]) => key);
}

