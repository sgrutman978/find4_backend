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

  import * as dotenv from "dotenv";
  import Find4 from "./find4";
  import ChainUtility from "./chainUtility";
import { getRandomElementFromSet } from "./utility";
  // import {  getProfile} from "./chainUtility";
  dotenv.config({ path: '.env' });

  const app = express();
  const port: number = 3000;

  export const suiClient = new SuiClient({ url: "https://go.getblock.io/2e301c1cd2e542e897c7a14109d81baf"}); //getFullnodeUrl("mainnet") });
  // const chainAccess = new GetFromChain();

  export const kp_import_0 = Ed25519Keypair.fromSecretKey(process.env.REACT_APP_PK!);
  export const pk = kp_import_0.getPublicKey();
  export const sender = pk.toSuiAddress();

  export const innerGamesTrackerAddy = port == 3000 ? process.env.REACT_APP_GAMES_TRACKER_INNER_ADDY_MAINNET : process.env.REACT_APP_GAMES_TRACKER_INNER_ADDY;
  export const OGAddy = port == 3000 ? process.env.REACT_APP_ORIGINAL_ADDRESS_FOR_EVENT_AND_OBJECT_TYPE_MAINNET! : process.env.REACT_APP_ORIGINAL_ADDRESS_FOR_EVENT_AND_OBJECT_TYPE!;
  export const adminCap = port == 3000 ? process.env.REACT_APP_ADMIN_CAP_ADDRESS_MAINNET! : process.env.REACT_APP_ADMIN_CAP_ADDRESS!;
  export const packageAddy = port == 3000 ? process.env.REACT_APP_PACKAGE_ADDRESS_MAINNET! : process.env.REACT_APP_PACKAGE_ADDRESS!;
  export const innerProfilesTableAddy = "0x85728786020e36230cb9c38a181a51eff5b11259d4dd0d35850b298fd45d8a28";

  // const server = https.createServer({ key: fs.readFileSync('./key2.pem'), cert: fs.readFileSync('./cert2.pem')}, app);
  const chainUtil = new ChainUtility();
  const find4 = new Find4(chainUtil);
  // passphrase: process.env.REACT_APP_CERT_PASSWORD}

  find4.setFind4Intervals();
  find4.getAllProfiles().then(() => {
    console.log("\n\n\n\n\n\nAAAAAAAAABBBBBB");
    console.log(chainUtil.allProfiles);
  });


  app.use(cors());
  app.use(bodyParser.json());

  app.post('/imonline', (req, res) => {
    try{
    let addy = req.body.addy;
    chainUtil.allAddys.add(addy);
    if(!chainUtil.allProfiles.has(addy)){
      chainUtil.getProfile(addy).then((prof) => {
        // console.log("ppppproooooffiiiiillleeee");
        // console.log(prof);
        // console.log(prof.points);
        if(prof.points){
          chainUtil.allProfiles.set(addy, prof);
        }
      }).catch((e) => console.log(e));
    }
    let epoch = Date.now();
    chainUtil.currentOnline.set(addy, epoch);
    //  console.log("ll");
    if(addy && !find4.gamesPerUser.has(addy)){
      find4.getUserGamesAndLatestGameBasicInfo(addy, true);
    }
    res.send('Online');
    } catch (e) {
      console.log(e);
    }
  });

  app.post('/updateProfile', (req, res) => {
    try{
    let addy = req.body.addy;
    chainUtil.allAddys.add(addy);
      chainUtil.getProfile(addy).then((prof) => {
        // console.log("ppppproooooffiiiiillleeee");
        // console.log(prof);
        // console.log(prof.points);
        if(prof.points){
          chainUtil.allProfiles.set(addy, prof);
        }
      }).catch((e) => console.log(e));
    let epoch = Date.now();
    chainUtil.currentOnline.set(addy, epoch);
    //  console.log("ll");
    if(addy && !find4.gamesPerUser.has(addy)){
      find4.getUserGamesAndLatestGameBasicInfo(addy, true);
    }
    res.send('Online');
    } catch (e) {
      console.log(e);
    }
  });

  app.get('/howmanyonline', (req, res) => {
      res.json({size: chainUtil.currentOnline.size});
  });

  app.get('/onlineList', (req, res) => {
    res.json({addys: Array.from(chainUtil.currentOnline.keys())});
  });

  app.get('/leaderboard', (req, res) => {
    // console.log("\n\n\n\n\n\nyyyyyyyyyyy");
    // console.log(allProfiles);
    console.log(chainUtil.allProfiles.entries());
    const mapEntries = Array.from(chainUtil.allProfiles.entries());

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
      let randomAddy = getRandomElementFromSet(chainUtil.allAddys);
      if(randomAddy && addy != randomAddy && chainUtil.allProfiles.has(randomAddy)){
        res.json({p2: randomAddy});
        break;
      }
    }
  });

  app.get('/getProfile', (req, res) => {
    const addy = req.query.addy as string;
    res.json({profile: chainUtil.allProfiles.get(addy)});
  });

  app.get('/myGames', (req, res) => {
    const addy = req.query.addy as string;
    let games: any[] = [];
    find4.gamesPerUser.get(addy)?.forEach((gameId) => {
      let basicGame = find4.allGamesInfo.get(gameId);
      if(basicGame){
        games.push({...find4.allGamesInfo.get(gameId)!, id: gameId});
      }
    });
    res.json({games: games});
  });

  app.get('/whoTurn', (req, res) => {
    const gameId = req.query.gameId as string;
    if(!find4.allGamesInfo.has(gameId)){
      find4.getBasicGameInfo(gameId);
    }
    // console.log(allGamesInfo.get(gameId));
    // console.log(allGamesInfo);
    let turn = find4.allGamesInfo.get(gameId)?.currentPlayerTurn;
    res.json({turn: turn});
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
  });

  // server.listen(3000, () => {
  //   console.log('HTTPS server listening on port '+3000);
  // });

  setInterval(() => {
    chainUtil.currentOnline.forEach((value, key, map) => {
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

  // setInterval(() => {

  // }, 60000);





  // GetObjectContents(globalNonceAddy).then((obj) => {
  //   // console.log(obj);
  //   globalNonce = parseInt(obj.data.nonce);
  // });











