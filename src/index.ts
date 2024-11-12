// import useSui from "./useSui";
import { Transaction } from "@mysten/sui/transactions";
import { getFullnodeUrl, QueryEventsParams, SuiClient, SuiObjectChangeCreated, SuiObjectResponse } from "@mysten/sui/client";
import { useCallback, useState } from "react";
import ConnectFourAI from './ConnectFourAI';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

import dotenv from "dotenv";
dotenv.config();

// import express from 'express';

// const app = express();
// const port = 3000;

// app.get('/', (req, res) => {
//   res.send('Hello World!');
// });

// app.listen(port, () => {
//   return // console.log(`Express is listening at http://localhost:${port}`);
// });

export const suiClient = new SuiClient({ url: process.env.REACT_APP_SUI_NETWORK });



const sendTransaction = async (gameId: string, col: number) => {

  const kp_import_0 = Ed25519Keypair.fromSecretKey(process.env.REACT_APP_PK);
  // console.log("ooooo");
  // console.log(kp_import_0.getPublicKey().toSuiAddress());

  const pk = kp_import_0.getPublicKey();
  const sender = pk.toSuiAddress();
  // create an example transaction block.
  const txb = new Transaction();
  txb.moveCall({
    target: `${process.env.REACT_APP_PACKAGE_ADDRESS}::single_player::ai_make_move`,
    arguments: [txb.object(gameId), txb.pure.u64(col)],
  });

  txb.setSender(sender);
  txb.setGasPrice(1000);
  txb.setGasBudget(2000000);
  const bytes = await txb.build(
    {client: suiClient}
  );
  const serializedSignature = (await kp_import_0.signTransaction(bytes)).signature;
  let res = suiClient.executeTransactionBlock({
    transactionBlock: bytes,
    signature: serializedSignature,
  });

}

export const myNetwork = "testnet";
export const fetchEvents = async () => {
	try {
	  // Define the query parameters for the events you want to track
	  let queryParams: QueryEventsParams = {
		query: {MoveEventType: `${process.env.REACT_APP_PACKAGE_ADDRESS}::single_player::SinglePlayerGameHumanPlayerMadeAMove`},//MoveEventModule: { package: process.env.REACT_APP_PACKAGE_ADDRESS, module: "single_player"}},
		order: "descending",
		limit: 10,
	  };

	  // Query events using suix_queryEvents method
	  const response = await suiClient.queryEvents(queryParams);

    const responseData = [...response.data];

	  // Update state with fetched events
	  return responseData || [];
	} catch (error) {
	  console.error('Error fetching events:', error);
	}
  };

  const timeInterval = 1800;
  setInterval(() => {
		eventListener();
	}, timeInterval); //1800

	const eventListener = () => {
    console.log("listening...");
		fetchEvents().then((events) => {
      // console.log("ahhhhhhh2");
      let gameIdSet = new Set();
			events?.forEach((event) => {
        // console.log("ahhhhhhh3");
				let eventData = event.parsedJson as any;
				// let x = (Date.now() - Number(event.timestampMs)) < timeInterval + 200; //2000
        let gameId = eventData.game;
				if (!gameIdSet.has(gameId)){
          // console.log("ahhhhhhh4");
          gameIdSet.add(gameId);
          // // console.log(event);
          // const { enokiSponsorExecute } = useSui();
          GetObjectContents(gameId).then((wrappedGameData) => {
            // console.log("ahhhhhhh5");
            let gameData = wrappedGameData.data;
            // console.log(eventData.nonce);
            // console.log(gameData.nonce);
            // console.log(gameData.is_game_over);
            if (eventData.nonce == gameData.nonce && gameData.gameType == 1 && !gameData.is_game_over){
              // console.log(event);
              // console.log(gameData);
              // console.log(gameData.board);
              let originalBoard = gameData.board.reverse();
              let board = Array(6).fill(null).map(() => Array(7).fill(0));
              // // console.log(board);
              for (let i = 0; i < board.length; i++){
                for (let j = 0; j < board.length; j++){
                  board[i][j] = parseInt(originalBoard[i][j]);
                }
              }
              // console.log("ahhhhhhh6");
              let ai = new ConnectFourAI(board);
              let firstMoveChoices = [0,1,1,2,2,2,3,3,3,3,4,4,4,5,5,6];
              let bestMoveColumn = gameData.nonce == 1 ? firstMoveChoices[Math.ceil(Math.random()*16)] : ai.findBestMove();
              console.log(`The AI suggests playing in column: ${bestMoveColumn}`);
              
              sendTransaction(gameId, bestMoveColumn).then(success => {
                // console.log("lllllll");
                console.log(success);
              }).catch(error => {
                // console.log("iiiiiiii");
                console.log(error);
              });
            }
          })
				}
			});
		}).catch(error => {
      // console.log("ahhhhhhh");
      console.log(error);
    });
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
	});
	return dataSet ? {data: (data?.data?.content as any)["fields"], version: data.data?.owner} : {data: [], version: ""};
};
