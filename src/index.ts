import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import {Keypair, Transaction, Connection, PublicKey} from '@solana/web3.js';
import * as bs58 from 'bs58';
import {getAssociatedTokenAddress, getAccount, createMintToCheckedInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID} from "@solana/spl-token";
import { Client } from 'pg';
import * as fs from 'fs';
import * as https from "https";
import * as crypto from "crypto";
import * as encrypt from "./encrypt";

dotenv.config();

const app: Express = express();
 
const client = new Client(
        {host: process.env.PG_HOST,
        port: 5432,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DATABASE,
        ssl: false}
);
client.connect();


app.use(express.json());


app.get('/leaderboard', async (req: Request, res: Response) => {
	console.log("meh");
 res.set('Access-Control-Allow-Origin', 'http://104.236.68.131');
  try {
	  console.log("whyyyyy");
    const res2 = await client.query("SELECT speed_square.username, high_score, today_score, total_score, today_high_score, pub_key, total_games, today_games FROM speed_square INNER JOIN users ON speed_square.username=users.username ORDER BY high_score DESC;");
    console.log("stuff");
    return res.send(res2.rows);
  } catch (error) {
      return res.status(500).json({ error: 'Error getting claim status.' });
  }
});



app.use(express.static(__dirname + '/public'));

var port = 3008;

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})


